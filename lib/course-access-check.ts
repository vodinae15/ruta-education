import { createClient } from "@/lib/supabase/client"

export interface CourseAccessResult {
  hasAccess: boolean
  accessType: "free" | "paid" | null
  hasFeedback: boolean
  accessStatus: "granted" | "pending" | "denied"
  accessMessage: string
  course: {
    id: string
    title: string
    launch_mode: string | null
    stream_start_date: string | null
  }
  purchases: Array<{
    id: string
    pricing: {
      id: string
      name: string
      has_feedback: boolean
    }
    purchased_at: string
    access_granted_at: string
  }>
}

/**
 * Проверяет доступ студента к курсу
 * @param courseId - ID курса
 * @param studentEmail - Email студента
 * @returns Promise с результатом проверки доступа
 */
export async function checkCourseAccess(
  courseId: string,
  studentEmail: string
): Promise<CourseAccessResult | null> {
  try {
    const supabase = createClient()

    // Загружаем курс
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, launch_mode, stream_start_date, status")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.error("Error loading course:", courseError)
      return null
    }

    // Находим студента (нормализуем email для поиска)
    const normalizedEmail = (studentEmail || '').trim().toLowerCase()
    console.log("🔍 [checkCourseAccess] Ищем студента с email:", normalizedEmail)
    
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
        .eq("email", studentEmail.trim())
        .maybeSingle()
      
      if (!studentAltError && studentAlt) {
        student = studentAlt
        console.log("✅ [checkCourseAccess] Студент найден без нормализации:", student.email)
      }
    }

    if (studentError) {
      console.error("❌ [checkCourseAccess] Ошибка поиска студента:", studentError)
      return null
    }

    if (!student) {
      console.log("❌ [checkCourseAccess] Студент не найден с email:", normalizedEmail)
      return {
        hasAccess: false,
        accessType: null,
        hasFeedback: false,
        accessStatus: "denied",
        accessMessage: "Студент не найден",
        course: {
          id: course.id,
          title: course.title,
          launch_mode: course.launch_mode,
          stream_start_date: course.stream_start_date,
        },
        purchases: [],
      }
    }

    console.log("✅ [checkCourseAccess] Студент найден:", student.id, student.email)

    // Проверяем бесплатный доступ (через student_course_access)
    const { data: freeAccess, error: freeAccessError } = await supabase
      .from("student_course_access")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", student.id)
      .maybeSingle()

    if (freeAccessError) {
      console.error("❌ [checkCourseAccess] Ошибка проверки бесплатного доступа:", freeAccessError)
    }

    const hasFreeAccess = !!freeAccess
    console.log("🔍 [checkCourseAccess] Бесплатный доступ:", hasFreeAccess ? "есть" : "нет", {
      courseId,
      studentId: student.id,
      freeAccessId: freeAccess?.id
    })

    // Проверяем покупки тарифов
    const { data: purchases } = await supabase
      .from("course_purchases")
      .select(`
        id,
        purchased_at,
        access_granted_at,
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
        hasFeedback = purchasedPricings.some(
          (p: any) => p.course_pricing?.has_feedback
        )
      } else {
        accessType = "free"
      }

      // Проверяем режим запуска
      if (course.launch_mode === "stream" && course.stream_start_date) {
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
              accessMessage = `Ожидает начала обучения (старт курса — ${new Date(
                course.stream_start_date
              ).toLocaleDateString("ru-RU")})`
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
            accessMessage = `Ожидает начала обучения (старт курса — ${new Date(
              course.stream_start_date
            ).toLocaleDateString("ru-RU")})`
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

    return {
      hasAccess: accessStatus === "granted",
      accessType,
      hasFeedback,
      accessStatus,
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
      })),
    }
  } catch (error) {
    console.error("Error in checkCourseAccess:", error)
    return null
  }
}

