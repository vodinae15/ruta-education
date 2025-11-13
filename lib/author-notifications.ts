import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Создает уведомление для автора курса
 * @param authorId - ID автора
 * @param courseId - ID курса
 * @param studentId - ID студента (опционально)
 * @param notificationType - Тип уведомления
 * @param message - Текст уведомления
 */
export async function createAuthorNotification(
  authorId: string,
  courseId: string,
  notificationType: "purchase_with_feedback" | "stream_started" | "course_published",
  message: string,
  studentId?: string
): Promise<boolean> {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [Notifications] Отсутствуют переменные окружения")
      return false
    }

    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    const { error } = await supabase.from("author_notifications").insert({
      author_id: authorId,
      course_id: courseId,
      student_id: studentId || null,
      notification_type: notificationType,
      message,
      is_read: false,
    })

    if (error) {
      console.error("Error creating author notification:", error)
      return false
    }

    console.log(`✅ Notification created for author ${authorId}`)
    return true
  } catch (error) {
    console.error("Error in createAuthorNotification:", error)
    return false
  }
}

/**
 * Получает уведомления автора
 * @param authorId - ID автора
 * @param unreadOnly - Только непрочитанные
 */
export async function getAuthorNotifications(
  authorId: string,
  unreadOnly: boolean = false
): Promise<{
  notifications: any[]
  unreadCount: number
}> {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [Notifications] Отсутствуют переменные окружения")
      return { notifications: [], unreadCount: 0 }
    }

    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

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
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return { notifications: [], unreadCount: 0 }
    }

    // Получаем количество непрочитанных
    const { count: unreadCount } = await supabase
      .from("author_notifications")
      .select("id", { count: "exact", head: true })
      .eq("author_id", authorId)
      .eq("is_read", false)

    return {
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    }
  } catch (error) {
    console.error("Error in getAuthorNotifications:", error)
    return { notifications: [], unreadCount: 0 }
  }
}

/**
 * Отмечает уведомление как прочитанное
 * @param notificationId - ID уведомления (или null для всех)
 * @param authorId - ID автора
 */
export async function markNotificationAsRead(
  notificationId: string | null,
  authorId: string
): Promise<boolean> {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [Notifications] Отсутствуют переменные окружения")
      return false
    }

    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    let query = supabase
      .from("author_notifications")
      .update({ is_read: true })
      .eq("author_id", authorId)

    if (notificationId) {
      query = query.eq("id", notificationId)
    } else {
      query = query.eq("is_read", false)
    }

    const { error } = await query

    if (error) {
      console.error("Error marking notification as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error)
    return false
  }
}

