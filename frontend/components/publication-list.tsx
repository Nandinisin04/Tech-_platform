"use client"
import React from "react"

export default function PublicationList({ papers, onSelect }: any) {

  return (
    <div className="space-y-2">

      {papers.map((paper: any, i: number) => (

        <div
          key={i}
          onClick={() => onSelect(paper)}
          className="p-2 rounded-md border border-border/30 bg-secondary/30 cursor-pointer hover:bg-muted transition space-y-1"
        >

          {/* Title */}
          {paper.link ? (
            <a
              href={paper.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-primary hover:underline line-clamp-2"
            >
              {paper.title}
            </a>
          ) : (
            <p className="text-sm font-medium line-clamp-2">
              {paper.title}
            </p>
          )}

          {/* Year (NEW FIX) */}
          {paper.year && (
            <p className="text-xs text-muted-foreground">
              Year: {paper.year}
            </p>
          )}

        </div>

      ))}

      {papers.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No publications available
        </p>
      )}

    </div>
  )
}