import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createAuthorNotification } from "./author-notifications"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Открывает доступ для всех студентов потокового курса
 * @param courseId - ID курса
 * @param authorId - ID автора курса
 * @returns Promise с результатом операции
 */
export async function launchStreamCourse(
  courseId: string,
  authorId: string
): Promise<{ success: boolean; message: string; studentsCount?: number }> {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [Stream Launch] Отсутствуют переменные окружения")
      return { success: false, message: "Server configuration error" }
    }

    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    // Проверяем, что курс существует и является потоковым
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, launch_mode, stream_start_date, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.error("Error fetching course:", courseError)
      return { success: false, message: "Course not found" }
    }

    if (course.author_id !== authorId) {
      return { success: false, message: "Unauthorized: Only course author can launch stream" }
    }

    if (course.launch_mode !== "stream") {
      return { success: false, message: "Course is not a stream-based course" }
    }

    if (!course.stream_start_date) {
      return { success: false, message: "Stream start date is not set" }
    }

    // Проверяем, что дата старта наступила
    const startDate = new Date(course.stream_start_date)
    const currentDate = new Date()

    if (startDate > currentDate) {
      return {
        success: false,
        message: `Stream start date has not arrived yet. Start date: ${startDate.toLocaleDateString("ru-RU")}`,
      }
    }

    // Получаем все покупки для этого курса
    const { data: allPurchases, error: purchasesError } = await supabase
      .from("course_purchases")
      .select(`
        id,
        student_id,
        access_granted_at,
        students (
          email
        )
      `)
      .eq("course_id", courseId)
      .eq("purchase_status", "completed")

    if (purchasesError) {
      console.error("Error fetching purchases:", purchasesError)
      return { success: false, message: "Failed to fetch purchases" }
    }

    if (!allPurchases || allPurchases.length === 0) {
      return { success: true, message: "No purchases found for this course", studentsCount: 0 }
    }

    // Фильтруем покупки, у которых доступ еще не открыт
    // Доступ считается не открытым, если:
    // 1. access_granted_at равен NULL
    // 2. access_granted_at больше или равен дате старта потока (доступ был установлен на будущее)
    const streamStartDate = new Date(course.stream_start_date)
    const pendingPurchases = allPurchases.filter((purchase) => {
      if (!purchase.access_granted_at) {
        // Доступ еще не был открыт
        return true
      }
      const grantedDate = new Date(purchase.access_granted_at)
      // Если дата открытия доступа больше или равна дате старта потока, значит доступ еще не открыт
      return grantedDate >= streamStartDate
    })

    if (pendingPurchases.length === 0) {
      return {
        success: true,
        message: "All purchases already have access granted",
        studentsCount: 0,
      }
    }

    // Обновляем access_granted_at только для покупок без открытого доступа
    const now = new Date().toISOString()
    const purchaseIds = pendingPurchases.map((p) => p.id)

    const { error: updateError } = await supabase
      .from("course_purchases")
      .update({ access_granted_at: now })
      .in("id", purchaseIds)

    if (updateError) {
      console.error("Error updating purchases:", updateError)
      return { success: false, message: "Failed to update purchases" }
    }

    // Создаем уведомление для автора о запуске потока
    const studentsCount = pendingPurchases.length
    await createAuthorNotification(
      authorId,
      courseId,
      "stream_started",
      `Поток курса "${course.title}" запущен! Доступ открыт для ${studentsCount} студент${studentsCount === 1 ? "а" : "ов"}.`,
    )

    console.log(`✅ Stream launched for course ${courseId}, ${studentsCount} students granted access`)
    return {
      success: true,
      message: `Stream launched successfully! Access granted to ${studentsCount} students.`,
      studentsCount,
    }
  } catch (error) {
    console.error("Error in launchStreamCourse:", error)
    return { success: false, message: "Internal server error" }
  }
}

/**
 * Проверяет, можно ли запустить поток (дата старта наступила)
 * @param courseId - ID курса
 * @returns Promise с информацией о возможности запуска
 */
export async function canLaunchStream(courseId: string): Promise<{
  canLaunch: boolean
  message: string
  startDate?: string
}> {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return { canLaunch: false, message: "Server configuration error" }
    }

    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    const { data: course, error } = await supabase
      .from("courses")
      .select("launch_mode, stream_start_date")
      .eq("id", courseId)
      .single()

    if (error || !course) {
      return { canLaunch: false, message: "Course not found" }
    }

    if (course.launch_mode !== "stream") {
      return { canLaunch: false, message: "Course is not a stream-based course" }
    }

    if (!course.stream_start_date) {
      return { canLaunch: false, message: "Stream start date is not set" }
    }

    const startDate = new Date(course.stream_start_date)
    const currentDate = new Date()

    if (startDate > currentDate) {
      return {
        canLaunch: false,
        message: `Stream start date has not arrived yet. Start date: ${startDate.toLocaleDateString("ru-RU")}`,
        startDate: course.stream_start_date,
      }
    }

    return { canLaunch: true, message: "Stream can be launched", startDate: course.stream_start_date }
  } catch (error) {
    console.error("Error in canLaunchStream:", error)
    return { canLaunch: false, message: "Internal server error" }
  }
}

