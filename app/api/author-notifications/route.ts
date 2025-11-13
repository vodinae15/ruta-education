import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

/**
 * OPTIONS - Обработка preflight запросов
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * GET - Получить уведомления автора
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/author-notifications - начало обработки")
    
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
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    console.log("📥 [API] Получен параметр unreadOnly:", unreadOnly)

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    // Строим запрос
    let query = supabase
      .from("author_notifications")
      .select(`
        *,
        courses (
          id,
          title
        ),
        students (
          id,
          email
        )
      `)
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      console.error("❌ [API] Ошибка загрузки уведомлений:", notificationsError)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    // Подсчитываем непрочитанные
    const { count: unreadCount } = await supabase
      .from("author_notifications")
      .select("*", { count: "exact", head: true })
      .eq("author_id", user.id)
      .eq("is_read", false)

    console.log("✅ [API] Уведомления загружены:", notifications?.length || 0, "записей")
    console.log("📊 [API] Непрочитанных:", unreadCount || 0)

    const response = NextResponse.json({ 
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    })
    
    // Добавляем CORS заголовки
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT - Отметить уведомление как прочитанное
 */
export async function PUT(request: NextRequest) {
  try {
    console.log("🚀 [API] PUT /api/author-notifications - начало обработки")
    
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
    const { notificationId, markAllAsRead } = await request.json()
    console.log("📥 [API] Получены данные:", { notificationId, markAllAsRead })

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    if (markAllAsRead) {
      // Отмечаем все уведомления как прочитанные
      const { error: updateError } = await supabase
        .from("author_notifications")
        .update({ is_read: true })
        .eq("author_id", user.id)
        .eq("is_read", false)

      if (updateError) {
        console.error("❌ [API] Ошибка обновления уведомлений:", updateError)
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
      }

      console.log("🎉 [API] Все уведомления отмечены как прочитанные!")
      const response = NextResponse.json({ 
        success: true,
        message: "All notifications marked as read"
      })
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    } else {
      // Отмечаем одно уведомление как прочитанное
      if (!notificationId) {
        console.log("❌ [API] Отсутствует notificationId")
        return NextResponse.json({ error: "Missing notificationId" }, { status: 400 })
      }

      // Проверяем, что уведомление принадлежит автору
      const { data: notification, error: checkError } = await supabase
        .from("author_notifications")
        .select("id, author_id")
        .eq("id", notificationId)
        .single()

      if (checkError || !notification) {
        console.log("❌ [API] Уведомление не найдено:", checkError)
        return NextResponse.json({ error: "Notification not found" }, { status: 404 })
      }

      if (notification.author_id !== user.id) {
        console.log("❌ [API] Уведомление не принадлежит пользователю")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const { error: updateError } = await supabase
        .from("author_notifications")
        .update({ is_read: true })
        .eq("id", notificationId)

      if (updateError) {
        console.error("❌ [API] Ошибка обновления уведомления:", updateError)
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
      }

      console.log("🎉 [API] Уведомление отмечено как прочитанное!")
      const response = NextResponse.json({ 
        success: true,
        message: "Notification marked as read"
      })
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

