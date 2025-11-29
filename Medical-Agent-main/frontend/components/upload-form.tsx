"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, AlertCircle, Check, ChevronDown, Shield, Building2, Cross, Upload, Search } from "lucide-react"

interface UploadFormProps {
  onSubmit: (formData: FormData) => void
}

const getInsuranceIcon = (value: string) => {
  const iconClass = "w-4 h-4"
  switch (value) {
    case "medicare":
      return <Shield className={`${iconClass} text-blue-600`} />
    case "blue-cross":
      return <Cross className={`${iconClass} text-blue-500`} />
    case "united":
      return <Shield className={`${iconClass} text-blue-700`} />
    case "aetna":
      return <Shield className={`${iconClass} text-purple-600`} />
    case "cigna":
      return <Building2 className={`${iconClass} text-orange-600`} />
    case "kaiser":
      return <Building2 className={`${iconClass} text-blue-800`} />
    case "humana":
      return <Shield className={`${iconClass} text-green-600`} />
    default:
      return <Shield className={iconClass} />
  }
}

export function UploadForm({ onSubmit }: UploadFormProps) {
  const [hospitalBill, setHospitalBill] = useState<File | null>(null)
  const [visitSummary, setVisitSummary] = useState<File | null>(null)
  const [plan, setPlan] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isInsuranceCollapsed, setIsInsuranceCollapsed] = useState(false)
  const [isDraggingBill, setIsDraggingBill] = useState(false)
  const [isDraggingSummary, setIsDraggingSummary] = useState(false)

  const getPlanDisplayName = (value: string) => {
    const plans: Record<string, string> = {
      medicare: "Medicare",
      "blue-cross": "Blue Cross Blue Shield",
      aetna: "Aetna",
      cigna: "Cigna",
      united: "UnitedHealthcare",
      kaiser: "Kaiser Permanente",
      humana: "Humana",
    }
    return plans[value] || value
  }

  const handlePlanChange = (value: string) => {
    setPlan(value)
    setIsInsuranceCollapsed(true)
  }

  const handleHospitalBillDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingBill(true)
  }

  const handleHospitalBillDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingBill(false)
  }

  const handleHospitalBillDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingBill(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        setHospitalBill(file)
        setError("")
      } else {
        setError("Please upload a PDF, JPG, or PNG file")
      }
    }
  }

  const handleVisitSummaryDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingSummary(true)
  }

  const handleVisitSummaryDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingSummary(false)
  }

  const handleVisitSummaryDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingSummary(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        setVisitSummary(file)
        setError("")
      } else {
        setError("Please upload a PDF, JPG, or PNG file")
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!hospitalBill || !visitSummary || !plan) {
      setError("Please upload both documents and select an insurance plan")
      return
    }

    const formData = new FormData()
    formData.append("bill", hospitalBill)
    formData.append("summary", visitSummary)
    formData.append("plan", plan)

    onSubmit(formData)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3 text-balance">MedCheck</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Upload your hospital bill and visit summary to identify potential billing errors
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border shadow-lg">
            {isInsuranceCollapsed && plan ? (
              <button
                type="button"
                onClick={() => setIsInsuranceCollapsed(false)}
                className="w-full text-left hover:bg-accent/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Insurance Plan Selected</CardTitle>
                        <CardDescription className="text-sm">{getPlanDisplayName(plan)}</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </button>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Select Your Insurance Plan</CardTitle>
                  <CardDescription>Choose your insurance provider to ensure accurate billing analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="plan">Insurance Plan</Label>
                    <Select value={plan} onValueChange={handlePlanChange}>
                      <SelectTrigger id="plan">
                        <SelectValue placeholder="Select your insurance plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medicare">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("medicare")}
                            <span>Medicare</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="blue-cross">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("blue-cross")}
                            <span>Blue Cross Blue Shield</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="aetna">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("aetna")}
                            <span>Aetna</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="cigna">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("cigna")}
                            <span>Cigna</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="united">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("united")}
                            <span>UnitedHealthcare</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="kaiser">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("kaiser")}
                            <span>Kaiser Permanente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="humana">
                          <div className="flex items-center gap-2">
                            {getInsuranceIcon("humana")}
                            <span>Humana</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </>
            )}
          </Card>

          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>Upload your hospital bill and after visit summary (PDF, JPG, or PNG)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hospital Bill Upload */}
                <div className="space-y-2">
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      hospitalBill ? "border-primary bg-primary/5" : isDraggingBill ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <input
                      id="hospital-bill"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setHospitalBill(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="hospital-bill"
                      onDragOver={handleHospitalBillDragOver}
                      onDragLeave={handleHospitalBillDragLeave}
                      onDrop={handleHospitalBillDrop}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            hospitalBill ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {hospitalBill ? <Check className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground mb-1">
                            {hospitalBill ? hospitalBill.name : "Upload Hospital Bill"}
                          </p>
                          {!hospitalBill && <p className="text-xs text-muted-foreground">PDF, JPG, or PNG</p>}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* After Visit Summary Upload */}
                <div className="space-y-2">
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      visitSummary ? "border-primary bg-primary/5" : isDraggingSummary ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <input
                      id="visit-summary"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setVisitSummary(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="visit-summary"
                      onDragOver={handleVisitSummaryDragOver}
                      onDragLeave={handleVisitSummaryDragLeave}
                      onDrop={handleVisitSummaryDrop}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            visitSummary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {visitSummary ? <Check className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground mb-1">
                            {visitSummary ? visitSummary.name : "Upload Visit Summary"}
                          </p>
                          {!visitSummary && <p className="text-xs text-muted-foreground">PDF, JPG, or PNG</p>}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                <Search className="w-5 h-5 mr-2" />
                Analyze Bill
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
