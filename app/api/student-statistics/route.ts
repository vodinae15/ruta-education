import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

interface StudentStatistics {
  studentId: string
  email: string
  registrationDate: string
  progress: number // Процент от 0 до 100
  timeSpent: number // Секунды
  timeSpentFormatted: string // "2ч 30м"
  lastActivity: string
  completedLessons: number
  totalLessons: number
  studentType: string | null
}

/**
 * Форматирует время из секунд в читаемый формат
 */
function formatTime(seconds: number): string {
  if (seconds === 0) return "0м"
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`
  }
  return `${minutes}м`
}

/**
 * Рассчитывает прогресс из JSONB поля progress
 */
function calculateProgress(progressData: any, totalLessons: number): number {
  if (!progressData || typeof progressData !== 'object') {
    return 0
  }
  
  // Прогресс может храниться в разных форматах:
  // 1. Как объект с ключами lessonId: { lessonId: { completed: true, ... } }
  // 2. Как массив completed_lessons: { completed_lessons: [lessonId1, lessonId2] }
  // 3. Как progress_percentage: { progress_percentage: 50 }
  
  // Проверяем progress_percentage
  if (typeof progressData.progress_percentage === 'number') {
    return Math.min(100, Math.max(0, progressData.progress_percentage))
  }
  
  // Проверяем completed_lessons
  if (Array.isArray(progressData.completed_lessons)) {
    const completedCount = progressData.completed_lessons.length
    if (totalLessons > 0) {
      return Math.round((completedCount / totalLessons) * 100)
    }
    return 0
  }
  
  // Проверяем объект с ключами lessonId
  const lessonKeys = Object.keys(progressData).filter(key => {
    const lesson = progressData[key]
    return lesson && (lesson.completed === true || lesson.completed === 'true' || lesson.status === 'completed')
  })
  
  if (totalLessons > 0) {
    return Math.round((lessonKeys.length / totalLessons) * 100)
  }
  
  return 0
}

/**
 * Получает количество уроков в курсе
 */
async function getTotalLessons(supabase: any, courseId: string): Promise<number> {
  try {
    // Сначала пробуем получить из таблицы course_lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("course_id", courseId)
    
    if (!lessonsError && lessons && lessons.length > 0) {
      return lessons.length
    }
    
    // Если нет в таблице, пробуем получить из поля modules.lessons
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("modules")
      .eq("id", courseId)
      .single()
    
    if (!courseError && course?.modules) {
      if (course.modules.lessons && Array.isArray(course.modules.lessons)) {
        return course.modules.lessons.length
      }
      if (course.modules.blocks && Array.isArray(course.modules.blocks)) {
        return course.modules.blocks.length
      }
    }
    
    return 0
  } catch (error) {
    console.error("Error getting total lessons:", error)
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/student-statistics - начало обработки")
    
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
    
    // Проверяем, что это автор
    if (user.user_metadata?.user_type !== "teacher") {
      console.log("❌ [API] Пользователь не является автором")
      return NextResponse.json({ error: "Forbidden: Only teachers can access this endpoint" }, { status: 403 })
    }
    
    console.log("✅ [API] Автор авторизован:", user.email)
    
    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    console.log("🔧 [API] Service client создан")
    
    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    
    console.log("📥 [API] Параметры запроса:", { courseId, authorId: user.id })
    
    // Получаем все курсы автора и соавтора
    const { data: authorCourses, error: authorCoursesError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("author_id", user.id)
    
    if (authorCoursesError) {
      console.error("❌ [API] Ошибка загрузки курсов автора:", authorCoursesError)
      return NextResponse.json({ error: "Failed to load courses" }, { status: 500 })
    }

    // Получаем курсы где пользователь является соавтором
    const { data: collaboratorCourses, error: collaboratorCoursesError } = await supabase
      .from("course_collaborators")
      .select("course_id, courses(id, title)")
      .eq("collaborator_user_id", user.id)
    
    if (collaboratorCoursesError) {
      console.error("❌ [API] Ошибка загрузки курсов соавтора:", collaboratorCoursesError)
    }

    // Объединяем курсы автора и соавтора
    const allCourses = [
      ...(authorCourses || []),
      ...(collaboratorCourses?.map((cc: any) => cc.courses).filter(Boolean) || [])
    ]

    // Убираем дубликаты по id
    const uniqueCourses = Array.from(
      new Map(allCourses.map((course: any) => [course.id, course])).values()
    ) as Array<{ id: string; title: string }>
    
    if (uniqueCourses.length === 0) {
      console.log("ℹ️ [API] У пользователя нет курсов (как автор или соавтор)")
      return NextResponse.json({ 
        students: [],
        courses: []
      })
    }

    // Используем объединенный список курсов
    const allAuthorCourses = uniqueCourses
    
    console.log("📚 [API] Найдено курсов (автор + соавтор):", allAuthorCourses.length)
    
    // Определяем, какие курсы обрабатывать
    const coursesToProcess = courseId 
      ? allAuthorCourses.filter(c => c.id === courseId)
      : allAuthorCourses
    
    if (courseId && coursesToProcess.length === 0) {
      console.log("❌ [API] Курс не найден или не принадлежит автору")
      return NextResponse.json({ error: "Course not found or access denied" }, { status: 404 })
    }
    
    const courseIds = coursesToProcess.map(c => c.id)
    console.log("📊 [API] Обрабатываем курсы:", courseIds)
    
    // Получаем всех учеников с доступом к курсам автора
    const { data: studentAccess, error: accessError } = await supabase
      .from("student_course_access")
      .select(`
        id,
        student_id,
        course_id,
        first_accessed_at,
        last_accessed_at,
        progress,
        total_time_spent,
        students (
          id,
          email,
          student_type,
          test_results,
          created_at
        ),
        courses (
          id,
          title
        )
      `)
      .in("course_id", courseIds)
      .order("last_accessed_at", { ascending: false })
    
    if (accessError) {
      console.error("❌ [API] Ошибка загрузки доступа:", accessError)
      return NextResponse.json({ error: "Failed to load student access" }, { status: 500 })
    }
    
    console.log("👥 [API] Найдено записей доступа:", studentAccess?.length || 0)
    
    // Собираем уникальных учеников (если запрашиваются все курсы)
    const studentsMap = new Map<string, StudentStatistics>()
    
    // Обрабатываем каждую запись доступа
    for (const access of studentAccess || []) {
      const student = (access.students as any)
      const course = (access.courses as any)
      
      if (!student) continue
      
      const studentId = student.id
      const email = student.email
      
      // Если запрашиваются все курсы, группируем по ученику
      // Если конкретный курс - показываем всех учеников этого курса
      const key = courseId ? `${studentId}_${course.id}` : studentId
      
      if (!studentsMap.has(key)) {
        // Получаем общее количество уроков для курса
        const totalLessons = await getTotalLessons(supabase, course.id)
        
        // Рассчитываем прогресс
        const progress = calculateProgress(access.progress, totalLessons)
        
        // Подсчитываем пройденные уроки
        let completedLessons = 0
        if (access.progress) {
          if (Array.isArray(access.progress.completed_lessons)) {
            completedLessons = access.progress.completed_lessons.length
          } else if (typeof access.progress === 'object') {
            completedLessons = Object.keys(access.progress).filter(key => {
              const lesson = access.progress[key]
              return lesson && (lesson.completed === true || lesson.completed === 'true' || lesson.status === 'completed')
            }).length
          }
        }
        
        // Форматируем время
        const timeSpent = access.total_time_spent || 0
        const timeSpentFormatted = formatTime(timeSpent)
        
        // Формируем отображаемый тип студента из test_results
        let studentTypeDisplay: string | null = null
        if (student.test_results && student.test_results.test_version === "3.0") {
          // Новый формат теста
          const cognitiveStyle = student.test_results.cognitiveStyle
          const feedbackPreference = student.test_results.feedbackPreference
          
          if (cognitiveStyle && feedbackPreference) {
            const styleText = cognitiveStyle === "reflective" ? "Рефлексивный" : 
                            cognitiveStyle === "impulsive" ? "Импульсивный" : "Смешанный"
            const feedbackText = feedbackPreference === "short" ? "Короткая ОС" : 
                               feedbackPreference === "detailed" ? "Развёрнутая ОС" : "Смешанная ОС"
            studentTypeDisplay = `${styleText} / ${feedbackText}`
          }
        } else if (student.student_type) {
          // Старый формат (VAK) - оставляем как есть для обратной совместимости
          studentTypeDisplay = student.student_type
        }
        
        studentsMap.set(key, {
          studentId: student.id,
          email: student.email,
          registrationDate: student.created_at || access.first_accessed_at,
          progress: progress,
          timeSpent: timeSpent,
          timeSpentFormatted: timeSpentFormatted,
          lastActivity: access.last_accessed_at,
          completedLessons: completedLessons,
          totalLessons: totalLessons,
          studentType: studentTypeDisplay
        })
      } else {
        // Если ученик уже есть (для случая всех курсов), обновляем статистику
        const existing = studentsMap.get(key)!
        
        // Обновляем последнюю активность (берем самую свежую)
        if (new Date(access.last_accessed_at) > new Date(existing.lastActivity)) {
          existing.lastActivity = access.last_accessed_at
        }
        
        // Суммируем время изучения
        existing.timeSpent += (access.total_time_spent || 0)
        existing.timeSpentFormatted = formatTime(existing.timeSpent)
      }
    }
    
    // Преобразуем Map в массив
    const students = Array.from(studentsMap.values())
    
    console.log("✅ [API] Статистика собрана для", students.length, "учеников")
    
    return NextResponse.json({
      students: students,
      courses: allAuthorCourses.map(c => ({ id: c.id, title: c.title }))
    })
    
  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

