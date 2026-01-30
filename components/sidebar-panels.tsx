"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Building2,
  FileText,
  Grid3x3,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"

/* ---------------- TYPES ---------------- */

type Alert = {
  type: "market" | "patent" | "tech"
  message: string
  time: string
}

type Company = {
  name: string
  description?: string
  link?: string
}

type Publication = {
  title: string
  link?: string | null
}
type Patent = {
  title: string
  snippet?: string
  link?: string | null
  year?: number | null
  trl?: number
}


type SidebarPanelsProps = {
  alerts?: Alert[]
  companies?: Company[]
  publications?: Publication[]
  patents?: Patent[]
}

/* ---------------- COMPONENT ---------------- */

export function SidebarPanels({
  alerts,
  companies,
  publications,
  patents,
}: SidebarPanelsProps) {

  /* ✅ SAFETY NORMALIZATION */
  const safeAlerts = alerts ?? []
  const safeCompanies = companies ?? []
  const safePublications = publications ?? []
  const safePatents = patents ?? []

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "market":
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      case "patent":
        return <FileText className="w-4 h-4 text-purple-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  return (
    <div className="space-y-4">

      {/* ---------------- ALERTS ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Alert Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {safeAlerts.length === 0 && (
            <p className="text-xs text-muted-foreground">No alerts yet</p>
          )}

          {safeAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex gap-3 border border-border rounded-md p-3"
            >
              {getAlertIcon(alert.type)}
              <div>
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{alert.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---------------- COMPANIES ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Related Companies</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Key players in the ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
  {safeCompanies.length === 0 && (
    <p className="text-xs text-muted-foreground">
      No companies available
    </p>
  )}

  {safeCompanies.map((company, i) => {
    const validLink =
      typeof company.link === "string" && company.link.trim().length > 0
        ? company.link
        : null

    return (
      <div
        key={i}
        className="p-2 rounded-md border border-border/30 bg-secondary/30"
      >
        {validLink ? (
          <a
            href={validLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {company.name}
          </a>
        ) : (
          <p className="text-sm font-medium">{company.name}</p>
        )}

        {company.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {company.description}
          </p>
        )}
      </div>
    )
  })}
</CardContent>

      </Card>

      {/* ---------------- PUBLICATIONS (WITH LINKS) ---------------- */}
      {/* Publications */}
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-accent" />
      <CardTitle className="text-base">Publications</CardTitle>
    </div>
    <CardDescription className="text-xs">
      Research & analysis sources
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-2">
    {safePublications.length === 0 && (
      <p className="text-xs text-muted-foreground">
        No publications available
      </p>
    )}

    {safePublications.map((pub, i) => {
      const validLink =
        typeof pub.link === "string" && pub.link.trim().length > 0
          ? pub.link
          : null

      return (
        <div
          key={i}
          className="p-2 rounded-md border border-border/30 bg-secondary/30"
        >
          {validLink ? (
            <a
              href={validLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {pub.title}
            </a>
          ) : (
            <p className="text-sm">{pub.title}</p>
          )}
        </div>
      )
    })}
  </CardContent>
</Card>

{/* Patents */}
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-purple-500" />
      <CardTitle className="text-base">Patents</CardTitle>
    </div>
    <CardDescription className="text-xs">
      Key filed patents (ML-derived)
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-2">
    {safePatents.length === 0 && (
      <p className="text-xs text-muted-foreground">
        No patents available
      </p>
    )}

    {safePatents.map((patent, i) => {
      const hasValidLink =
        typeof patent.link === "string" &&
        patent.link.trim().length > 0

      return (
        <div
          key={i}
          className="p-2 rounded-md border border-border/30 bg-secondary/30"
        >
          {hasValidLink ? (
            <a
              href={patent.link!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline font-medium"
            >
              {patent.title}
            </a>
          ) : (
            <p className="text-sm font-medium">{patent.title}</p>
          )}

          {patent.year && (
            <p className="text-xs text-muted-foreground">
              Year: {patent.year} · TRL: {patent.trl ?? "N/A"}
            </p>
          )}
        </div>
      )
    })}
  </CardContent>
</Card>
</div>
  )
}
