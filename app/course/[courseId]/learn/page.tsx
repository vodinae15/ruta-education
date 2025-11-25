"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { BookOpenIcon, CheckCircleIcon, PlayIcon, ArrowRightIcon, ArrowLeftIcon, UserIcon, MessageCircleIcon, StarIcon, LightbulbIcon, LockIcon } from "@/components/ui/icons"
import { UnifiedAdaptation } from "@/components/ui/unified-adaptation"
import { AdaptationModeSwitcher } from "@/components/ui/adaptation-mode-switcher"
import { CourseAccessStatus } from "@/components/ui/course-access-status"
import { checkCourseAccess } from "@/lib/course-access-check"
import { Textarea } from "@/components/ui/textarea"
import { StudentNotesManager } from "@/components/ui/student-notes-manager"
import { AdaptationMode, AdaptationContent, AdaptationType, normalizeStudentType } from "@/lib/adaptation-logic"

export default function StudentLearningPage({ params }: { params: { courseId: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [studentSession, setStudentSession] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [currentLesson, setCurrentLesson] = useState(0)
  const [loading, setLoading] = useState(true)
  const [adaptedContent, setAdaptedContent] = useState<AdaptationContent | null>(null)
  const [originalContent, setOriginalContent] = useState<{
    blocks: Array<{
      title: string
      content: string
      type: string
    }>
  } | null>(null)
  const [adaptationLoading, setAdaptationLoading] = useState(false)
  // По умолчанию устанавливаем 'visual' вместо 'original', чтобы показывать адаптированную версию
  const [currentMode, setCurrentMode] = useState<AdaptationMode>('visual')
  const [materialsAnalysis, setMaterialsAnalysis] = useState<any>(null)
  const [accessCheck, setAccessCheck] = useState<{
    hasAccess: boolean
    accessStatus: "granted" | "pending" | "denied"
    accessMessage: string
    launchMode: string | null
    streamStartDate: string | null
  } | null>(null)
  const [purchaseInfo, setPurchaseInfo] = useState<{
    hasFeedback: boolean
    bonusContent: string | null
    pricingName: string | null
  } | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [notesModalOpen, setNotesModalOpen] = useState(false)

  useEffect(() => {
    checkAuthentication()
  }, [params.courseId])

  // Загрузка режима из localStorage при инициализации
  useEffect(() => {
    if (studentSession?.student_type) {
      const savedMode = localStorage.getItem(`adaptation_mode_${params.courseId}`)
      if (savedMode && ['visual', 'auditory', 'kinesthetic', 'original'].includes(savedMode)) {
        setCurrentMode(savedMode as AdaptationMode)
      } else {
        // Устанавливаем режим на основе режима представления материала
        const normalizedType = normalizeStudentType(studentSession.student_type)
        // Если нормализованный тип не 'original', используем его, иначе используем 'visual' по умолчанию
        setCurrentMode(normalizedType !== 'original' ? normalizedType : 'visual')
      }
    } else {
      // Если student_type не определен, проверяем сохраненный режим или используем 'visual' по умолчанию
      const savedMode = localStorage.getItem(`adaptation_mode_${params.courseId}`)
      if (savedMode && ['visual', 'auditory', 'kinesthetic', 'original'].includes(savedMode)) {
        setCurrentMode(savedMode as AdaptationMode)
      } else {
        // По умолчанию используем 'visual' для показа адаптированной версии
        setCurrentMode('visual')
      }
    }
  }, [studentSession, params.courseId])

  // Сохранение режима в localStorage при изменении
  useEffect(() => {
    if (currentMode) {
      localStorage.setItem(`adaptation_mode_${params.courseId}`, currentMode)
    }
  }, [currentMode, params.courseId])

  // Загрузка адаптации из БД
  const loadAdaptationForLesson = useCallback(async (lessonData: any) => {
    if (!lessonData?.id) return

    // Если режим "Оригинал", не загружаем адаптацию
    if (currentMode === 'original') {
      setAdaptedContent(null)
      setAdaptationLoading(false)
      return
    }

    setAdaptationLoading(true)
    try {
      // Важно: передаем courseId, так как API требует его для поиска адаптации
      const response = await fetch(`/api/lesson-adaptation?lessonId=${lessonData.id}&courseId=${params.courseId}&type=${currentMode}&includeUnpublished=false`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📥 [Learn] Получена адаптация:", {
          success: data.success,
          hasAdaptation: !!data.adaptation,
          status: data.adaptation?.status,
          type: currentMode,
          lessonId: lessonData.id
        })
        
        if (data.adaptation && data.adaptation.status === 'published') {
          // Преобразуем структуру данных адаптации
          const adaptationContent: AdaptationContent = {
            block1: data.adaptation.block1,
            block2: data.adaptation.block2,
            block3: data.adaptation.block3,
            block4: data.adaptation.block4,
            block5: data.adaptation.block5
          }
          setAdaptedContent(adaptationContent)
          console.log("✅ [Learn] Адаптация загружена и установлена:", {
            hasBlock1: !!adaptationContent.block1,
            hasBlock2: !!adaptationContent.block2,
            hasBlock3: !!adaptationContent.block3,
            hasBlock4: !!adaptationContent.block4,
            hasBlock5: !!adaptationContent.block5
          })
        } else {
          // Адаптация не опубликована или не найдена
          console.log("⚠️ [Learn] Адаптация не опубликована или не найдена:", {
            hasAdaptation: !!data.adaptation,
            status: data.adaptation?.status
          })
          setAdaptedContent(null)
        }
      } else if (response.status === 404) {
        // Адаптация не найдена - это нормально, показываем оригинальный контент
        console.log("⚠️ [Learn] Адаптация не найдена (404)")
        setAdaptedContent(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ [Learn] Ошибка загрузки адаптации:", {
          status: response.status,
          error: errorData
        })
        setAdaptedContent(null)
      }
    } catch (error) {
      console.error("Error loading adaptation:", error)
      setAdaptedContent(null)
    } finally {
      setAdaptationLoading(false)
    }

    // Метаданные материалов загружаются в loadOriginalContentForLesson для избежания дублирования
  }, [currentMode, params.courseId])

  // Загрузка оригинального контента урока
  const loadOriginalContentForLesson = useCallback(async (lessonData: any) => {
    if (!lessonData?.id) return

    try {
      const { data: lessonDataFromDB, error: lessonError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("id", lessonData.id)
        .single()

      if (lessonError || !lessonDataFromDB) {
        // Используем данные из lessonData, если загрузка из БД не удалась
        const originalContent = {
          blocks: (lessonData.blocks || []).map((block: any, index: number) => ({
            title: block.title || `Блок ${index + 1}`,
            content: block.content || block.text || "",
            type: block.type || "text",
            // Включаем элементы блока (тесты, практические задания и т.д.)
            elements: block.elements || []
          }))
        }
        setOriginalContent(originalContent)
        return
      }

      // Преобразуем блоки урока в формат оригинального контента
      const originalContent = {
        blocks: (lessonDataFromDB.blocks || []).map((block: any, index: number) => ({
          title: block.title || `Блок ${index + 1}`,
          content: block.content || block.text || "",
          type: block.type || "text",
          // Включаем элементы блока (тесты, практические задания и т.д.)
          elements: block.elements || []
        }))
      }
      setOriginalContent(originalContent)

      // Загружаем метаданные материалов
      try {
        const metadataResponse = await fetch(`/api/lesson-materials?lessonId=${lessonData.id}`)
        if (metadataResponse.ok) {
          const metadataData = await metadataResponse.json()
          setMaterialsAnalysis(metadataData.analysis)
        }
      } catch (error) {
        console.error("Error loading materials analysis:", error)
      }
    } catch (error) {
      console.error("Error loading original content:", error)
      // Используем данные из lessonData как fallback
      const originalContent = {
        blocks: (lessonData.blocks || []).map((block: any, index: number) => ({
          title: block.title || `Блок ${index + 1}`,
          content: block.content || block.text || "",
          type: block.type || "text",
          // Включаем элементы блока (тесты, практические задания и т.д.)
          elements: block.elements || []
        }))
      }
      setOriginalContent(originalContent)
    }
  }, [supabase])

  useEffect(() => {
    // Убеждаемся, что все необходимые данные загружены перед загрузкой адаптации
    if (lessons.length > 0 && studentSession && currentLesson !== null && currentMode && lessons[currentLesson]?.id) {
      const currentLessonData = lessons[currentLesson]
      if (currentLessonData && currentLessonData.id) {
        console.log("🔄 [Learn] Загрузка адаптации для урока:", {
          lessonId: currentLessonData.id,
          lessonTitle: currentLessonData.title,
          mode: currentMode,
          courseId: params.courseId
        })
        loadAdaptationForLesson(currentLessonData)
        loadOriginalContentForLesson(currentLessonData)
      }
    }
  }, [lessons, studentSession, currentLesson, currentMode, loadAdaptationForLesson, loadOriginalContentForLesson, params.courseId])

  // Функция для получения русского названия режима представления материала
  const getPresentationModeInRussian = (studentType: string): string => {
    const typeMap: Record<string, string> = {
      'visual': 'Визуал',
      'auditory': 'Аудиал', 
      'kinesthetic': 'Кинестетик',
      'visual-analytical': 'Визуал-Аналитик',
      'auditory-empathetic': 'Аудиал-Эмпат',
      'kinesthetic-practical': 'Кинестетик-Практик',
      'visual-empathetic': 'Визуал-Эмпат',
      'auditory-practical': 'Аудиал-Практик',
      'balanced': 'Универсальный ученик'
    }
    return typeMap[studentType] || studentType
  }

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push("/auth")
        return
      }

      // Проверяем, что пользователь является студентом
      if (user.user_metadata?.user_type !== "student") {
        router.push("/dashboard")
        return
      }

      // Проверяем доступ к курсу
      const accessResult = await checkCourseAccess(params.courseId, user.email!)
      if (accessResult) {
        setAccessCheck({
          hasAccess: accessResult.hasAccess,
          accessStatus: accessResult.accessStatus,
          accessMessage: accessResult.accessMessage,
          launchMode: accessResult.course.launch_mode,
          streamStartDate: accessResult.course.stream_start_date,
        })

        // Если нет доступа, не загружаем данные курса
        if (!accessResult.hasAccess && accessResult.accessStatus === "denied") {
          setLoading(false)
          return
        }
      }

      await loadCourseData()
    } catch (err) {
      console.error("Error checking authentication:", err)
      router.push("/auth")
    }
  }

  // Проверка доступности урока: все адаптации должны быть опубликованы
  const checkLessonAccessibility = (lesson: any): {
    isAccessible: boolean
    unpublishedTypes: string[]
  } => {
    const adaptations = lesson.lesson_adaptations || []
    const requiredTypes = ['visual', 'auditory', 'kinesthetic', 'original']

    const unpublishedTypes: string[] = []

    for (const type of requiredTypes) {
      const adaptation = adaptations.find((a: any) => a.adaptation_type === type)
      if (!adaptation || adaptation.status !== 'published') {
        unpublishedTypes.push(type)
      }
    }

    return {
      isAccessible: unpublishedTypes.length === 0,
      unpublishedTypes
    }
  }

  const loadCourseData = async () => {
    try {
      setLoading(true)

      // Загружаем курс
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", params.courseId)
        .single()

      if (courseError || !courseData) {
        console.error("Error loading course:", courseError)
        router.push("/student-dashboard")
        return
      }

      setCourse(courseData)

      // Загружаем уроки курса из поля modules.lessons
      console.log("📚 Course data structure:", courseData)
      
      let lessons = []
      
      // Проверяем поле modules.lessons
      if (courseData.modules?.lessons && Array.isArray(courseData.modules.lessons)) {
        lessons = courseData.modules.lessons
        console.log("📚 Loading lessons from modules.lessons:", lessons)
      }
      // Fallback: проверяем course_data.lessons
      else if (courseData.course_data?.lessons && Array.isArray(courseData.course_data.lessons)) {
        lessons = courseData.course_data.lessons
        console.log("📚 Loading lessons from course_data.lessons:", lessons)
      }
      // Fallback: проверяем course_data.blocks (но это блоки, не уроки)
      else if (courseData.course_data?.blocks && Array.isArray(courseData.course_data.blocks)) {
        console.log("⚠️ Found blocks instead of lessons, this is incorrect structure")
        // Не загружаем блоки как уроки - это неправильно
        lessons = []
      }
      // Fallback: проверяем отдельную таблицу course_lessons
      else {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .select(`
            *,
            lesson_adaptations(
              id,
              adaptation_type,
              status
            )
          `)
          .eq("course_id", params.courseId)
          .eq("is_published", true) // Студенты видят только опубликованные уроки
          .order("order_index")

        if (!lessonsError && lessonsData) {
          lessons = lessonsData
          console.log("📚 Loading lessons from course_lessons table with adaptations:", lessons)
        }
      }

      console.log("📊 Final lessons count:", lessons.length)
      setLessons(lessons)

      // Загружаем сессию студента
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("email", user.email)
        .single()

      if (studentError || !student) {
        console.error("Error loading student:", studentError)
        router.push("/student-dashboard")
        return
      }

      // Сохраняем ID студента для заметок
      setStudentId(student.id)

      // Проверяем доступ (бесплатный или платный)
      const { data: freeAccess } = await supabase
        .from("student_course_access")
        .select("*")
        .eq("student_id", student.id)
        .eq("course_id", params.courseId)
        .maybeSingle()

      // Загружаем информацию о покупках и тарифах
      let hasFeedback = false
      let bonusContent: string | null = null
      let pricingName: string | null = null

      // Проверяем покупки (даже если есть бесплатный доступ, покупки могут давать дополнительные возможности)
      const { data: purchases, error: purchasesError } = await supabase
        .from("course_purchases")
        .select(`
          *,
          course_pricing (
            id,
            name,
            has_feedback,
            bonus_content
          )
        `)
        .eq("student_id", student.id)
        .eq("course_id", params.courseId)
        .eq("purchase_status", "completed")

      // Обрабатываем ошибку загрузки покупок (не критично, просто логируем)
      if (purchasesError) {
        console.error("Error loading purchases:", purchasesError)
        // Продолжаем выполнение, так как ошибка не критична
      }

      // Если нет бесплатного доступа и нет покупок, редирект на страницу тарифов
      if (!freeAccess && (!purchases || purchases.length === 0)) {
        router.push(`/course/${params.courseId}/pricing`)
        return
      }

      // Получаем информацию о тарифе из покупки (если есть покупки)
      if (purchases && purchases.length > 0) {
        // Приоритет: тариф с has_feedback или bonus_content, иначе первая покупка
        let selectedPurchase = purchases[0]
        for (const purchase of purchases) {
          if (purchase?.course_pricing) {
            // Обрабатываем случай, когда course_pricing может быть массивом или объектом
            const pricing = Array.isArray(purchase.course_pricing) 
              ? purchase.course_pricing[0] 
              : purchase.course_pricing
            
            if (pricing && (pricing.has_feedback || pricing.bonus_content)) {
              selectedPurchase = purchase
              break
            }
          }
        }

        // Извлекаем данные из выбранной покупки
        if (selectedPurchase?.course_pricing) {
          // Обрабатываем случай, когда course_pricing может быть массивом или объектом
          const pricing = Array.isArray(selectedPurchase.course_pricing) 
            ? selectedPurchase.course_pricing[0] 
            : selectedPurchase.course_pricing
          
          if (pricing) {
            hasFeedback = pricing.has_feedback || false
            bonusContent = pricing.bonus_content || null
            pricingName = pricing.name || null
          }
        }
      }

      // Сохраняем информацию о тарифе
      setPurchaseInfo({
        hasFeedback,
        bonusContent,
        pricingName,
      })

      // Используем freeAccess как сессию (или создаем виртуальную сессию из покупки)
      const session = freeAccess || {
        student_id: student.id,
        course_id: params.courseId,
        progress: {},
        first_accessed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      }

      // Объединяем данные студента с сессией, чтобы получить режим представления материала
      const studentSessionWithType = {
        ...session,
        student_type: student.student_type || session.student_type
      }

      console.log("🎯 Student session with type:", studentSessionWithType)
      setStudentSession(studentSessionWithType)
    } catch (err) {
      console.error("Error loading course data:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64 bg-gray-200" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-8 w-full bg-gray-200" />
                <Card className="p-6 bg-white border border-[#E5E7EB]">
                  <Skeleton className="h-6 w-48 mb-4 bg-gray-200" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-200" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-200" />
                  <Skeleton className="h-4 w-3/4 bg-gray-200" />
                </Card>
              </div>
              <div className="space-y-4">
                <Card className="p-6 bg-white border border-[#E5E7EB]">
                  <Skeleton className="h-6 w-32 mb-4 bg-gray-200" />
                  <Skeleton className="h-20 w-full bg-gray-200" />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return null
  }

  // Показываем статус доступа, если нет доступа или ожидание
  if (accessCheck && !accessCheck.hasAccess) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b-2 border-[#E5E7EB]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[#111827]">{course.title}</h1>
                <p className="text-lg text-[#4B5563] mt-1">Курс</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <CourseAccessStatus
            accessStatus={accessCheck.accessStatus}
            accessMessage={accessCheck.accessMessage}
            courseId={params.courseId}
            launchMode={accessCheck.launchMode}
            streamStartDate={accessCheck.streamStartDate}
          />
        </div>
      </div>
    )
  }

  if (!studentSession) {
    return null
  }

  if (lessons.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <div className="bg-white border-b border-[#E5E7EB]">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#659AB8]">{course.title}</h1>
                <p className="text-sm text-[#4B5563]">Курс</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/student-dashboard")}
                  className="flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  Профиль
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8">
          <Card className="border-0">
            <CardContent className="text-center py-12">
              <BookOpenIcon className="w-16 h-16 text-[#659AB8] mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-[#111827] mb-2">
                Уроки курса не найдены
              </h2>
              <p className="text-[#4B5563] mb-6">
                В этом курсе пока нет уроков. Обратитесь к преподавателю для получения доступа к контенту.
              </p>
              <Button
                onClick={() => router.push("/student-dashboard")}
                className="bg-[#659AB8] hover:bg-[#5589a7] text-white"
              >
                Вернуться в профиль
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentLessonData = lessons[currentLesson]
  const completedLessons = studentSession.progress?.completed_lessons || []
  const progress = lessons.length > 0 ? (completedLessons.length / lessons.length) * 100 : 0

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b-2 border-[#E5E7EB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111827]">{course.title}</h1>
              <p className="text-lg text-[#4B5563] mt-1">
                Урок {currentLesson + 1} из {lessons.length}
              </p>
            </div>
            <div className="flex flex-col items-end gap-4">
              {/* Кнопка дашборда - выводим над переключателем */}
              <button
                onClick={() => router.push("/student-dashboard")}
                className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                Профиль
              </button>
              {/* Переключатель режимов адаптации */}
              {studentSession?.student_type && (
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-sm text-[#4B5563] font-medium">Режим:</span>
                  <AdaptationModeSwitcher
                    currentMode={currentMode}
                    onModeChange={(mode) => {
                      setCurrentMode(mode)
                      // Загружаем адаптацию для нового режима
                      if (mode !== 'original' && currentLessonData) {
                        loadAdaptationForLesson(currentLessonData)
                      }
                    }}
                    availableModes={['visual', 'auditory', 'kinesthetic', 'original']}
                    studentType={studentSession.student_type}
                    showTooltips={true}
                    className="flex-shrink-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="lg:col-span-1">
            <Card className="border-2 border-[#E5E7EB] rounded-lg sticky top-8">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-bold text-[#111827]">
                  Уроки курса
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-[#4B5563]">
                    <span>Прогресс</span>
                    <span className="font-medium text-[#659AB8]">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3 bg-[#E5E7EB]" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-6">
                  {lessons.map((lesson: any, index: number) => {
                    const isCompleted = completedLessons.includes(index)
                    const isCurrent = index === currentLesson
                    const { isAccessible, unpublishedTypes } = checkLessonAccessibility(lesson)

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (!isAccessible) {
                            // Блокируем переход к неопубликованному уроку
                            return
                          }
                          setCurrentLesson(index)
                        }}
                        disabled={!isAccessible}
                        className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                          !isAccessible
                            ? "bg-[#E5E7EB] text-[#4B5563] border-2 border-[#E5E7EB] cursor-not-allowed opacity-60"
                            : isCurrent
                            ? "bg-[#659AB8] text-white"
                            : isCompleted
                            ? "bg-[#E8F4FA] text-[#5589a7] border-2 border-[#659AB8] hover:border-[#5589a7]"
                            : "bg-[#E8F4FA] text-[#111827] border-2 border-[#E5E7EB] hover:border-[#659AB8]/40 hover:bg-[#E5E7EB]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {!isAccessible ? (
                            <LockIcon className="w-5 h-5 text-[#4B5563] opacity-50" />
                          ) : isCompleted ? (
                            <CheckCircleIcon className="w-5 h-5 text-[#659AB8]" />
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full border-2 ${
                                isCurrent
                                  ? "border-white"
                                  : "border-[#E5E7EB]"
                              }`}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{lesson.title}</div>
                              {!isAccessible && (
                                <Badge variant="secondary" className="bg-[#FDF8F3] border border-[#E5E7EB] text-[#4B5563] text-xs">
                                  Скоро
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs opacity-75">
                              {!isAccessible
                                ? "Адаптация в процессе"
                                : `${lesson.blocks?.length || 0} блоков`
                              }
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {currentLessonData && (
              <Card className="border-2 border-[#E5E7EB] rounded-lg">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-[#111827]">
                        {currentLessonData.title}
                      </h2>
                      {currentLessonData.description && (
                        <p className="text-lg text-[#4B5563] mt-2 font-medium">{currentLessonData.description}</p>
                      )}
                    </div>
                    <Badge
                      className={`border-2 ${
                        currentLesson === 0
                          ? "bg-[#659AB8] text-white border-[#659AB8]"
                          : completedLessons.includes(currentLesson)
                          ? "bg-[#E8F4FA] text-[#5589a7] border-[#659AB8]"
                          : "bg-[#E8F4FA] text-[#659AB8] border-[#659AB8]"
                      }`}
                    >
                      {currentLesson === 0
                        ? "Начальный"
                        : completedLessons.includes(currentLesson)
                        ? "Завершен"
                        : "В процессе"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Проверка: если адаптация не опубликована, показываем "Скоро" для всех режимов */}
                    {!adaptedContent && !adaptationLoading ? (
                      <div className="py-12 text-center">
                        <div className="max-w-md mx-auto">
                          <BookOpenIcon className="w-16 h-16 text-[#659AB8] mx-auto mb-4 opacity-50" />
                          <h3 className="text-2xl font-bold text-[#111827] mb-3">
                            Урок скоро появится
                          </h3>
                          <p className="text-[#4B5563] mb-6">
                            {currentMode === 'original'
                              ? 'Автор курса работает над адаптацией этого урока.'
                              : `Автор курса работает над адаптацией этого урока для режима "${currentMode === 'visual' ? 'Визуал' : currentMode === 'auditory' ? 'Аудиал' : 'Кинестетик'}".`
                            }
                          </p>
                          <div className="bg-[#E8F4FA] border-2 border-[#E5E7EB] rounded-lg p-4">
                            <p className="text-sm text-[#4B5563]">
                              Пожалуйста, вернитесь позже или попробуйте переключить режим отображения выше.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Переключатель режимов для мобильных устройств */}
                        {studentSession?.student_type && (
                          <div className="sm:hidden mb-4">
                            <div className="flex flex-col gap-2 p-3 bg-[#E8F4FA] rounded-lg border border-[#E5E7EB]">
                              <span className="text-sm font-medium text-[#111827]">Режим отображения:</span>
                              <AdaptationModeSwitcher
                                currentMode={currentMode}
                                onModeChange={(mode) => {
                                  setCurrentMode(mode)
                                  // Загружаем адаптацию для нового режима
                                  if (mode !== 'original' && currentLessonData) {
                                    loadAdaptationForLesson(currentLessonData)
                                  }
                                }}
                                availableModes={['visual', 'auditory', 'kinesthetic', 'original']}
                                studentType={studentSession.student_type}
                                showTooltips={true}
                              />
                            </div>
                          </div>
                        )}

                        {/* Упрощенная подсказка о текущем режиме */}
                        {studentSession?.student_type && (
                          <div className="bg-[#E8F4FA] border border-[#E5E7EB] rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <LightbulbIcon className="w-4 h-4 text-[#5589a7] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs text-[#4B5563]">
                                  {currentMode === 'visual' && "💡 Вы в визуальном режиме: схемы, диаграммы и структурированная информация."}
                                  {currentMode === 'auditory' && "💡 Вы в аудиальном режиме: истории, диалоги и эмоциональные примеры."}
                                  {currentMode === 'kinesthetic' && "💡 Вы в кинестетическом режиме: практические задания и интерактивные элементы."}
                                  {currentMode === 'original' && "💡 Вы в режиме оригинала: контент так, как его создал автор."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Отображение контента */}
                        {adaptationLoading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-8 w-64" />
                            <Card className="p-6">
                              <Skeleton className="h-6 w-48 mb-4" />
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-3/4 mb-4" />
                              <Skeleton className="h-32 w-full" />
                            </Card>
                            <Card className="p-6">
                              <Skeleton className="h-6 w-40 mb-4" />
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-5/6" />
                            </Card>
                          </div>
                        ) : (
                          <div className="bg-white border-2 border-[#659AB8]/20 rounded-lg p-6">
                            <UnifiedAdaptation
                              mode={currentMode}
                              lessonTitle={currentLessonData.title}
                              adaptedContent={currentMode !== 'original' ? (adaptedContent || undefined) : undefined}
                              originalContent={originalContent || undefined}
                              isStudent={true}
                              courseId={params.courseId}
                              lessonId={currentLessonData.id}
                              lessonBlocks={currentLessonData.blocks || []}
                              materialsAnalysis={materialsAnalysis}
                              studentType={studentSession?.student_type}
                              onProgressUpdate={(progress, completedBlocks) => {
                                console.log("Progress updated:", progress, completedBlocks)
                              }}
                              onSaveProgress={async (progressData) => {
                                try {
                                  const currentLessonData = lessons[currentLesson]
                                  if (!currentLessonData) return

                                  const response = await fetch("/api/save-progress", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      courseId: params.courseId,
                                      lessonId: currentLessonData.id || currentLesson.toString(),
                                      progressData: {
                                        completedBlocks: progressData.completedBlocks || [],
                                        testResults: progressData.testResults || {},
                                        lastUpdated: new Date().toISOString(),
                                      },
                                      timeSpent: progressData.timeSpent || 0,
                                    }),
                                  })

                                  if (!response.ok) {
                                    const error = await response.json()
                                    console.error("Error saving progress:", error)
                                    return
                                  }

                                  const result = await response.json()
                                  console.log("✅ Progress saved:", result)

                                  // Обновляем сессию студента, если нужно
                                  if (studentSession) {
                                    const updatedSession = {
                                      ...studentSession,
                                      progress: {
                                        ...studentSession.progress,
                                        [currentLessonData.id || currentLesson.toString()]: {
                                          completedBlocks: progressData.completedBlocks || [],
                                          testResults: progressData.testResults || {},
                                          lastUpdated: new Date().toISOString(),
                                        }
                                      }
                                    }
                                    setStudentSession(updatedSession)
                                  }
                                } catch (error) {
                                  console.error("Error saving progress:", error)
                                }
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Бонусный контент (отображается как заметка от автора) */}
            {purchaseInfo?.bonusContent && (
              <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white rounded-lg mt-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                      <StarIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827]">Бонусные материалы</h3>
                      <p className="text-sm text-[#4B5563]">Дополнительный контент от автора</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-[#659AB8]/5 border-2 border-[#659AB8]/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-[#659AB8] text-white text-xs">Автор курса</Badge>
                    </div>
                    <div className="text-[#111827] whitespace-pre-wrap leading-relaxed">
                      {purchaseInfo.bonusContent}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Компонент для обмена заметками (если тариф с обратной связью) */}
            {purchaseInfo?.hasFeedback && studentId && (
              <Card className="border-2 border-[#659AB8]/30 bg-white rounded-lg mt-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#659AB8] flex items-center justify-center">
                        <MessageCircleIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#111827]">Обратная связь с автором</h3>
                        <p className="text-sm text-[#4B5563]">Обменивайтесь заметками с автором курса</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setNotesModalOpen(true)}
                      className="bg-[#659AB8] hover:bg-[#659AB8]-hover text-white"
                    >
                      <MessageCircleIcon className="w-4 h-4 mr-2" />
                      Открыть заметки
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-light-blue/30 border border-[#659AB8]/20 rounded-lg">
                    <p className="text-sm text-[#111827] mb-3">
                      {purchaseInfo.pricingName 
                        ? `Вы приобрели тариф "${purchaseInfo.pricingName}" с обратной связью от автора.`
                        : "Вы приобрели тариф с обратной связью от автора."
                      }
                    </p>
                    <p className="text-sm text-[#4B5563]">
                      Нажмите на кнопку "Открыть заметки", чтобы начать обмен сообщениями с автором курса.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between pt-6 border-t-2 border-[#E5E7EB]">
              <Button
                variant="secondary"
                onClick={() => setCurrentLesson(Math.max(0, currentLesson - 1))}
                disabled={currentLesson === 0}
                className="flex items-center gap-2 border-2 border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8] hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Предыдущий урок
              </Button>

              {currentLesson < lessons.length - 1 ? (
                <Button
                  onClick={() => setCurrentLesson(currentLesson + 1)}
                  className="flex items-center gap-2 bg-[#659AB8] hover:bg-[#5589a7] text-white border-2 border-[#659AB8] transition-colors"
                >
                  Следующий урок
                  <ArrowRightIcon className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => router.push("/student-dashboard")}
                  className="flex items-center gap-2 bg-[#659AB8] hover:bg-[#5589a7] text-white border-2 border-[#659AB8] transition-colors"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  Завершить курс
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно для заметок */}
      {studentId && (
        <StudentNotesManager
          studentId={studentId}
          courseId={params.courseId}
          isOpen={notesModalOpen}
          onClose={() => setNotesModalOpen(false)}
        />
      )}
    </div>
  )
}
