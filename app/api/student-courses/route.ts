import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/student-courses - начало обработки")
    
    // Создаем service client
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Получаем email из заголовков или параметров запроса
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get("email")
    
    if (!userEmail) {
      console.log("❌ [API] Email не предоставлен")
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    
    console.log("👤 [API] Получен email:", userEmail)

    // Находим студента по email (нормализуем email: trim и lowercase)
    const normalizedEmail = userEmail.trim().toLowerCase()
    console.log("🔍 [API] Ищем студента с email:", normalizedEmail)
    
    // Сначала пробуем найти с точным совпадением (нормализованный email)
    let { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, email, student_type")
      .eq("email", normalizedEmail)
      .maybeSingle()

    // Если не нашли, пробуем найти без нормализации (для старых записей)
    if (!student && !studentError) {
      const { data: studentAlt, error: studentAltError } = await supabase
        .from("students")
        .select("id, email, student_type")
        .eq("email", userEmail.trim())
        .maybeSingle()
      
      if (!studentAltError && studentAlt) {
        student = studentAlt
        console.log("✅ [API] Студент найден без нормализации:", student.email)
      }
    }

    if (studentError) {
      console.error("❌ [API] Ошибка поиска студента:", studentError)
      return NextResponse.json({ 
        error: "Database error",
        details: studentError.message 
      }, { status: 500 })
    }

    if (!student) {
      console.log("❌ [API] Студент не найден с email:", normalizedEmail, "или", userEmail.trim())
      return NextResponse.json({ 
        error: "Student not found",
        message: `Student with email ${userEmail} not found`
      }, { status: 404 })
    }

    console.log("✅ [API] Студент найден:", student.id, student.email)

    // Получаем курсы студента
    const { data: courses, error: coursesError } = await supabase
      .from("student_course_access")
      .select(`
        course_id,
        first_accessed_at,
        last_accessed_at,
        progress,
        courses (
          id,
          title,
          description,
          is_published,
          created_at,
          status
        )
      `)
      .eq("student_id", student.id)
      .order("last_accessed_at", { ascending: false })

    if (coursesError) {
      console.error("❌ [API] Ошибка загрузки курсов:", coursesError)
      return NextResponse.json({ error: "Failed to load courses" }, { status: 500 })
    }

    console.log("✅ [API] Загружено курсов:", courses?.length || 0)
    if (courses && courses.length > 0) {
      courses.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.courses?.title || 'Без названия'} (ID: ${course.course_id})`)
      })
    }

    return NextResponse.json({ 
      student,
      courses: courses || []
    })

  } catch (error) {
    console.error("Error in student courses API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
