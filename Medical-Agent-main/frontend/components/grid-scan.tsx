"use client"

import { useEffect, useState } from "react"
import { FileText, Search } from "lucide-react"

export function GridScan() {
  const [currentPage, setCurrentPage] = useState<number | null>(null)
  const [analyzedPages, setAnalyzedPages] = useState<{ index: number; status: "correct" | "incorrect" }[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  const statusMessages = [
    "Analyzing your bill",
    "Searching relevant hospital documentation",
    "Comparing bill against known CPT codes",
    "Finding inconsistencies",
  ]

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length)
    }, 2000)

    return () => clearInterval(messageInterval)
  }, [])

  useEffect(() => {
    const getRandomUnanalyzedPage = () => {
      const unanalyzed = Array.from({ length: 12 })
        .map((_, i) => i)
        .filter((i) => !analyzedPages.find((p) => p.index === i))
      if (unanalyzed.length === 0) return null
      return unanalyzed[Math.floor(Math.random() * unanalyzed.length)]
    }

    if (currentPage === null && analyzedPages.length === 0) {
      const firstPage = getRandomUnanalyzedPage()
      setCurrentPage(firstPage)
      setIsScanning(true)
    }

    const interval = setInterval(() => {
      if (currentPage !== null && isScanning) {
        setAnalyzedPages((pages) => [
          ...pages,
          { index: currentPage, status: Math.random() > 0.6 ? "incorrect" : "correct" },
        ])

        const nextPage = getRandomUnanalyzedPage()
        setCurrentPage(nextPage)
        if (nextPage === null) {
          setIsScanning(false)
        }
      }
    }, 1500)

    const resetInterval = setInterval(() => {
      setCurrentPage(null)
      setAnalyzedPages([])
      setIsScanning(false)
    }, 28000)

    return () => {
      clearInterval(interval)
      clearInterval(resetInterval)
    }
  }, [currentPage, analyzedPages, isScanning])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-8">
        <div className="relative inline-block">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => {
              const analyzed = analyzedPages.find((p) => p.index === i)
              const isCurrentPage = currentPage === i

              return (
                <div
                  key={i}
                  className={`border rounded-lg p-4 w-20 h-24 flex items-center justify-center transition-all duration-500 relative overflow-hidden ${
                    analyzed
                      ? analyzed.status === "correct"
                        ? "bg-green-500/10 border-green-500/50"
                        : "bg-red-500/10 border-red-500/50"
                      : "bg-card border-border"
                  } ${isCurrentPage ? "scale-105 shadow-lg ring-2 ring-primary/30" : ""}`}
                >
                  <FileText
                    className={`w-8 h-10 transition-colors duration-500 ${
                      analyzed
                        ? analyzed.status === "correct"
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-muted-foreground/40"
                    }`}
                    strokeWidth={1.5}
                  />

                  {isCurrentPage && isScanning && (
                    <>
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent h-8 animate-scan" />
                      </div>
                      <div className="absolute inset-0 bg-primary/5 rounded-lg" />
                    </>
                  )}

                  {isCurrentPage && (
                    <div className="absolute inset-0 flex items-center justify-center transition-all duration-700">
                      <Search
                        className={`w-12 h-12 text-primary z-10 transition-all duration-300 ${
                          isScanning ? "scale-110" : "scale-100"
                        }`}
                        strokeWidth={2}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{statusMessages[messageIndex]}</h2>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(300%);
          }
        }
        .animate-scan {
          animation: scan 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
