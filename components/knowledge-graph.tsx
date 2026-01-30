"use client"

import dynamic from "next/dynamic"

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
)

type KGNode = {
  id: string
  type: string
}

type KGEdge = {
  source: string
  target: string
  relation: string
}

export function KnowledgeGraph({
  nodes,
  edges,
}: {
  nodes: KGNode[]
  edges: KGEdge[]
}) {
  return (
    <div className="h-[520px] w-full rounded-lg border bg-background">
      <ForceGraph2D
        graphData={{ nodes, links: edges }}
        nodeAutoColorBy="type"
        nodeRelSize={6}
        nodeLabel={(n: any) => `${n.id} (${n.type})`}
        linkLabel={(l: any) => l.relation}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={120}
      />
    </div>
  )
}