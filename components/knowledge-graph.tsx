"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
)
const TYPE_COLORS: Record<string, string> = {
  technology: "#7dd3fc",     // sky-blue
  patent: "#2563eb",         // blue
  paper: "#86efac",          // light green
  company: "#22c55e",        // green
  country: "#f9a8d4",        // pink
  source_article: "#fbbf24", // orange
}

type KGNode = {
  id: string
  type: string
  hidden?: boolean
  url?: string
  x?: number
  y?: number
}

type KGEdge = {
  source: string
  target: string
  relation: string
  hidden?: boolean
}

function centerNodes(nodes: KGNode[]) {
  if (!nodes.length) return nodes

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity

  nodes.forEach((n) => {
    if (typeof n.x === "number" && typeof n.y === "number") {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y)
    }
  })

  // If nodes never had positions yet
  if (!isFinite(minX) || !isFinite(minY)) return nodes

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return nodes.map((n) => ({
    ...n,
    x: typeof n.x === "number" ? n.x - centerX : n.x,
    y: typeof n.y === "number" ? n.y - centerY : n.y,
  }))
}

export function KnowledgeGraph({
  nodes,
  edges,
}: {
  nodes: KGNode[]
  edges: KGEdge[]
}) {
  // Filter visible nodes
  const visibleNodes = useMemo(
    () => nodes.filter((n) => !n.hidden),
    [nodes]
  )

  // Filter visible edges
  const visibleEdges = useMemo(
    () => edges.filter((e) => !e.hidden),
    [edges]
  )

  // Center nodes ONLY via coordinates (no camera tricks)
  const centeredNodes = useMemo(
    () => centerNodes(visibleNodes),
    [visibleNodes]
  )

  return (
    <div className="h-[520px] w-full rounded-lg border bg-background">
      <ForceGraph2D
  graphData={{
    nodes: centeredNodes,
    links: visibleEdges,
  }}

  // ✅ Node labels
  nodeLabel={(n: any) => `${n.id} (${n.type})`}

  // ✅ FIXED node colors (no random auto coloring)
  nodeCanvasObject={(node: any, ctx: any) => {
    const color = TYPE_COLORS[node.type] || "#94a3b8"

    ctx.beginPath()
    ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  }}

  // ✅ Edge label
  linkLabel={(l: any) => l.relation}

  // ✅ FIXED edge colors (meaningful)
  linkColor={(l: any) => {
    if (l.relation === "ACTIVE_IN") return "#ec4899" // pink
    if (l.relation === "RELATED_WORK") return "#3b82f6" // blue
    if (String(l.relation).includes("SIMILAR")) return "#a855f7" // purple
    if (String(l.relation).includes("MENTION")) return "#f59e0b" // orange
    if (String(l.relation).includes("COUNTRY_")) return "#22c55e" // green
    return "#9ca3af" // gray default
  }}

  // ✅ edge thickness using weight (optional but makes graph intel-like)
  linkWidth={(l: any) => {
    const w = l.weight ?? 1

    if (l.relation === "ACTIVE_IN") return Math.min(5, 1 + w / 25)
    if (l.relation === "RELATED_WORK") return Math.min(4, 1 + w * 8)

    return 1.2
  }}

  linkDirectionalArrowLength={4}
  linkDirectionalArrowRelPos={1}

  cooldownTicks={120}
  warmupTicks={80}

  // ✅ click open url
  onNodeClick={(node: any) => {
    if (node.url) window.open(node.url, "_blank")
  }}
/>



    </div>
  )
}
