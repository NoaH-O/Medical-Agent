from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional
import json
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AnalyzeRequest(BaseModel):
    bill: str
    after_care_summary: str


class HCPCSCode(BaseModel):
    code: str
    description: Optional[str] = None
    charge: Optional[str] = None
    units: Optional[str] = None
    revenue_code: Optional[str] = None


class HCPCSExtraction(BaseModel):
    codes: List[HCPCSCode]


class CodeValidation(BaseModel):
    code: str
    status: str  # "accepted" or "disputed"
    reasoning: str


class ValidationResponse(BaseModel):
    validations: List[CodeValidation]
    overall_reasoning: str


class AppealDraftResponse(BaseModel):
    appeal_draft: str


class CodeAnalysis(BaseModel):
    code: str
    description: Optional[str] = None
    revenue_code: Optional[str] = None
    status: str  # "accepted" or "disputed"
    reasoning: str
    billed_charge: float


class AnalyzeResponse(BaseModel):
    codes: List[CodeAnalysis]  # Changed from Dict[str, CodeAnalysis]
    savings: float
    appeal_draft: str
    overall_reasoning: str


app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=False)
client = OpenAI()

# Load UCSF standard charges database for HCPCS code lookups
HCPCS_DATABASE: Dict[str, Dict] = {}

def load_hcpcs_database():
    """Load UCSF standard charges JSON and index by HCPCS codes."""
    global HCPCS_DATABASE
    assets_path = Path(__file__).resolve().parent.parent.parent / "assets" / "ucsf_standard_charges.json"
    
    logger.info(f"Loading HCPCS database from {assets_path}")
    
    if not assets_path.exists():
        logger.warning(f"HCPCS database not found at {assets_path}")
        return
    
    try:
        with open(assets_path, 'r') as f:
            data = json.load(f)
        
        logger.info(f"Parsing HCPCS codes from JSON data...")
        
        # Index by HCPCS code for fast lookups
        for entry in data.get('standard_charge_information', []):
            codes = entry.get('code_information', [])
            for code_info in codes:
                if code_info.get('type') == 'HCPCS':
                    code = code_info.get('code')
                    if code:
                        # Store the first occurrence (can be enhanced to store all)
                        if code not in HCPCS_DATABASE:
                            HCPCS_DATABASE[code] = {
                                'description': entry.get('description'),
                                'code': code,
                                'standard_charges': entry.get('standard_charges', []),
                                'revenue_code': next((c.get('code') for c in codes if c.get('type') == 'RC'), None)
                            }
        
        logger.info(f"✓ Successfully loaded {len(HCPCS_DATABASE)} HCPCS codes from UCSF database")
    except Exception as e:
        logger.error(f"Error loading HCPCS database: {e}")

# Load database on startup
load_hcpcs_database()


def lookup_hcpcs_code(code: str, setting: Optional[str] = None, billing_class: Optional[str] = None) -> Dict:
    """
    Look up a HCPCS code in the UCSF standard charges database.
    Returns pricing information and metadata for the code.
    """
    logger.info(f"🔍 Looking up code '{code}'...")
    
    if code not in HCPCS_DATABASE:
        logger.warning(f"  ⚠️  Code '{code}' not found in UCSF database")
        return {
            "found": False,
            "code": code,
            "message": "Code not found in UCSF standard charges database"
        }
    
    entry = HCPCS_DATABASE[code]
    charges = entry.get('standard_charges', [])
    
    logger.info(f"  ✓ Found code '{code}': {entry.get('description', 'No description')[:60]}...")
    
    # Filter charges by setting and billing_class if provided
    filtered_charges = charges
    if setting or billing_class:
        filtered_charges = [
            c for c in charges
            if (not setting or c.get('setting') in ['both', setting]) and
               (not billing_class or c.get('billing_class') == billing_class)
        ]
        logger.info(f"  Filtered {len(charges)} charges → {len(filtered_charges)} matching charges")
    
    # Extract charge amounts
    charge_info = []
    for charge in filtered_charges[:5]:  # Limit to first 5 matches
        charge_info.append({
            'gross_charge': charge.get('gross_charge'),
            'discounted_cash': charge.get('discounted_cash'),
            'setting': charge.get('setting'),
            'billing_class': charge.get('billing_class'),
            'modifiers': charge.get('modifiers'),
        })
    
    if charge_info:
        logger.info(f"  Standard charges: ${charge_info[0].get('gross_charge', 'N/A')} gross, ${charge_info[0].get('discounted_cash', 'N/A')} discounted")
    
    return {
        "found": True,
        "code": code,
        "description": entry.get('description'),
        "revenue_code": entry.get('revenue_code'),
        "standard_charges": charge_info,
        "num_charge_variants": len(charges)
    }


