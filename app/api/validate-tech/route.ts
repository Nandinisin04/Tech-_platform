import { validateTech } from "@/lib/techValidator"

export async function POST(req: Request) {
  const { query } = await req.json()

  return Response.json(
    validateTech(query)
  )
}