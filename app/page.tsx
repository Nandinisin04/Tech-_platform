"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SearchBar } from "@/components/search-bar"
import { ContentFlashcards } from "@/components/content-flashcards"
import { AlertPanel } from "@/components/alert-panel"
import { GlobalComparison } from "@/components/global-comparison"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchQuery(query)
      router.push(`/dashboard?tech=${encodeURIComponent(query)}`)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">TechIntel</h1>
              <p className="text-sm text-muted-foreground mt-1">Technology Intelligence Platform</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Centered Layout */}
      <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-4 py-8 lg:py-12">
        <div className="w-full max-w-6xl">
          {/* Search Bar - Centered */}
          <div className="mb-16">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Content Flashcards - Centered Grid */}
          <div className="mb-20">
            <ContentFlashcards />
          </div>

          {/* Global Comparison Section - Centered Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <GlobalComparison />
            </div>
            <div className="lg:col-span-1">
              <AlertPanel />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