def find_similar_cheaper_codes(description: str, max_price: float, limit: int = 5) -> List[Dict]:
    """
    Search for codes with similar descriptions that cost less than max_price.
    Uses keyword extraction and matching against the HCPCS database.
    """
    if not description:
        return []
    
    # Extract meaningful keywords (remove common words)
    common_words = {'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'in', 'to', 'from'}
    keywords = [
        word.lower() for word in description.split() 
        if len(word) > 3 and word.lower() not in common_words
    ]
    
    if not keywords:
        return []
    
    logger.info(f"  🔎 Searching for similar codes with keywords: {keywords[:5]}")
    
    # Search through database for similar descriptions
    similar_codes = []
    for code, entry in HCPCS_DATABASE.items():
        entry_desc = entry.get('description', '').lower()
        
        # Count keyword matches
        matches = sum(1 for keyword in keywords if keyword in entry_desc)
        if matches < 2:  # Require at least 2 keyword matches
            continue
        
        # Get the minimum price for this code
        charges = entry.get('standard_charges', [])
        if not charges:
            continue
        
        min_price = min(
            (float(c.get('gross_charge', float('inf'))) for c in charges if c.get('gross_charge')),
            default=float('inf')
        )
        
        # Only include if cheaper than the billed price
        if min_price < max_price:
            similar_codes.append({
                'code': code,
                'description': entry.get('description'),
                'min_price': min_price,
                'match_score': matches,
                'revenue_code': entry.get('revenue_code')
            })
    
    # Sort by match score (descending) and price (ascending)
    similar_codes.sort(key=lambda x: (-x['match_score'], x['min_price']))
    
    if similar_codes:
        logger.info(f"  ✓ Found {len(similar_codes)} similar cheaper codes")
    
    return similar_codes[:limit]


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}


def extract_hcpcs_codes(payload: AnalyzeRequest) -> List[HCPCSCode]:
    logger.info("📋 Step 1: Extracting HCPCS codes from bill...")
    
    try:
        result = client.beta.chat.completions.parse(
            model="gpt-5-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a medical coding assistant. Extract HCPCS/CPT codes from the "
                        "provided bill text. HCPCS codes include CPT codes (numeric codes for procedures) "
                        "and other codes for supplies, drugs, and services. Return null values when information is missing."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Bill text:\n"
                        f"{payload.bill}\n\n"
                        f"After-care summary: {payload.after_care_summary}"
                    ),
                },
            ],
            response_format=HCPCSExtraction,
        )
    except Exception as exc:
        logger.error(f"Failed to extract HCPCS codes: {exc}")
        raise HTTPException(status_code=502, detail=f"Failed to extract HCPCS codes: {exc}")

    parsed = result.choices[0].message.parsed
    if not parsed:
        logger.error("Failed to parse HCPCS codes from response")
        raise HTTPException(status_code=502, detail="Failed to parse HCPCS codes from response.")
    
    logger.info(f"  ✓ Extracted {len(parsed.codes)} HCPCS codes: {[c.code for c in parsed.codes]}")
    return parsed.codes


