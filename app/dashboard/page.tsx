"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import { BookOpenIcon, UserIcon, TrendingUpIcon, EyeIcon, UsersIcon, EditIcon, ClockIcon, PlayIcon, BarChartIcon, RepeatIcon } from "@/components/ui/icons"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import Link from "next/link"

interface AuthorProfile {
  id: string
  user_id: string
  author_type: string
  communication_style: string
  motivation: string
  barrier: string
  created_at: string
  updated_at: string
}

interface Course {
  id: string
  title: string
  description: string | null
  author_id: string
  is_published: boolean
  created_at: string
  updated_at: string
  is_collaborator?: boolean // Флаг, что пользователь является соавтором
  launch_mode?: "stream" | "permanent" | null
  stream_start_date?: string | null
  status?: string
}

interface DashboardStats {
  totalStudents: number
  totalCourses: number
  publishedCourses: number
  averageProgress: number
  totalPurchases?: number
  purchasesWithFeedback?: number
  streamCourses?: number
  totalRevenue?: number
  totalRevenueFormatted?: string
}

/**
 * Форматирует сумму дохода в рубли с разделителями тысяч
 * @param amount - сумма в рублях
 * @returns отформатированная строка вида "1 000 ₽"
 */
function formatRevenue(amount: number): string {
  // Обрабатываем граничные случаи: не число, NaN, отрицательные или ноль
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return "0 ₽"
  }
  
  // Округляем до целых (рубли без копеек)
  const roundedAmount = Math.round(amount)
  
  // Форматируем число с пробелами в качестве разделителей тысяч
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount)
  
  return `${formatted} ₽`
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<AuthorProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    averageProgress: 0,
    totalPurchases: 0,
    purchasesWithFeedback: 0,
    streamCourses: 0,
    totalRevenue: 0,
    totalRevenueFormatted: "0 ₽",
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [launchingStreams, setLaunchingStreams] = useState<Record<string, boolean>>({})
  const [streamLaunchStatus, setStreamLaunchStatus] = useState<Record<string, { canLaunch: boolean; message: string }>>({})
  const [courseAnalytics, setCourseAnalytics] = useState<Record<string, any>>({})
  const [analyticsLoading, setAnalyticsLoading] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    console.log("🏠 Dashboard useEffect triggered")
    console.log("🏠 Dashboard: authLoading =", authLoading, "user =", user?.email)
    console.log("🏠 Dashboard: Current URL pathname:", typeof window !== 'undefined' ? window.location.pathname : 'SSR')
    
    // Дополнительная проверка через прямой запрос к Supabase
    const checkAuthDirectly = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log("🔍 Direct auth check:", session?.user?.email || "No session")
        
        if (!session && !authLoading) {
          console.log("❌ No session found, redirecting to auth")
          router.push("/auth")
          return
        }
      } catch (error) {
        console.error("❌ Error checking auth:", error)
      }
    }

    if (!authLoading && !user) {
      console.log("❌ No user found after loading complete, doing direct check...")
      checkAuthDirectly()
      return
    }

    if (authLoading) {
      console.log("⏳ Auth still loading...")
      return
    }

    if (!user) {
      console.log("⏳ No user yet, but auth not loading... waiting")
      return
    }

    console.log("✅ User found, loading dashboard data for:", user.email)
    console.log("👤 User type:", user.user_metadata?.user_type)
    console.log("👤 Full user metadata:", JSON.stringify(user.user_metadata, null, 2))

    const loadDashboardData = async () => {
      try {
        setError(null)
        const supabase = createClient()

        // Load profile and author courses in parallel
        const [profileResult, authorCoursesResult] = await Promise.all([
          supabase
            .from("author_profiles")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("courses").select("*").eq("author_id", user.id).order("created_at", { ascending: false }),
        ])

        // Handle profile data
        if (profileResult.error && profileResult.error.code !== "PGRST116") {
          throw profileResult.error
        }
        setProfile(profileResult.data)
        setProfileLoading(false)

        // Handle courses data
        if (authorCoursesResult.error) throw authorCoursesResult.error
        
        // Получаем курсы автора
        const authorCourses = (authorCoursesResult.data || []).map((course: Course) => ({
          ...course,
          is_collaborator: false,
        }))

        // Получаем курсы соавтора (отдельным запросом)
        let collaboratorCourses: Course[] = []
        const { data: collaboratorIds, error: collaboratorIdsError } = await supabase
          .from("course_collaborators")
          .select("course_id")
          .eq("collaborator_user_id", user.id)

        if (!collaboratorIdsError && collaboratorIds && collaboratorIds.length > 0) {
          const courseIds = collaboratorIds.map((cc: any) => cc.course_id)
          const { data: collaboratorCoursesData, error: collaboratorCoursesError } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)
            .order("created_at", { ascending: false })

          if (!collaboratorCoursesError && collaboratorCoursesData) {
            collaboratorCourses = collaboratorCoursesData.map((course: Course) => ({
              ...course,
              is_collaborator: true,
            }))
          }
        }

        // Объединяем курсы, убираем дубликаты (если пользователь и автор, и соавтор)
        const allCoursesMap = new Map<string, Course>()
        authorCourses.forEach((course) => allCoursesMap.set(course.id, course))
        collaboratorCourses.forEach((course) => {
          if (!allCoursesMap.has(course.id)) {
            allCoursesMap.set(course.id, course)
          }
        })

        const coursesData = Array.from(allCoursesMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        setCourses(coursesData)
        setCoursesLoading(false)

        // Calculate stats
        const totalCourses = coursesData.length
        const publishedCourses = coursesData.filter((c) => c.is_published).length
        const publishedCourseIds = coursesData.filter((c) => c.is_published).map((c) => c.id)
        const streamCourses = coursesData.filter((c) => c.launch_mode === "stream" && c.is_published).length

        let totalStudents = 0
        let averageProgress = 0
        let totalPurchases = 0
        let purchasesWithFeedback = 0
        let totalRevenue = 0

        if (publishedCourseIds.length > 0) {
          // Получаем доступ студентов к курсам из CRM системы
          const { data: accessData, error: accessError } = await supabase
            .from("student_course_access")
            .select("student_id, progress")
            .in("course_id", publishedCourseIds)

          if (accessError) throw accessError

          // Подсчет уникальных студентов
          const uniqueStudents = new Set(accessData?.map(a => a.student_id) || [])
          totalStudents = uniqueStudents.size

          // Расчет среднего прогресса
          if (accessData && accessData.length > 0) {
            // Извлекаем прогресс из JSONB поля
            const progressValues = accessData
              .map(access => {
                if (!access.progress || typeof access.progress !== 'object') return 0
                
                // Проверяем разные форматы прогресса
                if (typeof access.progress.progress_percentage === 'number') {
                  return access.progress.progress_percentage
                }
                
                if (Array.isArray(access.progress.completed_lessons)) {
                  // Если есть информация о количестве уроков, можно рассчитать процент
                  // Пока просто возвращаем количество завершенных уроков
                  return access.progress.completed_lessons.length * 10 // Примерная оценка
                }
                
                // Подсчитываем завершенные уроки из объекта
                const completedCount = Object.keys(access.progress).filter(key => {
                  const lesson = access.progress[key]
                  return lesson && (lesson.completed === true || lesson.completed === 'true' || lesson.status === 'completed')
                }).length
                
                return completedCount * 10 // Примерная оценка
              })
              .filter(p => p > 0)
            
            if (progressValues.length > 0) {
              const totalProgress = progressValues.reduce((sum, p) => sum + p, 0)
              averageProgress = Math.round(totalProgress / progressValues.length)
              // Ограничиваем максимальное значение 100%
              averageProgress = Math.min(100, averageProgress)
            }
          }

          // Загружаем статистику покупок
          const { data: purchasesData, error: purchasesError } = await supabase
            .from("course_purchases")
            .select(`
              id,
              purchase_status,
              course_pricing (
                price,
                has_feedback
              )
            `)
            .in("course_id", publishedCourseIds)
            .eq("purchase_status", "completed")

          if (!purchasesError && purchasesData) {
            totalPurchases = purchasesData.length
            purchasesWithFeedback = purchasesData.filter(
              (p: any) => p.course_pricing?.has_feedback
            ).length

            // Рассчитываем доход из завершенных покупок
            totalRevenue = purchasesData.reduce((sum, purchase) => {
              // Обрабатываем случай, когда course_pricing отсутствует или null
              if (!purchase.course_pricing || purchase.course_pricing === null) {
                return sum
              }
              
              // Получаем цену и преобразуем в число
              const price = purchase.course_pricing.price
              if (price === null || price === undefined) {
                return sum
              }
              
              // Преобразуем в число (может быть строкой из DECIMAL)
              const priceNumber = typeof price === 'string' ? parseFloat(price) : Number(price)
              
              // Проверяем, что это валидное число
              if (isNaN(priceNumber) || priceNumber < 0) {
                return sum
              }
              
              return sum + priceNumber
            }, 0)
          }
        }

        const totalRevenueFormatted = formatRevenue(totalRevenue)

        setStats({
          totalStudents,
          totalCourses,
          publishedCourses,
          averageProgress,
          totalPurchases,
          purchasesWithFeedback,
          streamCourses,
          totalRevenue,
          totalRevenueFormatted,
        })
        setStatsLoading(false)

        // Аналитика будет загружаться по требованию (lazy loading) через Intersection Observer
        // Не загружаем аналитику для всех курсов сразу, чтобы избежать множественных запросов
      } catch (err) {
        console.error("Error loading dashboard data:", err)
        setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке данных")
        setProfileLoading(false)
        setStatsLoading(false)
        setCoursesLoading(false)
      }
    }

    loadDashboardData()
  }, [user, authLoading, router]) // Only essential dependencies to prevent infinite loops

  // Функция для загрузки аналитики одного курса
  const loadCourseAnalytics = useCallback(async (courseId: string) => {
    // Проверяем, не загружается ли уже аналитика для этого курса
    if (analyticsLoading[courseId]) {
      console.log(`⏸️ [Analytics] Аналитика уже загружается для курса ${courseId}`)
      return
    }
    
    // Если аналитика уже загружена и успешна, не загружаем повторно
    // Но разрешаем повторную загрузку, если данные были загружены, но не успешны
    const existingData = courseAnalytics[courseId]
    if (existingData && existingData.success === true) {
      console.log(`✅ [Analytics] Аналитика уже загружена для курса ${courseId}`)
      return
    }

    console.log(`📊 [Analytics] Начало загрузки аналитики для курса ${courseId}`, {
      hasExistingData: !!existingData,
      existingSuccess: existingData?.success
    })
    
    setAnalyticsLoading(prev => ({ ...prev, [courseId]: true }))

    try {
      const response = await fetch(`/api/course-analytics?courseId=${courseId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`❌ [Analytics] Ошибка загрузки аналитики для курса ${courseId}:`, {
          status: response.status,
          error: errorData
        })
        // Не сохраняем данные об ошибке в состояние, чтобы разрешить повторную загрузку
        return
      }
      
      const data = await response.json()
      console.log(`✅ [Analytics] Получен ответ API для курса ${courseId}:`, {
        success: data.success,
        hasCourse: !!data.course,
        courseTitle: data.course?.title,
        hasSummary: !!data.summary,
        totalLessons: data.summary?.totalLessons,
        hasLessons: !!data.lessons,
        lessonsCount: data.lessons?.length || 0,
        summaryKeys: data.summary ? Object.keys(data.summary) : [],
        fullData: data
      })
      
      // Проверяем, что данные валидны
      if (!data || typeof data.success !== 'boolean') {
        console.error(`❌ [Analytics] Невалидные данные от API для курса ${courseId}:`, data)
        return
      }
      
      // Сохраняем данные в состояние
      // API всегда возвращает success: true для успешных ответов
      setCourseAnalytics(prev => {
        const newState = {
          ...prev,
          [courseId]: data
        }
        console.log(`💾 [Analytics] Сохранено в состояние для курса ${courseId}:`, {
          success: newState[courseId]?.success,
          hasCourse: !!newState[courseId]?.course,
          courseTitle: newState[courseId]?.course?.title,
          hasSummary: !!newState[courseId]?.summary,
          totalLessons: newState[courseId]?.summary?.totalLessons,
          hasLessons: !!newState[courseId]?.lessons,
          allCourseIds: Object.keys(newState),
          currentCourseData: newState[courseId]
        })
        return newState
      })
    } catch (error) {
      console.error(`❌ [Analytics] Ошибка при загрузке аналитики для курса ${courseId}:`, error)
    } finally {
      setAnalyticsLoading(prev => {
        const updated = { ...prev, [courseId]: false }
        console.log(`🏁 [Analytics] Загрузка завершена для курса ${courseId}`)
        return updated
      })
    }
  }, [analyticsLoading, courseAnalytics])

  // Загружаем аналитику для всех опубликованных курсов при загрузке
  useEffect(() => {
    if (courses.length === 0) return

    const publishedCourses = courses.filter(c => c.is_published)
    if (publishedCourses.length === 0) return

    // Загружаем аналитику для всех опубликованных курсов
    // Используем небольшую задержку между запросами, чтобы не перегружать сервер
    publishedCourses.forEach((course, index) => {
      // Загружаем аналитику только если она еще не загружена или загружена с ошибкой
      const existingData = courseAnalytics[course.id]
      const shouldLoad = !analyticsLoading[course.id] && (!existingData || existingData.success !== true)
      
      if (shouldLoad) {
        // Добавляем небольшую задержку между запросами (50ms на курс)
        setTimeout(() => {
        loadCourseAnalytics(course.id)
        }, index * 50)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]) // Загружаем только при изменении списка курсов (loadCourseAnalytics в зависимостях вызывает бесконечный цикл)

  const handleCreateCourse = () => {
    router.push("/course-constructor?mode=new")
  }

  const checkStreamLaunchStatus = async (courseId: string) => {
    try {
      const response = await fetch(`/api/stream-launch?courseId=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setStreamLaunchStatus((prev) => ({
          ...prev,
          [courseId]: { canLaunch: data.canLaunch, message: data.message },
        }))
      }
    } catch (error) {
      console.error("Error checking stream launch status:", error)
    }
  }

  const handleLaunchStream = async (courseId: string) => {
    try {
      setLaunchingStreams((prev) => ({ ...prev, [courseId]: true }))
      
      const response = await fetch("/api/stream-launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось запустить поток")
      }

      toast({
        title: "Поток запущен",
        description: data.message || "Доступ открыт для всех студентов",
      })

      // Обновляем статус запуска
      await checkStreamLaunchStatus(courseId)
    } catch (error) {
      console.error("Error launching stream:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось запустить поток",
        variant: "destructive",
      })
    } finally {
      setLaunchingStreams((prev) => ({ ...prev, [courseId]: false }))
    }
  }

  const handleRetry = () => {
    setProfileLoading(true)
    setStatsLoading(true)
    setCoursesLoading(true)
    setError(null)

    // Trigger re-render to restart data loading
    const loadData = async () => {
      if (!user) return

      try {
        const supabase = createClient()

        const [profileResult, authorCoursesResult] = await Promise.all([
          supabase
            .from("author_profiles")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("courses").select("*").eq("author_id", user.id).order("created_at", { ascending: false }),
        ])

        if (profileResult.error && profileResult.error.code !== "PGRST116") {
          throw profileResult.error
        }
        setProfile(profileResult.data)
        setProfileLoading(false)

        if (authorCoursesResult.error) throw authorCoursesResult.error
        
        // Получаем курсы автора
        const authorCourses = (authorCoursesResult.data || []).map((course: Course) => ({
          ...course,
          is_collaborator: false,
        }))

        // Получаем курсы соавтора (отдельным запросом)
        let collaboratorCourses: Course[] = []
        const { data: collaboratorIds, error: collaboratorIdsError } = await supabase
          .from("course_collaborators")
          .select("course_id")
          .eq("collaborator_user_id", user.id)

        if (!collaboratorIdsError && collaboratorIds && collaboratorIds.length > 0) {
          const courseIds = collaboratorIds.map((cc: any) => cc.course_id)
          const { data: collaboratorCoursesData, error: collaboratorCoursesError } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)
            .order("created_at", { ascending: false })

          if (!collaboratorCoursesError && collaboratorCoursesData) {
            collaboratorCourses = collaboratorCoursesData.map((course: Course) => ({
              ...course,
              is_collaborator: true,
            }))
          }
        }

        // Объединяем курсы, убираем дубликаты
        const allCoursesMap = new Map<string, Course>()
        authorCourses.forEach((course) => allCoursesMap.set(course.id, course))
        collaboratorCourses.forEach((course) => {
          if (!allCoursesMap.has(course.id)) {
            allCoursesMap.set(course.id, course)
          }
        })

        const coursesData = Array.from(allCoursesMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        setCourses(coursesData)
        setCoursesLoading(false)

        // Проверяем статус запуска для потоковых курсов
        for (const course of coursesData) {
          if (course.launch_mode === "stream" && course.is_published) {
            checkStreamLaunchStatus(course.id)
          }
        }

        const totalCourses = coursesData.length
        const publishedCourses = coursesData.filter((c) => c.is_published).length
        const publishedCourseIds = coursesData.filter((c) => c.is_published).map((c) => c.id)
        const streamCourses = coursesData.filter((c) => c.launch_mode === "stream" && c.is_published).length

        let totalStudents = 0
        let averageProgress = 0
        let totalPurchases = 0
        let purchasesWithFeedback = 0
        let totalRevenue = 0

        if (publishedCourseIds.length > 0) {
          // Получаем доступ студентов к курсам из CRM системы
          const { data: accessData, error: accessError } = await supabase
            .from("student_course_access")
            .select("student_id, progress")
            .in("course_id", publishedCourseIds)

          if (accessError) throw accessError

          // Подсчет уникальных студентов
          const uniqueStudents = new Set(accessData?.map(a => a.student_id) || [])
          totalStudents = uniqueStudents.size

          // Расчет среднего прогресса
          if (accessData && accessData.length > 0) {
            // Извлекаем прогресс из JSONB поля
            const progressValues = accessData
              .map(access => {
                if (!access.progress || typeof access.progress !== 'object') return 0
                
                // Проверяем разные форматы прогресса
                if (typeof access.progress.progress_percentage === 'number') {
                  return access.progress.progress_percentage
                }
                
                if (Array.isArray(access.progress.completed_lessons)) {
                  // Если есть информация о количестве уроков, можно рассчитать процент
                  // Пока просто возвращаем количество завершенных уроков
                  return access.progress.completed_lessons.length * 10 // Примерная оценка
                }
                
                // Подсчитываем завершенные уроки из объекта
                const completedCount = Object.keys(access.progress).filter(key => {
                  const lesson = access.progress[key]
                  return lesson && (lesson.completed === true || lesson.completed === 'true' || lesson.status === 'completed')
                }).length
                
                return completedCount * 10 // Примерная оценка
              })
              .filter(p => p > 0)
            
            if (progressValues.length > 0) {
              const totalProgress = progressValues.reduce((sum, p) => sum + p, 0)
              averageProgress = Math.round(totalProgress / progressValues.length)
              // Ограничиваем максимальное значение 100%
              averageProgress = Math.min(100, averageProgress)
            }
          }

          // Загружаем статистику покупок
          const { data: purchasesData, error: purchasesError } = await supabase
            .from("course_purchases")
            .select(`
              id,
              purchase_status,
              course_pricing (
                price,
                has_feedback
              )
            `)
            .in("course_id", publishedCourseIds)
            .eq("purchase_status", "completed")

          if (!purchasesError && purchasesData) {
            totalPurchases = purchasesData.length
            purchasesWithFeedback = purchasesData.filter(
              (p: any) => p.course_pricing?.has_feedback
            ).length

            // Рассчитываем доход из завершенных покупок
            totalRevenue = purchasesData.reduce((sum, purchase) => {
              // Обрабатываем случай, когда course_pricing отсутствует или null
              if (!purchase.course_pricing || purchase.course_pricing === null) {
                return sum
              }
              
              // Получаем цену и преобразуем в число
              const price = purchase.course_pricing.price
              if (price === null || price === undefined) {
                return sum
              }
              
              // Преобразуем в число (может быть строкой из DECIMAL)
              const priceNumber = typeof price === 'string' ? parseFloat(price) : Number(price)
              
              // Проверяем, что это валидное число
              if (isNaN(priceNumber) || priceNumber < 0) {
                return sum
              }
              
              return sum + priceNumber
            }, 0)
          }
        }

        const totalRevenueFormatted = formatRevenue(totalRevenue)

        setStats({
          totalStudents,
          totalCourses,
          publishedCourses,
          averageProgress,
          totalPurchases,
          purchasesWithFeedback,
          streamCourses,
          totalRevenue,
          totalRevenueFormatted,
        })
        setStatsLoading(false)
      } catch (err) {
        console.error("Error loading dashboard data:", err)
        setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке данных")
        setProfileLoading(false)
        setStatsLoading(false)
        setCoursesLoading(false)
      }
    }

    loadData()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))}
            </div>
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-32 w-full" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      <PageHeader
        title="Ваш личный кабинет"
        description="Управляйте своими курсами и отслеживайте прогресс учеников"
        breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Личный кабинет" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="secondary" className="flex items-center gap-2 h-12 px-6">
              <Link href="/students">
                <UsersIcon className="w-4 h-4" />
                Управление учениками
              </Link>
            </Button>
            <Button asChild variant="secondary" className="flex items-center gap-2 h-12 px-6">
              <Link href="/author-test">{profile ? "Результаты теста" : "Пройти тест автора"}</Link>
            </Button>
            <Button onClick={handleCreateCourse} className="flex items-center gap-2 h-12 px-6">
              Новый курс
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm" dangerouslySetInnerHTML={{ __html: error }} />
            <Button variant="ghost" onClick={handleRetry} className="mt-2 text-red-600">
              Попробовать снова
            </Button>
          </div>
        )}

        {/* Author Type Section */}
        {profileLoading ? (
          <div className="mb-8">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : profile ? (
          <div className="mb-8">
            <div className="bg-light-blue rounded-2xl p-6 sm:p-8 lg:p-10">
              <p className="text-xl lg:text-2xl text-slate-900 font-medium">
                <span className="font-semibold">Ваш тип:</span>{" "}
                <span className="text-primary font-bold">{profile.author_type}</span>
              </p>
              <Button asChild variant="text" className="text-primary p-0 h-auto font-semibold mt-2">
                <Link href="/author-test">Посмотрите рекомендации для своего типа автора</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-light-blue rounded-2xl p-6 sm:p-8 lg:p-10">
              <p className="text-xl lg:text-2xl text-slate-900 font-semibold">
                Пройдите тест, чтобы определить{" "}
                <Button asChild variant="text" className="text-primary p-0 h-auto font-semibold">
                  <Link href="/author-test">свой тип автора</Link>
                </Button>
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Link href="/students" className="block">
                <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-primary mb-2">Всего учеников</p>
                        <p className="text-3xl font-bold text-slate-900 group-hover:text-primary transition-colors">{stats.totalStudents}</p>
                      </div>
                      <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center group-hover:bg-primary-hover transition-colors">
                        <UserIcon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-2">Курсов создано</p>
                      <p className="text-3xl font-bold text-slate-900">{stats.totalCourses}</p>
                    </div>
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                      <BookOpenIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-2">Опубликовано</p>
                      <p className="text-3xl font-bold text-slate-900">{stats.publishedCourses}</p>
                    </div>
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                      <EyeIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-2">Средний прогресс</p>
                      <p className="text-3xl font-bold text-slate-900">{stats.averageProgress}%</p>
                    </div>
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                      <TrendingUpIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-2">Доход</p>
                      <p className="text-3xl font-bold text-slate-900">{stats.totalRevenueFormatted || "0 ₽"}</p>
                    </div>
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                      <BarChartIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl lg:text-3xl font-bold text-primary">Ваши курсы</h3>
            {!coursesLoading && courses.length > 0 && (
              <Button onClick={handleCreateCourse} variant="secondary" className="flex items-center gap-2 h-12 px-6">
                Создать курс
              </Button>
            )}
          </div>

          {coursesLoading ? (
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="text-center py-12 bg-white border-2 rounded-lg shadow-ruta-sm">
              <CardContent>
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpenIcon className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-xl font-bold text-primary mb-3">У вас пока нет созданных курсов</h4>
                <p className="text-slate-600 mb-8 text-base leading-relaxed max-w-md mx-auto">
                  Создайте первый курс с персонализированными подсказками под ваш стиль преподавания
                </p>
                <Button onClick={handleCreateCourse} className="flex items-center gap-2 mx-auto h-12 px-6">
                  Создать первый курс
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 sm:gap-8">
              {courses.map((course) => (
                <Card key={course.id} className="bg-white border-2 hover:border-primary/20 transition-colors cursor-pointer rounded-lg shadow-ruta-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg font-bold text-primary flex-1">
                        {course.title || "Без названия"}
                      </CardTitle>
                      {course.is_collaborator && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                          Соавтор
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm leading-relaxed text-slate-600">
                      {course.description || "Описание курса не добавлено"}
                    </CardDescription>
                    {course.launch_mode === "stream" && course.stream_start_date && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                        <ClockIcon className="w-3 h-3" />
                        <span>
                          Потоковый курс • Старт: {new Date(course.stream_start_date).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Кнопка запуска потока для потоковых курсов */}
                    {course.launch_mode === "stream" && course.is_published && streamLaunchStatus[course.id]?.canLaunch && (
                      <div className="mb-4">
                        <Button
                          onClick={() => handleLaunchStream(course.id)}
                          disabled={launchingStreams[course.id]}
                          className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                          size="sm"
                        >
                          {launchingStreams[course.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Запуск...
                            </>
                          ) : (
                            <>
                              <PlayIcon className="w-4 h-4" />
                              Запустить поток
                            </>
                          )}
                        </Button>
                        {streamLaunchStatus[course.id]?.message && (
                          <p className="text-xs text-slate-500 mt-1">{streamLaunchStatus[course.id].message}</p>
                        )}
                      </div>
                    )}

                    {/* Аналитика курса */}
                    {course.is_published && (
                      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        {(() => {
                          const analytics = courseAnalytics[course.id]
                          const isLoading = analyticsLoading[course.id]
                          
                          // Отладочная информация (можно убрать в продакшене)
                          if (process.env.NODE_ENV === 'development') {
                            console.log(`🔍 [UI] Рендер аналитики для курса ${course.id}:`, {
                              hasAnalytics: !!analytics,
                              success: analytics?.success,
                              isLoading,
                              totalLessons: analytics?.summary?.totalLessons,
                              courseTitle: analytics?.course?.title
                            })
                          }
                          
                          return isLoading ? (
                            <div className="space-y-2 py-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-16 w-full" />
                          </div>
                          ) : analytics && analytics.success === true ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
                                <BarChartIcon className="w-4 h-4" />
                                Аналитика курса
                                {analytics.course?.title && (
                                  <span className="text-xs font-normal text-slate-600 ml-1">
                                    ({analytics.course.title})
                                  </span>
                                )}
                              </h4>
                              <span className="text-xs text-slate-500">
                                {analytics.summary?.totalLessons ?? 0} уроков
                              </span>
                            </div>
                            
                            {/* Основные метрики */}
                            <div className="grid grid-cols-2 gap-2">
                              {/* Среднее количество просмотров */}
                              <div className="bg-white p-2 rounded border border-slate-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <EyeIcon className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs text-slate-600">Просмотры</span>
                                </div>
                                <p className="text-lg font-bold text-primary">
                                  {analytics.summary?.averageViews ?? 0}
                                </p>
                                <p className="text-xs text-slate-500">среднее по урокам</p>
                              </div>

                              {/* Среднее время изучения */}
                              <div className="bg-white p-2 rounded border border-slate-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <ClockIcon className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs text-slate-600">Время</span>
                                </div>
                                <p className="text-lg font-bold text-primary">
                                  {analytics.summary?.averageTimeSpentFormatted ?? '0с'}
                                </p>
                                <p className="text-xs text-slate-500">среднее изучение</p>
                              </div>
                            </div>

                            {/* Повторные просмотры */}
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <RepeatIcon className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs text-slate-600">Повторные просмотры</span>
                                </div>
                                <p className="text-sm font-bold text-primary">
                                  {analytics.summary?.totalRepeatViews ?? 0}
                                </p>
                              </div>
                            </div>

                            {/* Прогресс по блокам (визуализация) */}
                            {analytics.lessons && analytics.lessons.length > 0 && (
                              <div className="bg-white p-2 rounded border border-slate-200">
                                <div className="flex items-center gap-1 mb-2">
                                  <TrendingUpIcon className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs text-slate-600 font-semibold">Прогресс по блокам</span>
                                </div>
                                <div className="space-y-1">
                                  {analytics.lessons.slice(0, 3).map((lesson: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-slate-700 truncate flex-1" title={lesson.lesson_title}>
                                          {lesson.lesson_title || `Урок ${idx + 1}`}
                                        </span>
                                        <span className="text-slate-500 ml-2">
                                          {lesson.unique_students ?? 0} учеников
                                        </span>
                                      </div>
                                      {lesson.blocks && lesson.blocks.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                          {lesson.blocks.slice(0, 5).map((block: any, blockIdx: number) => (
                                            <div
                                              key={blockIdx}
                                              className="h-2 flex-1 rounded"
                                              style={{
                                                backgroundColor: block.students_completed > 0
                                                  ? `rgba(101, 154, 184, ${Math.min(1, block.students_completed / Math.max(1, analytics.summary?.totalUniqueStudents ?? 1))})`
                                                  : '#e2e8f0'
                                              }}
                                              title={`${block.block_type}: ${block.students_completed} учеников`}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <Button
                              onClick={() => loadCourseAnalytics(course.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={analyticsLoading[course.id]}
                            >
                              {analyticsLoading[course.id] ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1 inline-block"></div>
                                  Загрузка...
                                </>
                              ) : (
                                <>
                                  <BarChartIcon className="w-3 h-3 mr-1 inline-block" />
                                  Загрузить аналитику
                                </>
                              )}
                            </Button>
                          </div>
                          )
                        })()}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/course-constructor?courseId=${course.id}`}>Редактировать</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                          <Link href={`/course/${course.id}/adaptation`}>
                            <EditIcon className="w-3 h-3" />
                            Адаптация
                          </Link>
                        </Button>
                        {course.is_published && (
                          <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                            <Link href="/students">
                              <UsersIcon className="w-3 h-3" />
                              Ученики
                            </Link>
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          course.is_published 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {course.is_published ? "Опубликован" : "Черновик"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
