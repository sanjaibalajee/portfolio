import { NextResponse } from "next/server"
import blogposts from "@/app/blog/blogposts.json"

export async function GET() {
  return NextResponse.json(blogposts)
}