def parse_charge(charge_str: Optional[str]) -> float:
    """Parse a charge string like '$1,200' into a float."""
    if not charge_str:
        return 0.0
    # Remove $ and commas, then convert to float
    cleaned = charge_str.replace("$", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def detect_duplicates(codes: List[HCPCSCode]) -> Dict[str, int]:
    """Detect duplicate HCPCS codes and return occurrence counts."""
    from collections import Counter
    code_counts = Counter(hcpcs.code for hcpcs in codes)
    return {code: count for code, count in code_counts.items() if count > 1}


def validate_medical_necessity(
    payload: AnalyzeRequest, codes: List[HCPCSCode], duplicates: Dict[str, int]
) -> ValidationResponse:
    """Validate medical necessity with pre-fetched pricing data (single LLM call)."""
    logger.info("🔬 Step 3: Pre-fetching pricing data and validating codes...")
    
    # Pre-fetch all pricing data for each code
    codes_with_pricing = []
    for hcpcs in codes:
        billed_charge = parse_charge(hcpcs.charge)
        
        code_data = {
            "code": hcpcs.code,
            "description": hcpcs.description or "No description",
            "billed_charge": billed_charge,
            "units": hcpcs.units or "1",
            "revenue_code": hcpcs.revenue_code or "Unknown"
        }
        
        # Check for duplicates
        if hcpcs.code in duplicates:
            code_data["duplicate_warning"] = f"This code appears {duplicates[hcpcs.code]} times in the bill"
        
        # Look up exact code pricing
        exact_lookup = lookup_hcpcs_code(hcpcs.code)
        code_data["standard_pricing"] = exact_lookup
        
        # Search for similar cheaper alternatives
        if exact_lookup.get("found") and hcpcs.description and billed_charge > 0:
            similar_codes = find_similar_cheaper_codes(hcpcs.description, billed_charge)
            if similar_codes:
                code_data["cheaper_alternatives"] = similar_codes
        
        codes_with_pricing.append(code_data)
    
    logger.info(f"  ✓ Pre-fetched pricing data for {len(codes_with_pricing)} codes")
    logger.info(f"  🤖 Calling LLM for single-pass validation...")
    
    try:
        result = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a medical billing auditor analyzing HCPCS/CPT codes. "
                        "Each code includes:\n"
                        "1. Billed charge from the patient's bill\n"
                        "2. Standard pricing from UCSF database (if available)\n"
                        "3. Cheaper alternative codes with similar descriptions (if found)\n\n"
                        "Your task:\n"
                        "- Mark codes as 'disputed' if:\n"
                        "  * Billed charge significantly exceeds standard charges (upcoding)\n"
                        "  * A cheaper alternative with similar description exists (wrong code used)\n"
                        "  * The code is duplicated inappropriately\n"
                        "  * Medical necessity is questionable based on after-care summary\n"
                        "- Mark codes as 'accepted' if they appear valid\n"
                        "- Provide specific, factual reasoning citing prices and alternatives"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Bill text:\n{payload.bill}\n\n"
                        f"After-care summary: {payload.after_care_summary or 'None provided'}\n\n"
                        f"Codes with pricing data:\n{json.dumps(codes_with_pricing, indent=2)}\n\n"
                        "Validate each code and explain your reasoning."
                    ),
                },
            ],
            response_format=ValidationResponse,
        )
    except Exception as exc:
        logger.error(f"Failed to validate codes: {exc}")
        raise HTTPException(
            status_code=502, detail=f"Failed to validate medical necessity: {exc}"
        )

    parsed = result.choices[0].message.parsed
    if not parsed:
        raise HTTPException(
            status_code=502, detail="Failed to parse validation response."
        )
    
    logger.info(f"  ✓ Validation complete")
    return parsed


def draft_appeal_letter(
    payload: AnalyzeRequest,
    codes_analysis: List[CodeAnalysis],
    overall_reasoning: str,
    disputed_amount: float
) -> str:
    """Use LLM to draft a professional appeal letter based on validation results."""
    disputed_codes = [c for c in codes_analysis if c.status == "disputed"]
    
    if not disputed_codes:
        return "No disputed charges found. No appeal letter is needed."
    
    # Prepare disputed codes information
    disputed_info = []
    for code in disputed_codes:
        disputed_info.append({
            "code": code.code,
            "description": code.description,
            "charge": code.billed_charge,
            "reasoning": code.reasoning
        })
    
    try:
        result = client.beta.chat.completions.parse(
            model="gpt-5-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional medical billing advocate drafting an appeal letter.\n\n"
                        "Draft a formal, professional appeal letter that:\n"
                        "- Is addressed to the billing department\n"
                        "- Clearly identifies the patient and bill details from the provided bill\n"
                        "- Lists each disputed code with specific, factual reasoning\n"
                        "- Requests formal review and adjustment of the disputed charges\n"
                        "- Maintains a professional, respectful, yet firm tone\n"
                        "- Cites medical billing standards and regulations where appropriate\n"
                        "- Includes a clear call to action and contact information placeholder"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Bill text:\n{payload.bill}\n\n"
                        f"After-care summary: {payload.after_care_summary or 'None provided'}\n\n"
                        f"Overall analysis: {overall_reasoning}\n\n"
                        f"Disputed codes ({len(disputed_codes)} total, ${disputed_amount:,.2f}):\n{disputed_info}\n\n"
                        "Draft a complete appeal letter ready to send to the billing department."
                    ),
                },
            ],
            response_format=AppealDraftResponse,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Failed to draft appeal letter: {exc}"
        )

    parsed = result.choices[0].message.parsed
    if not parsed:
        raise HTTPException(
            status_code=502, detail="Failed to parse appeal draft response."
        )
    
    return parsed.appeal_draft


