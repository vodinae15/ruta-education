import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { courseDatabase } from "@/lib/course-database"

export async function DELETE(
  request: NextRequest,
  context: { params: { courseId: string } }
) {
  try {
    const { courseId } = context.params

    console.log("[DELETE Course] Received request for courseId:", courseId)

    if (!courseId) {
      console.error("[DELETE Course] No courseId provided")
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Получаем текущего пользователя
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[DELETE Course] Unauthorized:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[DELETE Course] User:", user.id, "deleting course:", courseId)

    // Удаляем курс через CourseDatabase (там проверяется доступ)
    const success = await courseDatabase.deleteCourse(courseId, user.id)

    if (!success) {
      console.error("[DELETE Course] Failed to delete course")
      return NextResponse.json({ error: "Failed to delete course. You may not have permission." }, { status: 403 })
    }

    console.log("[DELETE Course] Successfully deleted course:", courseId)
    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/courses/[courseId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
