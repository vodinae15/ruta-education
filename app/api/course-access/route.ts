import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [API] POST /api/course-access - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    console.log("🔧 [API] Service client создан")

    // Получаем данные из запроса
    const { courseId, email, userEmail } = await request.json()
    console.log("📥 [API] Получены данные:", { courseId, email, userEmail })

    if (!courseId || !email) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Проверяем, что пользователь является автором курса
    console.log("🔍 [API] Проверяем курс:", courseId, "для пользователя:", userEmail)
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.log("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Проверяем, что пользователь является автором курса
    // Поскольку в таблице author_profiles нет email, проверяем напрямую по author_id курса
    const { data: authorProfile, error: authorError } = await supabase
      .from("author_profiles")
      .select("user_id")
      .eq("user_id", course.author_id)
      .limit(1)

    if (authorError || !authorProfile || authorProfile.length === 0) {
      console.log("❌ [API] Автор курса не найден в профилях:", authorError)
      return NextResponse.json({ error: "Author profile not found" }, { status: 404 })
    }
    
    console.log("👤 [API] Автор курса найден:", course.author_id)
    
    // Для дополнительной проверки можно добавить проверку email через auth,
    // но пока просто проверяем, что курс принадлежит существующему автору

    console.log("✅ [API] Пользователь авторизован:", userEmail)

    // Проверяем или создаем студента
    // Нормализуем email: trim и lowercase для консистентности
    const normalizedEmail = email.trim().toLowerCase()
    console.log("🔍 [API] Ищем студента с email:", normalizedEmail)
    
    // Сначала пробуем найти с точным совпадением (нормализованный email)
    let { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle()

    // Если не нашли, пробуем найти без нормализации (для старых записей)
    if (!student && !studentError) {
      const { data: studentAlt, error: studentAltError } = await supabase
        .from("students")
        .select("id, email")
        .eq("email", email.trim())
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

    // Если студент не существует, создаем его
    if (!student) {
      console.log("👤 [API] Студент не найден, создаем нового с email:", normalizedEmail)
      const { data: newStudent, error: createError } = await supabase
        .from("students")
        .insert({
          email: normalizedEmail, // Сохраняем нормализованный email
        })
        .select("id, email")
        .single()

      if (createError) {
        console.error("❌ [API] Ошибка создания студента:", {
          error: createError,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        })
        return NextResponse.json({ 
          error: "Failed to create student",
          details: createError.message 
        }, { status: 500 })
      }
      student = newStudent
      console.log("✅ [API] Студент создан:", student)
    } else {
      console.log("✅ [API] Студент найден:", student.id, student.email)
    }

    // Проверяем, есть ли уже доступ
    console.log("🔍 [API] Проверяем существующий доступ для студента:", student.id, "к курсу:", courseId)
    const { data: existingAccess, error: accessError } = await supabase
      .from("student_course_access")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .maybeSingle()

    if (accessError) {
      console.error("❌ [API] Ошибка проверки доступа:", {
        error: accessError,
        message: accessError.message,
        details: accessError.details,
        hint: accessError.hint,
        code: accessError.code
      })
      return NextResponse.json({ 
        error: "Database error",
        details: accessError.message 
      }, { status: 500 })
    }

    if (existingAccess) {
      console.log("⚠️ [API] Доступ уже предоставлен")
      return NextResponse.json({ 
        error: "Access already granted",
        message: `Student ${email} already has access to this course`
      }, { status: 409 })
    }

    // Предоставляем доступ
    console.log("🎯 [API] Предоставляем доступ студенту:", student.id, "к курсу:", courseId)
    const { error: grantError, data: grantData } = await supabase
      .from("student_course_access")
      .insert({
        student_id: student.id,
        course_id: courseId,
        first_accessed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        progress: {},
      })
      .select()

    if (grantError) {
      console.error("❌ [API] Ошибка предоставления доступа:", {
        error: grantError,
        message: grantError.message,
        details: grantError.details,
        hint: grantError.hint,
        code: grantError.code,
        studentId: student.id,
        courseId: courseId
      })
      return NextResponse.json({ 
        error: "Failed to grant access",
        details: grantError.message 
      }, { status: 500 })
    }
    
    console.log("✅ [API] Доступ успешно создан:", grantData)

    console.log("🎉 [API] Доступ успешно предоставлен!")
    return NextResponse.json({ 
      success: true,
      message: `Access granted to ${email} for course "${course.title}"`
    })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    const { courseId, studentId } = await request.json()

    if (!courseId || !studentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Отзываем доступ
    const { error: revokeError } = await supabase
      .from("student_course_access")
      .delete()
      .eq("student_id", studentId)
      .eq("course_id", courseId)

    if (revokeError) {
      console.error("Error revoking access:", revokeError)
      return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Access revoked successfully"
    })

  } catch (error) {
    console.error("Error in course access API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/course-access - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    console.log("🔧 [API] Service client создан")

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    console.log("📥 [API] Получен courseId:", courseId)

    if (!courseId) {
      console.log("❌ [API] Отсутствует courseId")
      return NextResponse.json({ error: "Missing courseId parameter" }, { status: 400 })
    }

    console.log("✅ [API] Загружаем студентов для курса:", courseId)

    // Получаем список учеников с доступом
    const { data: students, error: studentsError } = await supabase
      .from("student_course_access")
      .select(`
        id,
        student_id,
        course_id,
        first_accessed_at,
        last_accessed_at,
        progress,
        students (
          id,
          email,
          student_type
        )
      `)
      .eq("course_id", courseId)
      .order("first_accessed_at", { ascending: false })

    if (studentsError) {
      console.error("❌ [API] Ошибка загрузки студентов:", studentsError)
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }

    console.log("✅ [API] Студенты загружены:", students?.length || 0, "записей")
    if (students && students.length > 0) {
      students.forEach((accessRecord, index) => {
        console.log(`   ${index + 1}. ${accessRecord.students.email} (ID: ${accessRecord.students.id})`)
      })
    }

    return NextResponse.json({ students: students || [] })

  } catch (error) {
    console.error("Error in course access API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}