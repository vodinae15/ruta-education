import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { courseDatabase } from "@/lib/course-database"

export async function DELETE(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const { courseId } = params

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Получаем текущего пользователя
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Удаляем курс через CourseDatabase (там проверяется доступ)
    const success = await courseDatabase.deleteCourse(courseId, user.id)

    if (!success) {
      return NextResponse.json({ error: "Failed to delete course. You may not have permission." }, { status: 403 })
    }

    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/courses/[courseId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