@app.post("/bill/analyze", response_model=AnalyzeResponse)
def analyze_bill(payload: AnalyzeRequest) -> AnalyzeResponse:
    logger.info("=" * 80)
    logger.info("🏥 Starting medical bill analysis...")
    logger.info("=" * 80)
    
    # Step 1: Extract HCPCS codes from bill
    codes = extract_hcpcs_codes(payload)
    
    # Step 2: Detect duplicates
    logger.info("🔍 Step 2: Checking for duplicate codes...")
    duplicates = detect_duplicates(codes)
    if duplicates:
        logger.info(f"  ⚠️  Found duplicates: {duplicates}")
    else:
        logger.info(f"  ✓ No duplicates found")
    
    # Step 3: Validate medical necessity with LLM (includes function calling for HCPCS lookups)
    validation = validate_medical_necessity(payload, codes, duplicates)
    
    # Step 4: Build CodeAnalysis objects and calculate disputed amount
    logger.info("💰 Step 4: Building analysis results...")
    codes_analysis: List[CodeAnalysis] = []
    savings = 0.0
    
    # Create a mapping of code to validation result
    validation_map = {v.code: v for v in validation.validations}
    
    # Process each code instance individually (no grouping)
    for hcpcs in codes:
        # Get validation result for this code
        val = validation_map.get(hcpcs.code)
        if not val:
            # Fallback if validation didn't return this code
            val = CodeValidation(
                code=hcpcs.code,
                status="accepted",
                reasoning="No validation issues found."
            )
        
        # Parse the charge
        charge = parse_charge(hcpcs.charge)
        
        # If disputed, add to disputed amount
        if val.status == "disputed":
            savings += charge
        
        # Create analysis object for this individual instance
        codes_analysis.append(CodeAnalysis(
            code=hcpcs.code,
            description=hcpcs.description,
            revenue_code=hcpcs.revenue_code,
            status=val.status,
            reasoning=val.reasoning,
            billed_charge=charge,
        ))
    
    disputed_codes = [c for c in codes_analysis if c.status == "disputed"]
    accepted_codes = [c for c in codes_analysis if c.status == "accepted"]
    
    logger.info(f"  ✓ Analysis complete:")
    logger.info(f"    - {len(accepted_codes)} codes accepted")
    logger.info(f"    - {len(disputed_codes)} codes disputed")
    logger.info(f"    - ${savings:,.2f} in disputed charges")
    
    # Step 5: Draft appeal letter based on validation results
    logger.info("✍️  Step 5: Drafting appeal letter...")
    appeal_draft = draft_appeal_letter(
        payload=payload,
        codes_analysis=codes_analysis,
        overall_reasoning=validation.overall_reasoning,
        disputed_amount=savings
    )
    logger.info(f"  ✓ Appeal letter drafted ({len(appeal_draft)} characters)")
    
    # Step 6: Return complete analysis with appeal draft
    logger.info("=" * 80)
    logger.info("✅ Medical bill analysis complete!")
    logger.info("=" * 80)
    
    return AnalyzeResponse(
        codes=codes_analysis,
        savings=savings,
        appeal_draft=appeal_draft,
        overall_reasoning=validation.overall_reasoning,
    )