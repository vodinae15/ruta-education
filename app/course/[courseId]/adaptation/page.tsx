"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { MainNavigation } from "@/components/ui/main-navigation"
import { Progress } from "@/components/ui/progress"
import {
  EyeIcon,
  EarIcon,
  HandIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ClockIcon,
  BookOpenIcon,
  XIcon
} from "@/components/ui/icons"
import { UnifiedAdaptation } from "@/components/ui/unified-adaptation"
import { AdaptationModeSwitcher } from "@/components/ui/adaptation-mode-switcher"
import { AdaptationEditor } from "@/components/ui/adaptation-editor"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { AdaptationMode, AdaptationContent, AdaptationType, getMissingMaterialsForAdaptationType, MaterialsAnalysis } from "@/lib/adaptation-logic"
import { AuthorMaterialHints } from "@/components/ui/author-material-hints"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface Course {
  id: string
  title: string
  description: string | null
  status: string
  author_id: string
  course_data?: {
    blocks: any[]
  }
}

interface Lesson {
  id: string
  title: string
  description?: string
  blocks: Array<{
    title: string
    content: string
    type: string
    elements?: Array<{
      id: string
      type: string
      content: string
      required?: boolean
      completed?: boolean
    }>
  }>
  materials?: string[]
  tests?: string[]
}

interface AdaptationResult {
  studentType: AdaptationType
  content?: AdaptationContent
  originalContent?: {
    blocks: Array<{
      title: string
      content: string
      type: string
    }>
  }
  progress: number
  status: 'pending' | 'processing' | 'completed' | 'error' | 'published'
  metadata?: {
    has_audio: boolean
    has_video: boolean
    has_images: boolean
    has_practice: boolean
    recommendations: Array<{
      type: string
      message: string
      priority?: 'low' | 'medium' | 'high'
    }>
  }
}

interface StudentType {
  id: 'visual' | 'auditory' | 'kinesthetic' | 'original'
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

const STUDENT_TYPES: StudentType[] = [
  {
    id: 'original',
    name: 'Оригинал',
    description: 'Оригинальный контент автора, отформатированный для удобного чтения',
    icon: <BookOpenIcon className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-900 border border-amber-200'
  },
  {
    id: 'visual',
    name: 'Визуал',
    description: 'Любит схемы, диаграммы, структурированную информацию',
    icon: <EyeIcon className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-900 border border-amber-200'
  },
  {
    id: 'auditory',
    name: 'Аудиал',
    description: 'Любит истории, диалоги, эмоциональные примеры',
    icon: <EarIcon className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-900 border border-amber-200'
  },
  {
    id: 'kinesthetic',
    name: 'Кинестетик',
    description: 'Любит практику, действия, интерактивные элементы',
    icon: <HandIcon className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-900 border border-amber-200'
  }
]

export default function CourseAdaptationPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [adaptations, setAdaptations] = useState<Record<string, AdaptationResult>>({})
  const [isAdapting, setIsAdapting] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [currentMode, setCurrentMode] = useState<AdaptationMode>('original')
  const [isSaving, setIsSaving] = useState(false)
  const [materialsAnalysis, setMaterialsAnalysis] = useState<any>(null)
  const [adaptationProgress, setAdaptationProgress] = useState<Record<string, number>>({})
  const [adaptingTypes, setAdaptingTypes] = useState<string[]>([]) // Типы, которые сейчас адаптируются
  const [isEditing, setIsEditing] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [regenerateType, setRegenerateType] = useState<string | undefined>(undefined) // Тип для перегенерации
  const [editedContent, setEditedContent] = useState<Record<string, AdaptationContent>>({})
  const [isAuthor, setIsAuthor] = useState(true) // По умолчанию true, обновится после проверки

  const supabase = createClient()
  const { toast } = useToast()

  // Функция для получения названия типа адаптации
  const getAdaptationTypeName = (type: AdaptationType): string => {
    const typeInfo = STUDENT_TYPES.find(t => t.id === type)
    return typeInfo?.name || type
  }

