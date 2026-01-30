"use client"

import type React from "react"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, TrendingUp, TrendingDown, FileText } from "lucide-react"

type CategoryType = "trends" | "investments" | "patents"

interface CategoryItem {
  id: string
  title: string
  description: string
  date: string
  metadata: string
}

const TRENDS: CategoryItem[] = [
  {
    id: "1",
    title: "Quantum Computing Acceleration",
    description: "Major breakthroughs in quantum error correction pushing timelines forward by 2-3 years",
    date: "2 hours ago",
    metadata: "High Impact",
  },
  {
    id: "2",
    title: "AI Chip Consolidation",
    description: "Industry moving towards specialized AI processors over general compute architectures",
    date: "5 hours ago",
    metadata: "Medium Impact",
  },
  {
    id: "3",
    title: "Green Energy Storage Solutions",
    description: "Novel battery technologies showing 3x improvement in energy density",
    date: "1 day ago",
    metadata: "High Impact",
  },
  {
    id: "4",
    title: "6G Research Acceleration",
    description: "New standards being developed for next-generation wireless communications",
    date: "2 days ago",
    metadata: "Medium Impact",
  },
]

const INVESTMENTS: CategoryItem[] = [
  {
    id: "1",
    title: "Series B Round: $150M",
    description: "Advanced Materials Company secures funding for production scaling",
    date: "3 days ago",
    metadata: "$150M",
  },
  {
    id: "2",
    title: "Strategic Investment: $85M",
    description: "Defense tech firm backed by sovereign wealth fund for autonomous systems",
    date: "1 week ago",
    metadata: "$85M",
  },
  {
    id: "3",
    title: "Venture Capital Round: $45M",
    description: "Early-stage hypersonics startup closes Series A",
    date: "2 weeks ago",
    metadata: "$45M",
  },
  {
    id: "4",
    title: "Government Grant: $200M",
    description: "National funding for semiconductor manufacturing initiative",
    date: "2 weeks ago",
    metadata: "$200M",
  },
]

const PATENTS: CategoryItem[] = [
  {
    id: "1",
    title: "Patent Filed: Quantum Key Distribution",
    description: "Novel approach to secure quantum communications infrastructure",
    date: "4 days ago",
    metadata: "US Patent",
  },
  {
    id: "2",
    title: "Patent Granted: Advanced Alloys",
    description: "High-temperature ceramic composites for aerospace applications",
    date: "1 week ago",
    metadata: "International",
  },
  {
    id: "3",
    title: "Patent Filed: AI Optimization",
    description: "Breakthrough in neural network efficiency patents",
    date: "2 weeks ago",
    metadata: "Provisional",
  },
  {
    id: "4",
    title: "Patent Cluster: Hypersonic Materials",
    description: "15 new patents filed for thermal protection systems",
    date: "3 weeks ago",
    metadata: "US & International",
  },
]

const CATEGORY_CONFIG: Record<
  CategoryType,
  { title: string; description: string; icon: React.ReactNode; color: string }
> = {
  trends: {
    title: "Recent Trends",
    description: "Latest technology developments and market movements shaping the industry",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "text-blue-600 dark:text-blue-400",
  },
  investments: {
    title: "Recent Investments",
    description: "Funding rounds and investment activity driving technological advancement",
    icon: <TrendingDown className="w-6 h-6" />,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  patents: {
    title: "Recent Patents",
    description: "Patent filings and grants across technology domains",
    icon: <FileText className="w-6 h-6" />,
    color: "text-amber-600 dark:text-amber-400",
  },
}

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const type = (params.type as CategoryType) || "trends"

  const config = CATEGORY_CONFIG[type]
  const getData = () => {
    switch (type) {
      case "investments":
        return INVESTMENTS
      case "patents":
        return PATENTS
      default:
        return TRENDS
    }
  }

  const data = getData()

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="flex items-center gap-3">
            <div className={config.color}>{config.icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{config.title}</h1>
              <p className="text-muted-foreground mt-1">{config.description}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="grid gap-4">
            {data.map((item) => (
              <Card key={item.id} className="hover:border-primary/30 transition-all cursor-pointer hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-muted-foreground mb-3">{item.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{item.date}</span>
                        <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                          {item.metadata}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
