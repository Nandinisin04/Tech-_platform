"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchBar } from "@/components/search-bar"
import { ContentFlashcards } from "@/components/content-flashcards"
import { AlertPanel } from "@/components/alert-panel"
import { GlobalComparison } from "@/components/global-comparison"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const router = useRouter()
  const [globalData, setGlobalData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadGlobal() {
      try {
        const res = await fetch("/api/global")
        if (!res.ok) throw new Error("Failed to load global data")

        const json = await res.json()
        if (!cancelled) setGlobalData(json)
      } catch (e) {
        if (!cancelled) setError("Global trends unavailable")
      }
    }

    loadGlobal()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">TechIntel</h1>
            <p className="text-sm text-muted-foreground">
              Technology Intelligence Platform
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-6xl">
          <div className="mb-16">
            <SearchBar onSearch={(q) => router.push(`/dashboard?tech=${encodeURIComponent(q)}`)} />
          </div>

          <div className="mb-20">
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!globalData ? (
              <p className="text-muted-foreground text-center">
                Loading global trends...
              </p>
            ) : (
              <ContentFlashcards
                trends={globalData.trends}
                summary={globalData.summary}
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <GlobalComparison />
            </div>
            <AlertPanel />
          </div>
        </div>
      </div>
    </main>
  )
}