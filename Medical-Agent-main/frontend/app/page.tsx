"use client"

import { useState } from "react"
import { UploadForm } from "@/components/upload-form"
import { AnalysisResults } from "@/components/analysis-results"
import { GridScan } from "@/components/grid-scan"

interface CPTCode {
  code: string
  description: string
  status: "correct" | "incorrect"
  amount: number
  reason: string
}

interface AnalysisData {
  cptCodes: CPTCode[]
  totalBilled: number
  potentialSavings: number
  insurancePlan: string
  appealDraft: string
  overallReasoning: string
}

// Backend response types
interface BackendCodeAnalysis {
  code: string
  description: string | null
  revenue_code: string | null
  status: "accepted" | "disputed"
  reasoning: string
  billed_charge: number
}

interface BackendAnalysisResponse {
  codes: BackendCodeAnalysis[]
  savings: number
  appeal_draft: string
  overall_reasoning: string
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)

  const handleAnalyze = async (formData: FormData) => {
    setIsAnalyzing(true)

    try {
      // Extract plan from formData (keep in frontend, don't send to backend)
      const plan = formData.get("plan") as string

      // Create new FormData with only files for backend
      const apiFormData = new FormData()
      apiFormData.append("bill", formData.get("bill") as File)
      apiFormData.append("summary", formData.get("summary") as File)

      // Send files to API for parsing and backend analysis
      const response = await fetch("/api/analyze-bill", {
        method: "POST",
        body: apiFormData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze files")
      }

      const backendResult: BackendAnalysisResponse = await response.json()

      // Map backend response to frontend format
      const cptCodes: CPTCode[] = backendResult.codes.map((code) => ({
        code: code.code,
        description: code.description || "No description available",
        status: code.status === "disputed" ? "incorrect" : "correct",
        amount: code.billed_charge,
        reason: code.reasoning,
      }))

      // Calculate total billed
      const totalBilled = backendResult.codes.reduce(
        (sum, code) => sum + code.billed_charge,
        0
      )

      const analysisData: AnalysisData = {
        cptCodes,
        totalBilled,
        potentialSavings: backendResult.savings,
        insurancePlan: plan,
        appealDraft: backendResult.appeal_draft,
        overallReasoning: backendResult.overall_reasoning,
      }

      setAnalysisData(analysisData)
    } catch (error) {
      console.error("❌ Error analyzing bill:", error)
      alert("Failed to analyze bill. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="min-h-screen">
      {!analysisData && !isAnalyzing && <UploadForm onSubmit={handleAnalyze} />}

      {isAnalyzing && <GridScan />}

      {analysisData && <AnalysisResults data={analysisData} onReset={() => setAnalysisData(null)} />}
    </main>
  )
}
