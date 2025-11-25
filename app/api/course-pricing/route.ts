import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

/**
 * GET - Получить тарифы курса
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/course-pricing - начало обработки")
    
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

    // Получаем тарифы курса
    console.log("✅ [API] Загружаем тарифы для курса:", courseId)
    const { data: pricing, error: pricingError } = await supabase
      .from("course_pricing")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true })

    if (pricingError) {
      console.error("❌ [API] Ошибка загрузки тарифов:", pricingError)
      return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 })
    }

    console.log("✅ [API] Тарифы загружены:", pricing?.length || 0, "записей")
    return NextResponse.json({ pricing: pricing || [] })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT - Обновить тариф (только автор или соавтор)
 */
export async function PUT(request: NextRequest) {
  try {
    console.log("🚀 [API] PUT /api/course-pricing - начало обработки")
    
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
    const { pricingId, updates } = await request.json()
    console.log("📥 [API] Получены данные:", { pricingId, updates })

    if (!pricingId || !updates) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields: pricingId and updates" }, { status: 400 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    console.log("🔧 [API] Service client создан")

    // Проверяем, что тариф существует
    const { data: pricing, error: pricingError } = await supabase
      .from("course_pricing")
      .select("id, course_id, courses!inner(author_id)")
      .eq("id", pricingId)
      .single()

    if (pricingError || !pricing) {
      console.log("❌ [API] Тариф не найден:", pricingError)
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }

    // Проверяем, что пользователь является автором или соавтором курса
    const course = pricing.courses as any
    const isAuthor = course.author_id === user.id

    // Проверяем, является ли пользователь соавтором
    let isCollaborator = false
    if (!isAuthor) {
      const { data: collaborator } = await supabase
        .from("course_collaborators")
        .select("id")
        .eq("course_id", pricing.course_id)
        .eq("collaborator_user_id", user.id)
        .maybeSingle()

      isCollaborator = !!collaborator
    }

    if (!isAuthor && !isCollaborator) {
      console.log("❌ [API] Пользователь не имеет прав на редактирование тарифа")
      return NextResponse.json({ error: "Forbidden: Only course author or collaborator can update pricing" }, { status: 403 })
    }

    console.log("✅ [API] Права доступа подтверждены")

    // Обновляем тариф
    const { data: updatedPricing, error: updateError } = await supabase
      .from("course_pricing")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pricingId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ [API] Ошибка обновления тарифа:", updateError)
      return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 })
    }

    console.log("🎉 [API] Тариф успешно обновлен!")
    return NextResponse.json({ 
      success: true,
      pricing: updatedPricing
    })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

