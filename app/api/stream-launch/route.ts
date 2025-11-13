import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { launchStreamCourse, canLaunchStream } from "@/lib/stream-launch"

/**
 * POST - Запустить потоковый курс
 */
export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId parameter" }, { status: 400 })
    }

    const result = await launchStreamCourse(courseId, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      studentsCount: result.studentsCount,
    })
  } catch (error) {
    console.error("Error in POST /api/stream-launch:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET - Проверить, можно ли запустить поток
 */
export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId parameter" }, { status: 400 })
    }

    const result = await canLaunchStream(courseId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in GET /api/stream-launch:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

