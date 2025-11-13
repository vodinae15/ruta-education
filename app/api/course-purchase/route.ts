import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAuthorNotification } from "@/lib/author-notifications"

/**
 * POST - Создать покупку (тестовая оплата)
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [API] POST /api/course-purchase - начало обработки")
    
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

    // Получаем данные из запроса
    const { courseId, pricingId } = await request.json()
    console.log("📥 [API] Получены данные:", { courseId, pricingId })

    if (!courseId || !pricingId) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields: courseId and pricingId" }, { status: 400 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    console.log("🔧 [API] Service client создан")

    // Проверяем, что курс существует
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, launch_mode, stream_start_date")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.log("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Проверяем, что тариф существует
    const { data: pricing, error: pricingError } = await supabase
      .from("course_pricing")
      .select("id, course_id, name, price, has_feedback")
      .eq("id", pricingId)
      .eq("course_id", courseId)
      .single()

    if (pricingError || !pricing) {
      console.log("❌ [API] Тариф не найден:", pricingError)
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }

    // Находим или создаем студента
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, email")
      .eq("email", user.email)
      .maybeSingle()

    if (studentError) {
      console.error("❌ [API] Ошибка поиска студента:", studentError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!student) {
      console.log("👤 [API] Студент не найден, создаем нового")
      const { data: newStudent, error: createError } = await supabase
        .from("students")
        .insert({
          email: user.email!,
          user_id: user.id,
        })
        .select("id, email")
        .single()

      if (createError) {
        console.error("❌ [API] Ошибка создания студента:", createError)
        return NextResponse.json({ error: "Failed to create student" }, { status: 500 })
      }

      const studentId = newStudent.id

      // Проверяем, есть ли уже такая покупка
      const { data: existingPurchase } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .eq("pricing_id", pricingId)
        .maybeSingle()

      if (existingPurchase) {
        console.log("⚠️ [API] Покупка уже существует")
        return NextResponse.json({ 
          error: "Purchase already exists",
          message: "You have already purchased this pricing tier"
        }, { status: 409 })
      }

      // Создаем покупку (тестовая оплата - сразу completed)
      const now = new Date().toISOString()
      let accessGrantedAt = now

      // Для потоковых курсов проверяем дату старта
      if (course.launch_mode === 'stream' && course.stream_start_date) {
        const startDate = new Date(course.stream_start_date)
        const currentDate = new Date()
        if (startDate > currentDate) {
          // Доступ будет открыт в дату старта
          accessGrantedAt = course.stream_start_date
        }
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from("course_purchases")
        .insert({
          course_id: courseId,
          student_id: studentId,
          pricing_id: pricingId,
          purchase_status: 'completed',
          payment_method: 'test',
          purchased_at: now,
          access_granted_at: accessGrantedAt,
        })
        .select()
        .single()

      if (purchaseError) {
        console.error("❌ [API] Ошибка создания покупки:", purchaseError)
        return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
      }

      // Если тариф с обратной связью, создаем уведомление автору
      if (pricing.has_feedback) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("author_id")
          .eq("id", courseId)
          .single()

        if (courseData) {
          await createAuthorNotification(
            courseData.author_id,
            courseId,
            "purchase_with_feedback",
            `Студент ${user.email} купил курс "${course.title}" с тарифом "${pricing.name}" (с обратной связью)`,
            studentId
          )
        }
      }

      console.log("🎉 [API] Покупка успешно создана!")
      return NextResponse.json({ 
        success: true,
        purchase,
        message: "Purchase completed successfully"
      })
    } else {
      // Студент уже существует
      const studentId = student.id

      // Проверяем, есть ли уже такая покупка
      const { data: existingPurchase } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .eq("pricing_id", pricingId)
        .maybeSingle()

      if (existingPurchase) {
        console.log("⚠️ [API] Покупка уже существует")
        return NextResponse.json({ 
          error: "Purchase already exists",
          message: "You have already purchased this pricing tier"
        }, { status: 409 })
      }

      // Создаем покупку (тестовая оплата - сразу completed)
      const now = new Date().toISOString()
      let accessGrantedAt = now

      // Для потоковых курсов проверяем дату старта
      if (course.launch_mode === 'stream' && course.stream_start_date) {
        const startDate = new Date(course.stream_start_date)
        const currentDate = new Date()
        if (startDate > currentDate) {
          // Доступ будет открыт в дату старта
          accessGrantedAt = course.stream_start_date
        }
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from("course_purchases")
        .insert({
          course_id: courseId,
          student_id: studentId,
          pricing_id: pricingId,
          purchase_status: 'completed',
          payment_method: 'test',
          purchased_at: now,
          access_granted_at: accessGrantedAt,
        })
        .select()
        .single()

      if (purchaseError) {
        console.error("❌ [API] Ошибка создания покупки:", purchaseError)
        return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
      }

      // Если тариф с обратной связью, создаем уведомление автору
      if (pricing.has_feedback) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("author_id")
          .eq("id", courseId)
          .single()

        if (courseData) {
          await createAuthorNotification(
            courseData.author_id,
            courseId,
            "purchase_with_feedback",
            `Студент ${user.email} купил курс "${course.title}" с тарифом "${pricing.name}" (с обратной связью)`,
            studentId
          )
        }
      }

      console.log("🎉 [API] Покупка успешно создана!")
      return NextResponse.json({ 
        success: true,
        purchase,
        message: "Purchase completed successfully"
      })
    }

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET - Получить покупки студента по курсу
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/course-purchase - начало обработки")
    
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

    // Находим студента
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ purchases: [] })
    }

    // Получаем покупки студента по курсу
    const { data: purchases, error: purchasesError } = await supabase
      .from("course_purchases")
      .select(`
        *,
        course_pricing (
          id,
          name,
          price,
          has_feedback,
          description
        )
      `)
      .eq("course_id", courseId)
      .eq("student_id", student.id)
      .eq("purchase_status", "completed")
      .order("purchased_at", { ascending: false })

    if (purchasesError) {
      console.error("❌ [API] Ошибка загрузки покупок:", purchasesError)
      return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 })
    }

    console.log("✅ [API] Покупки загружены:", purchases?.length || 0, "записей")
    return NextResponse.json({ purchases: purchases || [] })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

