import { NextRequest, NextResponse } from "next/server"
import { extractText } from "unpdf"
import Tesseract from "tesseract.js"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const billFile = formData.get("bill") as File
    const summaryFile = formData.get("summary") as File

    if (!billFile || !summaryFile) {
      return NextResponse.json(
        { error: "Missing files" },
        { status: 400 }
      )
    }

    console.log("📄 Processing bill file:", billFile.name, `(${billFile.type})`)
    console.log("📄 Processing summary file:", summaryFile.name, `(${summaryFile.type})`)

    const billText = await parseFile(billFile)
    const summaryText = await parseFile(summaryFile)

    // Call backend for analysis
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    console.log("🔗 Calling backend for analysis...")
    
    const backendResponse = await fetch(`${backendUrl}/bill/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bill: billText,
        after_care_summary: summaryText,
      }),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error("❌ Backend analysis failed:", errorText)
      throw new Error(`Backend analysis failed: ${errorText}`)
    }

    const analysisResult = await backendResponse.json()
    console.log("✅ Backend analysis complete!")

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("❌ Error processing files:", error)
    return NextResponse.json(
      { error: `Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

async function parseFile(file: File): Promise<string> {
  const fileType = file.type
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Handle PDF files
  if (fileType === "application/pdf") {
    console.log("📖 Parsing PDF file...")
    const { text } = await extractText(new Uint8Array(arrayBuffer))
    return text.join("\n")
  }

  // Handle image files (JPG, PNG)
  if (fileType.startsWith("image/")) {
    console.log("🖼️  Performing OCR on image file...")
    const result = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => {
        // Log OCR progress
        if (m.status === "recognizing text") {
          console.log(`   OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })
    return result.data.text
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}

