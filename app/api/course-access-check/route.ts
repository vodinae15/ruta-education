import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

/**
 * GET - Проверить доступ студента к курсу
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/course-access-check - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Создаем обычный клиент для проверки авторизации
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      console.log("❌ [API] Пользователь не авторизован")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ [API] Пользователь авторизован:", user.email)

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    console.log("📥 [API] Получен courseId:", courseId)

    if (!courseId) {
      console.log("❌ [API] Отсутствует courseId")
      return NextResponse.json({ error: "Missing courseId parameter" }, { status: 400 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    // Загружаем курс
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, launch_mode, stream_start_date, status")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.log("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Находим студента (нормализуем email для поиска)
    const normalizedEmail = (user.email || '').trim().toLowerCase()
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
        .eq("email", user.email?.trim() || '')
        .maybeSingle()
      
      if (!studentAltError && studentAlt) {
        student = studentAlt
        console.log("✅ [API] Студент найден без нормализации:", student.email)
      }
    }

    if (studentError) {
      console.error("❌ [API] Ошибка поиска студента:", studentError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!student) {
      console.log("❌ [API] Студент не найден с email:", normalizedEmail)
      return NextResponse.json({
        access: false,
        hasAccess: false,
        accessType: null,
        status: "denied",
        message: "Student not found"
      })
    }

    console.log("✅ [API] Студент найден:", student.id, student.email)

    // Проверяем бесплатный доступ (через student_course_access)
    const { data: freeAccess, error: freeAccessError } = await supabase
      .from("student_course_access")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", student.id)
      .maybeSingle()

    if (freeAccessError) {
      console.error("❌ [API] Ошибка проверки бесплатного доступа:", freeAccessError)
    }

    const hasFreeAccess = !!freeAccess
    console.log("🔍 [API] Бесплатный доступ:", hasFreeAccess ? "есть" : "нет", {
      courseId,
      studentId: student.id,
      freeAccessId: freeAccess?.id
    })

    // Проверяем покупки тарифов
    const { data: purchases } = await supabase
      .from("course_purchases")
      .select(`
        *,
        course_pricing (
          id,
          name,
          has_feedback
        )
      `)
      .eq("course_id", courseId)
      .eq("student_id", student.id)
      .eq("purchase_status", "completed")

    const purchasedPricings = purchases || []

    // Определяем тип доступа
    let accessType: "free" | "paid" | null = null
    let hasFeedback = false
    let accessStatus: "granted" | "pending" | "denied" = "denied"
    let accessMessage = ""

    if (hasFreeAccess || purchasedPricings.length > 0) {
      // Есть доступ (бесплатный или платный)
      if (purchasedPricings.length > 0) {
        accessType = "paid"
        hasFeedback = purchasedPricings.some((p: any) => p.course_pricing?.has_feedback)
      } else {
        accessType = "free"
      }

      // Проверяем режим запуска
      if (course.launch_mode === 'stream' && course.stream_start_date) {
        const startDate = new Date(course.stream_start_date)
        const currentDate = new Date()

        // Для потоковых курсов проверяем не только дату старта курса,
        // но и access_granted_at из покупок (если есть)
        if (purchasedPricings.length > 0) {
          // Проверяем access_granted_at из покупок
          const hasAccessGranted = purchasedPricings.some((p: any) => {
            if (!p.access_granted_at) {
              // Доступ еще не был открыт
              return false
            }
            const grantedDate = new Date(p.access_granted_at)
            // Доступ открыт, если дата открытия уже наступила
            return grantedDate <= currentDate
          })

          if (!hasAccessGranted) {
            // Доступ еще не открыт (author не запустил поток)
            accessStatus = "pending"
            if (startDate > currentDate) {
              accessMessage = `Ожидает начала обучения (старт курса — ${new Date(course.stream_start_date).toLocaleDateString("ru-RU")})`
            } else {
              accessMessage = "Ожидает запуска потока автором"
            }
          } else {
            // Доступ открыт
            accessStatus = "granted"
            accessMessage = "Доступ открыт"
          }
        } else {
          // Бесплатный доступ для потокового курса
          if (startDate > currentDate) {
            // Потоковый курс еще не начался
            accessStatus = "pending"
            accessMessage = `Ожидает начала обучения (старт курса — ${new Date(course.stream_start_date).toLocaleDateString("ru-RU")})`
          } else {
            // Потоковый курс начался (для бесплатного доступа сразу открываем)
            accessStatus = "granted"
            accessMessage = "Доступ открыт"
          }
        }
      } else {
        // Постоянный курс - доступ сразу
        accessStatus = "granted"
        accessMessage = "Доступ открыт"
      }
    } else {
      // Нет доступа
      accessStatus = "denied"
      accessMessage = "Нет доступа к курсу"
    }

    const response = {
      access: accessStatus === "granted", // Для совместимости
      hasAccess: accessStatus === "granted",
      type: accessType, // Для совместимости
      accessType,
      hasFeedback,
      status: accessStatus, // Для совместимости
      accessStatus,
      message: accessMessage, // Для совместимости
      accessMessage,
      course: {
        id: course.id,
        title: course.title,
        launch_mode: course.launch_mode,
        stream_start_date: course.stream_start_date,
      },
      purchases: purchasedPricings.map((p: any) => ({
        id: p.id,
        pricing: p.course_pricing,
        purchased_at: p.purchased_at,
        access_granted_at: p.access_granted_at,
      }))
    }

    console.log("✅ [API] Проверка доступа завершена:", {
      hasAccess: response.hasAccess,
      accessType: response.accessType,
      accessStatus: response.accessStatus,
      hasFreeAccess,
      purchasedPricingsCount: purchasedPricings.length
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

