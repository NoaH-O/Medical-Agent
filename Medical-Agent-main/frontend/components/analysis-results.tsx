"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ArrowLeft, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { DisputeLetterModal } from "@/components/dispute-letter-modal"

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

interface AnalysisResultsProps {
  data: AnalysisData
  onReset: () => void
}

export function AnalysisResults({ data, onReset }: AnalysisResultsProps) {
  const incorrectCodes = data.cptCodes.filter((code) => code.status === "incorrect")
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

  const toggleExpand = (code: string) => {
    setExpandedCode(expandedCode === code ? null : code)
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onReset} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Analyze Another Bill
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Analysis Results</h1>
          <p className="text-muted-foreground text-center">Insurance Plan: {data.insurancePlan}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Billed</CardDescription>
              <CardTitle className="text-3xl">${data.totalBilled.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Potential Savings</CardDescription>
              <CardTitle className="text-3xl text-green-600">${data.potentialSavings.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Issues Found</CardDescription>
              <CardTitle className="text-3xl text-destructive">{incorrectCodes.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">CPT Code Analysis</CardTitle>
            <CardDescription>Click on any code to view detailed reasoning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cptCodes.map((code, index) => (
              <div key={index}>
                <button
                  onClick={() => toggleExpand(code.code)}
                  className={`w-full text-left p-4 rounded-md border transition-all ${
                    code.status === "correct"
                      ? "bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950/20 dark:border-green-800 dark:hover:bg-green-950/30"
                      : "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-800 dark:hover:bg-red-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {code.status === "correct" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <Badge variant="outline" className="font-mono bg-background flex-shrink-0">
                        {code.code}
                      </Badge>
                      <p className="font-medium text-foreground flex-1 truncate">{code.description}</p>
                      <Badge variant="outline" className="bg-background flex-shrink-0">
                        ${code.amount.toFixed(2)}
                      </Badge>
                    </div>
                    {expandedCode === code.code ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>

                {expandedCode === code.code && (
                  <div className="mt-2 ml-4 p-4 bg-background rounded-md border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {code.status === "correct" ? "Verification:" : "Why this may be incorrect:"}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{code.reason}</p>
                    <a
                      href={`https://www.aapc.com/codes/cpt-codes/${code.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View CPT code reference
                    </a>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div>
          <Button size="lg" className="w-full" onClick={() => setShowDisputeModal(true)}>
            Generate Dispute Letter
          </Button>
        </div>
      </div>

      {/* Dispute Letter Modal */}
      <DisputeLetterModal
        open={showDisputeModal}
        onOpenChange={setShowDisputeModal}
        incorrectCodes={incorrectCodes}
        totalSavings={data.potentialSavings}
        insurancePlan={data.insurancePlan}
        appealDraft={data.appealDraft}
      />
    </div>
  )
}
