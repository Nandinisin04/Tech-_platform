"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Zap, Target } from "lucide-react"

interface Alert {
  id: string
  type: "warning" | "opportunity" | "milestone"
  title: string
  description: string
  timestamp: string
}

const SAMPLE_ALERTS: Alert[] = [
  {
    id: "1",
    type: "opportunity",
    title: "Market Opportunity",
    description: "Emerging convergence between AI and quantum computing detected",
    timestamp: "30 min ago",
  },
  {
    id: "2",
    type: "milestone",
    title: "Technology Milestone",
    description: "New patent cluster identified in hypersonics sector",
    timestamp: "2 hours ago",
  },
  {
    id: "3",
    type: "warning",
    title: "Competitive Signal",
    description: "Major investment activity in related technology domain",
    timestamp: "4 hours ago",
  },
  {
    id: "4",
    type: "opportunity",
    title: "Funding Activity",
    description: "Series C funding round announced in adjacent market",
    timestamp: "6 hours ago",
  },
]

export function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    // Simulate loading alerts
    setAlerts(SAMPLE_ALERTS.slice(0, 3))
  }, [])

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-5 h-5" />
      case "opportunity":
        return <Zap className="w-5 h-5" />
      case "milestone":
        return <Target className="w-5 h-5" />
    }
  }

  const getAlertColor = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return "text-destructive"
      case "opportunity":
        return "text-accent"
      case "milestone":
        return "text-primary"
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Alert Panel</CardTitle>
        <CardDescription>Technology signals & opportunities</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border border-border/50"
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${getAlertColor(alert.type)}`}>{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
