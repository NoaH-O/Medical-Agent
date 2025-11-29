"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Copy, Check } from "lucide-react"

interface CPTCode {
  code: string
  description: string
  status: "correct" | "incorrect"
  amount: number
  reason: string
}

interface DisputeLetterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incorrectCodes: CPTCode[]
  totalSavings: number
  insurancePlan: string
  appealDraft: string
}

export function DisputeLetterModal({
  open,
  onOpenChange,
  appealDraft,
}: DisputeLetterModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(appealDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Dispute Letter Template</DialogTitle>
          <DialogDescription>
            Copy this email template and fill in your personal information before sending to your hospital&apos;s billing
            department
          </DialogDescription>
        </DialogHeader>

        <div className="relative p-6 bg-muted/30 rounded-md border border-border overflow-y-auto max-h-[60vh]">
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
            title={copied ? "Copied!" : "Copy to clipboard"}
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            )}
          </button>

          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground pr-12">
            {appealDraft}
          </pre>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-2">
          Remember to fill in all bracketed placeholders with your personal information
        </p>
      </DialogContent>
    </Dialog>
  )
}
