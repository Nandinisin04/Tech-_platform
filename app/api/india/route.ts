import publicationsData from "@/data/india/india_tech_pulse.json"
import indiaPulse from "@/data/global/global_investments.json"
import patentsData from "@/data/india/patents.json"


function extractYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined
  const match = dateStr.match(/\b(20\d{2})\b/)
  return match ? Number(match[1]) : undefined
}

export async function GET() {
  /* ================= PUBLICATIONS ================= */

  const publications =
    Object.values(publicationsData.fields).flatMap((field: any) =>
      field.publications.map((p: any) => ({
        title: p.title,
        link: p.link,
        year: p.year ?? 0,
        academic_weight: p.citations ?? 0,
      }))
    )

  publications.sort((a: any, b: any) => {
    if (b.year !== a.year) return b.year - a.year
    return (b.academic_weight ?? 0) - (a.academic_weight ?? 0)
  })


  /* ================= PATENTS ================= */

const patents =
  patentsData?.patents?.map((p: any) => ({
    title: p.title,
    link: p.link,
    year: p.year ?? 0,
    institute: p.institute, // 👈 ADD THIS
    strategic_weight: p.year ? Math.max(1, p.year - 2010) : 1,
  })) ?? []


patents.sort((a: any, b: any) => {
  if ((b.year ?? 0) !== (a.year ?? 0)) {
    return (b.year ?? 0) - (a.year ?? 0)
  }
  return (b.strategic_weight ?? 0) - (a.strategic_weight ?? 0)
})


  /* ================= INVESTMENTS ================= */

  const india = indiaPulse.countries?.india

  const investments =
    india
      ? Object.values(india.technologies).flatMap((tech: any) =>
          (tech.articles || []).map((a: any) => ({
            title: a.title,
            link: a.link,
            year: extractYear(a.date),
            confidence_weight: a.confidence_weight ?? 0,
            source: a.source,
            date: a.date,
          }))
        )
      : []

  investments.sort((a: any, b: any) => {
    if ((b.year ?? 0) !== (a.year ?? 0)) {
      return (b.year ?? 0) - (a.year ?? 0)
    }
    return (b.confidence_weight ?? 0) - (a.confidence_weight ?? 0)
  })

  /* ================= RESPONSE ================= */

  return Response.json(
  {
    summary: {
      publications: publications.length,
      patents: patents.length,
      investments: investments.length,
    },
    signals: {
      publications,
      patents,
      investments,
    },
  },
  {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  }
)

}