  // Загрузка уроков из БД
  const loadLessonsFromDB = async (courseId: string, courseData?: any): Promise<Lesson[]> => {
    try {
      console.log("🔍 [Adaptation] Loading lessons for course:", courseId)

      let lessons: any[] = []

      // ВСЕГДА загружаем из course_lessons для получения правильных UUID
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (!lessonsError && lessonsData && Array.isArray(lessonsData) && lessonsData.length > 0) {
        console.log("✅ [Adaptation] Loaded lessons from course_lessons table:", lessonsData.length, "lessons")
        console.log("✅ [Adaptation] First lesson ID:", lessonsData[0]?.id)
        lessons = lessonsData
      } else {
        console.log("⚠️ [Adaptation] No lessons in course_lessons table")
        console.log("⚠️ [Adaptation] Error:", lessonsError)
        console.log("⚠️ [Adaptation] Data:", lessonsData)

        if (courseData?.modules?.lessons && Array.isArray(courseData.modules.lessons) && courseData.modules.lessons.length > 0) {
          console.log("⚠️ [Adaptation] Fallback to courseData.modules.lessons")
          console.log("⚠️ [Adaptation] First lesson from modules:", courseData.modules.lessons[0])
          lessons = courseData.modules.lessons
        } else if (courseData?.course_data?.lessons && Array.isArray(courseData.course_data.lessons) && courseData.course_data.lessons.length > 0) {
          console.log("⚠️ [Adaptation] Fallback to courseData.course_data.lessons")
          console.log("⚠️ [Adaptation] First lesson from course_data:", courseData.course_data.lessons[0])
          lessons = courseData.course_data.lessons
        }
      }

      if (lessons.length === 0) {
        return []
      }

      const formattedLessons = lessons.map((lesson: any, index: number) => {
        if (lesson.id && lesson.title) {
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || "",
            blocks: lesson.blocks || [],
            materials: lesson.materials || [],
            tests: lesson.tests || [],
            order_index: lesson.order_index ?? lesson.order ?? index
          }
        } else {
          return {
            id: lesson.id || lesson.lessonId || `lesson-${courseId}-${index}`,
            title: lesson.title || lesson.name || `Урок ${index + 1}`,
            description: lesson.description || "",
            blocks: lesson.blocks || lesson.content || [],
            materials: lesson.materials || [],
            tests: lesson.tests || [],
            order_index: lesson.order_index ?? lesson.order ?? index
          }
        }
      })

      return formattedLessons
    } catch (error) {
      console.error("❌ [Adaptation] Error in loadLessonsFromDB:", error)
      return []
    }
  }

  // Загрузка адаптаций из БД
  const loadAdaptationsFromDB = async (lessonId: string, includeUnpublished: boolean = true) => {
    if (!lessonId) return

    try {
      const adaptationTypes: AdaptationType[] = ['visual', 'auditory', 'kinesthetic', 'original']
      const loadedAdaptations: Record<string, AdaptationResult> = {}

      for (const type of adaptationTypes) {
        try {
          const response = await fetch(`/api/lesson-adaptation?lessonId=${encodeURIComponent(lessonId)}&courseId=${courseId}&type=${type}&includeUnpublished=${includeUnpublished}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.adaptation) {
              const adaptationContent: AdaptationContent = {
                block1: data.adaptation.block1,
                block2: data.adaptation.block2,
                block3: data.adaptation.block3,
                block4: data.adaptation.block4,
                block5: data.adaptation.block5
              }

              loadedAdaptations[type] = {
                studentType: type,
                content: adaptationContent,
                status: data.adaptation.status === 'published' ? 'published' :
                       data.adaptation.status === 'generated' ? 'completed' :
                       data.adaptation.status === 'edited' ? 'completed' :
                       'completed',
                progress: 100
              }
            } else {
              loadedAdaptations[type] = {
                studentType: type,
                status: 'pending',
                progress: 0
              }
            }
          } else {
            loadedAdaptations[type] = {
              studentType: type,
              status: 'pending',
              progress: 0
            }
          }
        } catch (error) {
          loadedAdaptations[type] = {
            studentType: type,
            status: 'pending',
            progress: 0
          }
        }
      }

      try {
        const metadataResponse = await fetch(`/api/lesson-materials?lessonId=${encodeURIComponent(lessonId)}&courseId=${courseId}`)
        if (metadataResponse.ok) {
          const metadataData = await metadataResponse.json()
          setMaterialsAnalysis(metadataData.analysis)
        }
      } catch (error) {
        console.error("Error loading materials analysis:", error)
      }

      setAdaptations(loadedAdaptations)
    } catch (error) {
      console.error("Error loading adaptations:", error)
    }
  }

  // Загрузка оригинального контента урока
  const loadOriginalContent = async (lessonId: string) => {
    if (!lessonId || !course) return

    try {
      let lessonData: any = null

      if (course.modules?.lessons && Array.isArray(course.modules.lessons)) {
        lessonData = course.modules.lessons.find((lesson: any) => lesson.id === lessonId)
      }

      if (!lessonData && course.course_data?.lessons && Array.isArray(course.course_data.lessons)) {
        lessonData = course.course_data.lessons.find((lesson: any) => lesson.id === lessonId)
      }

      if (!lessonData) {
        try {
          const { data: lessonFromTable, error: lessonError } = await supabase
            .from("course_lessons")
            .select("*")
            .eq("id", lessonId)
            .maybeSingle()

          if (!lessonError && lessonFromTable) {
            lessonData = lessonFromTable
          }
        } catch (error) {
          console.log("Lesson not found in course_lessons table:", error)
        }
      }

      if (!lessonData) {
        return
      }

      const originalContent = {
        blocks: (lessonData.blocks || []).map((block: any, index: number) => ({
          title: block.title || `Блок ${index + 1}`,
          content: block.content || block.text || "",
          type: block.type || "text",
          elements: block.elements || []
        }))
      }

      setAdaptations(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(type => {
          updated[type] = {
            ...updated[type],
            originalContent
          }
        })
        return updated
      })
    } catch (error) {
      console.error("Error loading original content:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
          router.push("/auth")
          return
        }

        setUser(currentUser)

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, description, status, author_id, course_data, modules")
          .eq("id", courseId)
          .single()

        if (courseError || !courseData) {
          setError("Курс не найден")
          return
        }

        // Проверяем, является ли пользователь автором
        let userIsAuthor = courseData.author_id === currentUser.id
        let hasAccess = userIsAuthor

        console.log("🔍 [Adaptation Page] Access check:", {
          userId: currentUser.id,
          userEmail: currentUser.email,
          courseAuthorId: courseData.author_id,
          isAuthor: userIsAuthor
        })

        if (!userIsAuthor) {
          // Проверяем, является ли пользователь соавтором
          const { data: collaborator, error: collabError } = await supabase
            .from("course_collaborators")
            .select("id")
            .eq("course_id", courseId)
            .eq("collaborator_user_id", currentUser.id)
            .maybeSingle()

          console.log("🔍 [Adaptation Page] Collaborator check:", { collaborator, collabError })

          if (collaborator) {
            hasAccess = true
            userIsAuthor = true // Соавтор имеет права редактирования
          } else {
            // Проверяем, является ли пользователь студентом с доступом к курсу
            const { data: student, error: studentError } = await supabase
              .from("students")
              .select("id")
              .eq("email", currentUser.email)
              .maybeSingle()

            console.log("🔍 [Adaptation Page] Student lookup:", {
              email: currentUser.email,
              student,
              studentError
            })

            if (student) {
              // Проверяем бесплатный доступ
              const { data: freeAccess, error: freeAccessError } = await supabase
                .from("student_course_access")
                .select("id")
                .eq("student_id", student.id)
                .eq("course_id", courseId)
                .maybeSingle()

              console.log("🔍 [Adaptation Page] Free access check:", {
                studentId: student.id,
                courseId,
                freeAccess,
                freeAccessError
              })

              // Проверяем покупку
              const { data: purchase, error: purchaseError } = await supabase
                .from("course_purchases")
                .select("id")
                .eq("student_id", student.id)
                .eq("course_id", courseId)
                .eq("purchase_status", "completed")
                .maybeSingle()

              console.log("🔍 [Adaptation Page] Purchase check:", {
                studentId: student.id,
                courseId,
                purchase,
                purchaseError
              })

              if (freeAccess || purchase) {
                hasAccess = true
                console.log("✅ [Adaptation Page] Student has access via:", freeAccess ? "free access" : "purchase")
                // userIsAuthor остаётся false - студент только просматривает
              } else {
                console.log("❌ [Adaptation Page] Student has no access (no free access or purchase)")
              }
            } else {
              console.log("❌ [Adaptation Page] No student record found for email:", currentUser.email)
            }
          }
        }

        console.log("🔍 [Adaptation Page] Final access decision:", { hasAccess, userIsAuthor })

        if (!hasAccess) {
          setError("У вас нет прав доступа к этому курсу")
          return
        }

        setIsAuthor(userIsAuthor)
        setCourse(courseData)

        const loadedLessons = await loadLessonsFromDB(courseId, courseData)
        setLessons(loadedLessons)

        if (loadedLessons.length > 0) {
          const firstLesson = loadedLessons[0]
          setSelectedLesson(firstLesson)
          await loadAdaptationsFromDB(firstLesson.id, userIsAuthor)
          await loadOriginalContent(firstLesson.id)
        }
      } catch (err) {
        console.error("Error loading course:", err)
        setError("Произошла ошибка при загрузке данных")
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      loadData()
    }
  }, [courseId, router, supabase])

  useEffect(() => {
    if (selectedLesson) {
      loadAdaptationsFromDB(selectedLesson.id, isAuthor)
      loadOriginalContent(selectedLesson.id)
    }
  }, [selectedLesson, isAuthor])

  const hasExistingAdaptations = () => {
    if (!selectedLesson) return false
    return Object.values(adaptations).some(adaptation =>
      adaptation.status === 'completed' || adaptation.status === 'published'
    )
  }

  const startAdaptation = async (adaptationType?: string) => {
    if (!selectedLesson) return

    // Определяем типы для адаптации: один конкретный или все
    const typesToAdapt = adaptationType
      ? STUDENT_TYPES.filter(t => t.id === adaptationType)
      : STUDENT_TYPES

    if (typesToAdapt.length === 0) {
      toast({
        title: "Ошибка",
        description: "Неверный тип адаптации",
        variant: "destructive",
      })
      return
    }

    setIsAdapting(true)
    setOverallProgress(0)
    setAdaptationProgress({})
    setAdaptingTypes(typesToAdapt.map(t => t.id)) // Сохраняем типы для отображения в прогрессе

    const typeName = adaptationType
      ? STUDENT_TYPES.find(t => t.id === adaptationType)?.name || 'выбранного режима'
      : 'всех режимов'

    toast({
      title: "Запущена адаптация урока",
      description: `Адаптация урока «${selectedLesson.title}» для ${typeName} начата. Это может занять несколько минут.`,
    })

    const initialAdaptations: Record<string, AdaptationResult> = {}
    typesToAdapt.forEach(type => {
      initialAdaptations[type.id] = {
        studentType: type.id,
        content: {
          block1: null as any,
          block2: null as any,
          block3: null as any,
          block4: null as any,
          block5: null as any
        },
        progress: 0,
        status: 'pending'
      }
      setAdaptationProgress(prev => ({ ...prev, [type.id]: 0 }))
    })
    setAdaptations(prev => ({ ...prev, ...initialAdaptations }))

    const adaptationPromises = typesToAdapt.map(async (studentType, index) => {
      try {
        setAdaptations(prev => ({
          ...prev,
          [studentType.id]: {
            ...prev[studentType.id],
            status: 'processing',
            progress: 10
          }
        }))
        setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 10 }))

        const lessonContent = {
          title: selectedLesson.title || '',
          description: selectedLesson.description || '',
          blocks: (selectedLesson.blocks || []).map((block: any) => ({
            title: block.title || block.name || '',
            content: block.content || block.text || '',
            type: block.type || 'text',
            elements: block.elements || [] // Передаем элементы (video, audio, image, file)
          })),
          materials: selectedLesson.materials || [],
          tests: selectedLesson.tests || []
        }

        const response = await fetch('/api/ai-adaptation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonContent,
            studentType: studentType.id,
            lessonId: selectedLesson.id,
            courseId: courseId,
            forceRegenerate: false
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` }
          }

          setAdaptations(prev => ({
            ...prev,
            [studentType.id]: {
              ...prev[studentType.id],
              status: 'error',
              progress: 0
            }
          }))
          setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 0 }))

          toast({
            title: `Ошибка адаптации для «${studentType.name}»`,
            description: errorData.error || `Ошибка сервера: ${response.status} ${response.statusText}`,
            variant: "destructive",
          })
          return
        }

        const result = await response.json()

        if (result.success) {
          await loadAdaptationsFromDB(selectedLesson.id, isAuthor)

          setAdaptations(prev => ({
            ...prev,
            [studentType.id]: {
              ...prev[studentType.id],
              content: result.adaptedContent,
              progress: 100,
              status: 'completed'
            }
          }))
          setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 100 }))

          toast({
            title: `Адаптация для «${studentType.name}» завершена`,
            description: `Урок успешно адаптирован для типа «${studentType.name}».`,
          })
        } else {
          setAdaptations(prev => ({
            ...prev,
            [studentType.id]: {
              ...prev[studentType.id],
              status: 'error',
              progress: 0
            }
          }))
          setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 0 }))

          toast({
            title: `Ошибка адаптации для «${studentType.name}»`,
            description: result.error || "Произошла ошибка при адаптации урока.",
            variant: "destructive",
          })
        }

        const newProgress = Math.round(((index + 1) / typesToAdapt.length) * 100)
        setOverallProgress(newProgress)

      } catch (error: any) {
        console.error(`Error adapting for ${studentType.id}:`, error)
        setAdaptations(prev => ({
          ...prev,
          [studentType.id]: {
            ...prev[studentType.id],
            status: 'error',
            progress: 0
          }
        }))
        setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 0 }))

        toast({
          title: `Ошибка адаптации для «${studentType.name}»`,
          description: error.message || "Произошла ошибка при адаптации урока.",
          variant: "destructive",
        })
      }
    })

    await Promise.all(adaptationPromises)
    setOverallProgress(100)
    setIsAdapting(false)
    setAdaptingTypes([]) // Очищаем список адаптируемых типов

    if (selectedLesson) {
      await loadAdaptationsFromDB(selectedLesson.id, isAuthor)
    }
  }

  const regenerateAdaptation = async (adaptationType?: string) => {
    if (!selectedLesson) return

    // Определяем типы для адаптации: один конкретный или все
    const typesToAdapt = adaptationType
      ? STUDENT_TYPES.filter(t => t.id === adaptationType)
      : STUDENT_TYPES

    if (typesToAdapt.length === 0) {
      toast({
        title: "Ошибка",
        description: "Неверный тип адаптации",
        variant: "destructive",
      })
      return
    }

    setIsAdapting(true)
    setOverallProgress(0)
    setAdaptationProgress({})
    setAdaptingTypes(typesToAdapt.map(t => t.id)) // Сохраняем типы для отображения в прогрессе

    const typeName = adaptationType
      ? STUDENT_TYPES.find(t => t.id === adaptationType)?.name || 'выбранного режима'
      : 'всех режимов'

    toast({
      title: "Перегенерация адаптации урока",
      description: `Адаптация урока «${selectedLesson.title}» перегенерируется для ${typeName}. Старая версия будет удалена.`,
    })

    const initialAdaptations: Record<string, AdaptationResult> = {}
    typesToAdapt.forEach(type => {
      initialAdaptations[type.id] = {
        studentType: type.id,
        content: {
          block1: null as any,
          block2: null as any,
          block3: null as any,
          block4: null as any,
          block5: null as any
        },
        progress: 0,
        status: 'pending'
      }
      setAdaptationProgress(prev => ({ ...prev, [type.id]: 0 }))
    })
    setAdaptations(prev => ({ ...prev, ...initialAdaptations }))

    const adaptationPromises = typesToAdapt.map(async (studentType, index) => {
      try {
        setAdaptations(prev => ({
          ...prev,
          [studentType.id]: {
            ...prev[studentType.id],
            status: 'processing',
            progress: 10
          }
        }))
        setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 10 }))

        const lessonContent = {
          title: selectedLesson.title || '',
          description: selectedLesson.description || '',
          blocks: (selectedLesson.blocks || []).map((block: any) => ({
            title: block.title || block.name || '',
            content: block.content || block.text || '',
            type: block.type || 'text',
            elements: block.elements || [] // Передаем элементы (video, audio, image, file)
          })),
          materials: selectedLesson.materials || [],
          tests: selectedLesson.tests || []
        }

        const response = await fetch('/api/ai-adaptation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonContent,
            studentType: studentType.id,
            lessonId: selectedLesson.id,
            courseId: courseId,
            forceRegenerate: true
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` }
          }

          setAdaptations(prev => ({
            ...prev,
            [studentType.id]: {
              ...prev[studentType.id],
              status: 'error',
              progress: 0
            }
          }))
          setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 0 }))

          toast({
            title: `Ошибка адаптации для «${studentType.name}»`,
            description: errorData.error || `Ошибка сервера: ${response.status} ${response.statusText}`,
            variant: "destructive",
          })
          return
        }

        const result = await response.json()

        if (result.success) {
          await loadAdaptationsFromDB(selectedLesson.id, isAuthor)

          setAdaptations(prev => ({
            ...prev,
            [studentType.id]: {
              ...prev[studentType.id],
              content: result.adaptedContent,
              progress: 100,
              status: 'completed'
            }
          }))
          setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 100 }))

          toast({
            title: `Перегенерация для «${studentType.name}» завершена`,
            description: `Урок успешно перегенерирован для типа «${studentType.name}». Старая версия удалена.`,
          })
        } else {
          setAdaptations(prev => ({
            ...prev,
            [studentType.id]: {
              ...prev[studentType.id],
              status: 'error',
              progress: 0
            }
          }))
          setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 0 }))

          toast({
            title: `Ошибка перегенерации для «${studentType.name}»`,
            description: result.error || "Произошла ошибка при перегенерации урока.",
            variant: "destructive",
          })
        }

        const newProgress = Math.round(((index + 1) / typesToAdapt.length) * 100)
        setOverallProgress(newProgress)

      } catch (error: any) {
        console.error(`Error adapting for ${studentType.id}:`, error)
        setAdaptations(prev => ({
          ...prev,
          [studentType.id]: {
            ...prev[studentType.id],
            status: 'error',
            progress: 0
          }
        }))
        setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 0 }))

        toast({
          title: `Ошибка перегенерации для «${studentType.name}»`,
          description: error.message || "Произошла ошибка при перегенерации урока.",
          variant: "destructive",
        })
      }
    })

    await Promise.all(adaptationPromises)
    setOverallProgress(100)
    setIsAdapting(false)
    setAdaptingTypes([]) // Очищаем список адаптируемых типов

    if (selectedLesson) {
      await loadAdaptationsFromDB(selectedLesson.id)
    }

    // Показываем итоговый тост только при перегенерации ВСЕХ типов
    // (для одного типа тост уже показан выше)
    if (!adaptationType) {
      const updatedAdaptations = adaptations
      const successCount = Object.values(updatedAdaptations).filter(a => a.status === 'completed' || a.status === 'published').length
      const errorCount = Object.values(updatedAdaptations).filter(a => a.status === 'error').length

      if (errorCount === 0 && successCount === STUDENT_TYPES.length) {
        toast({
          title: "Адаптация завершена успешно",
          description: `Все ${STUDENT_TYPES.length} адаптации созданы успешно. Теперь вы можете просмотреть и отредактировать их.`,
        })
      } else if (errorCount > 0) {
        toast({
          title: "Адаптация завершена с ошибками",
          description: `Создано адаптаций: ${successCount}, ошибок: ${errorCount}. Проверьте детали для каждого типа.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Адаптация завершена",
          description: `Создано адаптаций: ${successCount} из ${STUDENT_TYPES.length}.`,
        })
      }
    }
  }

  // Обработчик изменений контента при inline-редактировании
  const handleAdaptedContentChange = (adaptationType: AdaptationType, content: AdaptationContent) => {
    setEditedContent(prev => ({
      ...prev,
      [adaptationType]: content
    }))
  }

  // Сохранение изменений адаптации
  const saveAdaptationChanges = async (adaptationType: AdaptationType, content?: AdaptationContent) => {
    if (!selectedLesson) return

    // Используем переданный content, editedContent, или текущий контент адаптации
    const contentToSave = content || editedContent[adaptationType] || adaptations[adaptationType]?.content
    if (!contentToSave) {
      toast({
        title: "Нет контента",
        description: "Нет контента для сохранения. Сначала создайте адаптацию.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/lesson-adaptation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          courseId: courseId,
          type: adaptationType,
          blocks: contentToSave
        }),
      })

      if (response.ok) {
        setAdaptations(prev => ({
          ...prev,
          [adaptationType]: {
            ...prev[adaptationType],
            content: contentToSave,
            status: 'completed'
          }
        }))

        // Очищаем editedContent для этого типа после успешного сохранения
        setEditedContent(prev => {
          const { [adaptationType]: _, ...rest } = prev
          return rest
        })

        toast({
          title: "Изменения сохранены",
          description: `Адаптация для типа «${getAdaptationTypeName(adaptationType)}» успешно сохранена.`,
        })

        // Закрываем режим редактирования после сохранения
        setIsEditing(false)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Неизвестная ошибка" }))
        toast({
          title: "Ошибка сохранения",
          description: errorData.error || "Не удалось сохранить изменения.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Произошла ошибка при сохранении.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const publishAdaptation = async (adaptationType: AdaptationType) => {
    if (!selectedLesson) return

    try {
      const response = await fetch('/api/lesson-adaptation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          courseId: courseId,
          type: adaptationType
        }),
      })

      if (response.ok) {
        setAdaptations(prev => ({
          ...prev,
          [adaptationType]: {
            ...prev[adaptationType],
            status: 'published'
          }
        }))

        toast({
          title: "Адаптация опубликована",
          description: `Адаптация для режима «${getAdaptationTypeName(adaptationType)}» теперь доступна для студентов.`,
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: "Неизвестная ошибка" }))
        toast({
          title: "Ошибка публикации",
          description: errorData.error || "Не удалось опубликовать адаптацию.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка публикации",
        description: error.message || "Произошла ошибка при публикации.",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-[#659AB8]" />
      case 'processing':
        return <RefreshCwIcon className="w-5 h-5 text-[#659AB8] animate-spin" />
      case 'error':
        return <div className="w-5 h-5 bg-red-600 rounded-full" />
      default:
        return <ClockIcon className="w-5 h-5 text-slate-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-8 w-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md border">
          <CardContent className="text-center py-8">
            <p className="text-slate-900 mb-4">{error || "Курс не найден"}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
            >
              Вернуться в дашборд
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      {/* Header Section */}
      <section className="bg-white border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                Просмотр <span className="text-[#5589a7]">адаптации</span> курса
              </h1>
              <p className="text-lg text-slate-600">
                Как курс «{course.title}» будет выглядеть для разных режимов представления материала
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => router.push(`/course/${courseId}`)}
                className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white whitespace-nowrap"
              >
                К курсу
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] whitespace-nowrap"
              >
                В дашборд
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Выбор урока */}
          {lessons.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#5589a7]">
                  {isAuthor ? 'Выберите урок для адаптации' : 'Выберите урок'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`h-auto p-4 text-left rounded-lg border-2 transition-colors duration-200 ${
                        selectedLesson?.id === lesson.id
                          ? "bg-[#659AB8] text-white border-[#659AB8]"
                          : "bg-white text-slate-900 border-[#E5E7EB] hover:border-[#659AB8]"
                      }`}
                    >
                      <div className="font-semibold">{lesson.title}</div>
                      {lesson.description && (
                        <div className={`text-sm mt-1 ${selectedLesson?.id === lesson.id ? "opacity-90" : "text-slate-600"}`}>
                          {lesson.description.length > 100
                            ? `${lesson.description.substring(0, 100)}...`
                            : lesson.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Прогресс-бар */}
          {isAdapting && (
            <Card className="border">
              <CardContent className="py-6">
                <div className="space-y-6">
                  {adaptingTypes.length > 1 && (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Общий прогресс
                        </h3>
                        <span className="text-sm text-slate-600 font-semibold">
                          {Math.round(overallProgress)}%
                        </span>
                      </div>
                      <Progress value={overallProgress} className="h-3" showLabel />
                    </>
                  )}

                  {adaptingTypes.length === 1 && (
                    <p className="text-sm text-slate-600">
                      Адаптация контента может занять несколько минут...
                    </p>
                  )}

                  {/* Детальный прогресс по типам */}
                  {adaptingTypes.length > 0 && (
                    <div className={`space-y-3 ${adaptingTypes.length > 1 ? 'pt-4 border-t border-[#E5E7EB]' : ''}`}>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {adaptingTypes.length === 1 ? 'Прогресс адаптации' : 'Прогресс по типам:'}
                      </h4>
                      {STUDENT_TYPES.filter(type => adaptingTypes.includes(type.id)).map((type) => {
                        const progress = adaptationProgress[type.id] || 0
                        const status = adaptations[type.id]?.status || 'pending'

                        return (
                          <div key={type.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {type.icon}
                                <span className="text-slate-900">{type.name}</span>
                                {status === 'processing' && (
                                  <RefreshCwIcon className="w-3 h-3 text-[#659AB8] animate-spin" />
                                )}
                                {status === 'completed' && (
                                  <CheckCircleIcon className="w-3 h-3 text-[#659AB8]" />
                                )}
                                {status === 'error' && (
                                  <XIcon className="w-3 h-3 text-red-600" />
                                )}
                              </div>
                              <span className="text-slate-600">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Кнопка отмены */}
                  <div className="pt-4 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => {
                        setIsAdapting(false)
                        setAdaptingTypes([])
                        setOverallProgress(0)
                        setAdaptationProgress({})
                        // Сбрасываем статус processing на pending для всех затронутых типов
                        setAdaptations(prev => {
                          const updated = { ...prev }
                          adaptingTypes.forEach(typeId => {
                            if (updated[typeId]?.status === 'processing') {
                              updated[typeId] = {
                                ...updated[typeId],
                                status: 'pending',
                                progress: 0
                              }
                            }
                          })
                          return updated
                        })
                        toast({
                          title: "Адаптация отменена",
                          description: "Процесс адаптации был отменён.",
                        })
                      }}
                      className="w-full bg-white text-slate-600 px-6 py-2 border-2 border-slate-300 rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-slate-50"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Шаблоны адаптации */}
          {selectedLesson && (
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#5589a7]">
                  {isAuthor ? 'Просмотр адаптации урока' : 'Материалы урока'}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {isAuthor
                    ? 'Посмотрите, как ваш урок будет восприниматься разными режимами представления материала'
                    : 'Выберите режим представления материала, который вам больше подходит'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Переключатель режимов */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <AdaptationModeSwitcher
                      currentMode={currentMode}
                      onModeChange={setCurrentMode}
                      availableModes={['visual', 'auditory', 'kinesthetic', 'original']}
                    />
                    {/* Кнопки редактирования - только для авторов */}
                    {isAuthor && (
                      <div className="flex gap-2">
                        {(adaptations[currentMode]?.content || (currentMode === 'original' && (adaptations['original']?.status === 'completed' || adaptations['original']?.status === 'published'))) && (
                          <>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveAdaptationChanges(currentMode)}
                                  disabled={isSaving}
                                  className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                                <button
                                  onClick={() => {
                                    setIsEditing(false)
                                    // Очищаем несохраненные изменения
                                    setEditedContent(prev => {
                                      const { [currentMode]: _, ...rest } = prev
                                      return rest
                                    })
                                  }}
                                  className="bg-white text-slate-600 px-6 py-2 border-2 border-slate-300 rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-slate-50 whitespace-nowrap"
                                >
                                  Отмена
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setIsEditing(true)}
                                  className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white whitespace-nowrap"
                                >
                                  Редактировать
                                </button>
                                <button
                                  onClick={() => {
                                    setRegenerateType(currentMode)
                                    setShowRegenerateConfirm(true)
                                  }}
                                  disabled={isAdapting}
                                  className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <RefreshCwIcon className="w-4 h-4" />
                                  Перегенерировать
                                </button>
                                {adaptations[currentMode]?.status === 'completed' && (
                                  <button
                                    onClick={() => publishAdaptation(currentMode)}
                                    className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] whitespace-nowrap"
                                  >
                                    Опубликовать
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Подсказки о недостающих материалах для текущего режима - только для авторов */}
                  {isAuthor && materialsAnalysis && selectedLesson && currentMode !== 'original' && (() => {
                    const missingMaterials = getMissingMaterialsForAdaptationType(
                      materialsAnalysis as MaterialsAnalysis,
                      currentMode as AdaptationType
                    )
                    return missingMaterials.length > 0 ? (
                      <AuthorMaterialHints
                        adaptationType={currentMode as AdaptationType}
                        missingMaterials={missingMaterials}
                        lessonId={selectedLesson.id}
                      />
                    ) : null
                  })()}

                  {/* Отображение адаптации */}
                    <div className="space-y-4">
                      {adaptations[currentMode]?.status === 'completed' || adaptations[currentMode]?.status === 'published' ? (
                        <div className="bg-white border-2 border-[#659AB8]/20 rounded-lg p-6">
                          <UnifiedAdaptation
                            mode={currentMode}
                            lessonTitle={selectedLesson.title}
                            adaptedContent={adaptations[currentMode]?.content}
                            originalContent={adaptations[currentMode]?.originalContent}
                            isStudent={!isAuthor}
                            courseId={courseId}
                            lessonId={selectedLesson.id}
                            materialsAnalysis={materialsAnalysis}
                            isEditing={isAuthor && isEditing}
                            onAdaptedContentChange={isAuthor ? (content) => handleAdaptedContentChange(currentMode, content) : undefined}
                          />
                        </div>
                      ) : adaptations[currentMode]?.status === 'processing' ? (
                        <div className="bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg p-6 text-center">
                          <RefreshCwIcon className="w-8 h-8 text-[#659AB8] animate-spin mx-auto mb-2" />
                          <p className="text-[#5589a7]">Адаптация в процессе...</p>
                        </div>
                      ) : adaptations[currentMode]?.status === 'error' ? (
                        <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-6 text-center">
                          <p className="text-slate-900 mb-4">
                            {isAuthor ? 'Ошибка при адаптации контента' : 'Адаптация временно недоступна'}
                          </p>
                          {isAuthor && (
                            <button
                              onClick={() => startAdaptation(currentMode)}
                              className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                            >
                              Попробовать снова
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-[#E5E7EB] rounded-lg p-6 text-center">
                          <div className="w-16 h-16 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpenIcon className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-slate-600 mb-4">
                            {isAuthor ? 'Адаптация ещё не создана' : 'Урок скоро появится'}
                          </p>
                          {isAuthor ? (
                            <button
                              onClick={() => startAdaptation(currentMode)}
                              className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                            >
                              Создать адаптацию
                            </button>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Автор курса работает над адаптацией этого урока. Пожалуйста, вернитесь позже.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Модальное окно подтверждения перегенерации */}
      {selectedLesson && (
        <ConfirmationModal
          isOpen={showRegenerateConfirm}
          onClose={() => {
            setShowRegenerateConfirm(false)
            setRegenerateType(undefined)
          }}
          onConfirm={() => {
            regenerateAdaptation(regenerateType)
            setShowRegenerateConfirm(false)
            setRegenerateType(undefined)
          }}
          title="Перегенерировать адаптацию?"
          message={`Вы уверены, что хотите перегенерировать адаптацию урока «${selectedLesson.title}»${regenerateType ? ` для режима «${STUDENT_TYPES.find(t => t.id === regenerateType)?.name}»` : ''}? Старая версия будет удалена, и будет создана новая версия.`}
          confirmText="Перегенерировать"
          cancelText="Отмена"
          confirmVariant="default"
        />
      )}

      <Toaster />
    </div>
  )
}
