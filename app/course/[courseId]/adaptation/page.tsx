"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { MainNavigation } from "@/components/ui/main-navigation"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  EyeIcon,
  EarIcon,
  HandIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ClockIcon,
  EditIcon,
  BookOpenIcon,
  SaveIcon,
  LightbulbIcon,
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
    color: 'bg-[#FDF8F3] text-slate-900 border border-[#E5E7EB]'
  },
  {
    id: 'visual',
    name: 'Визуал',
    description: 'Любит схемы, диаграммы, структурированную информацию',
    icon: <EyeIcon className="w-5 h-5" />,
    color: 'bg-[#E8F4FA] text-[#5589a7] border border-[#CDE6F9]'
  },
  {
    id: 'auditory',
    name: 'Аудиал',
    description: 'Любит истории, диалоги, эмоциональные примеры',
    icon: <EarIcon className="w-5 h-5" />,
    color: 'bg-[#E8F4FA] text-[#5589a7] border border-[#CDE6F9]'
  },
  {
    id: 'kinesthetic',
    name: 'Кинестетик',
    description: 'Любит практику, действия, интерактивные элементы',
    icon: <HandIcon className="w-5 h-5" />,
    color: 'bg-[#E8F4FA] text-[#5589a7] border border-[#CDE6F9]'
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
  const [isEditing, setIsEditing] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [isPublishingAll, setIsPublishingAll] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  // Загрузка уроков из БД
  const loadLessonsFromDB = async (courseId: string, courseData?: any): Promise<Lesson[]> => {
    try {
      console.log("🔍 [Adaptation] Loading lessons for course:", courseId)

      let lessons: any[] = []

      if (courseData?.modules?.lessons && Array.isArray(courseData.modules.lessons) && courseData.modules.lessons.length > 0) {
        lessons = courseData.modules.lessons
      } else if (courseData?.course_data?.lessons && Array.isArray(courseData.course_data.lessons) && courseData.course_data.lessons.length > 0) {
        lessons = courseData.course_data.lessons
      } else {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true })

        if (!lessonsError && lessonsData && Array.isArray(lessonsData) && lessonsData.length > 0) {
          lessons = lessonsData
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
  const loadAdaptationsFromDB = async (lessonId: string) => {
    if (!lessonId) return

    try {
      const adaptationTypes: AdaptationType[] = ['visual', 'auditory', 'kinesthetic', 'original']
      const loadedAdaptations: Record<string, AdaptationResult> = {}

      for (const type of adaptationTypes) {
        try {
          const response = await fetch(`/api/lesson-adaptation?lessonId=${encodeURIComponent(lessonId)}&courseId=${courseId}&type=${type}&includeUnpublished=true`)
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

        if (currentUser.user_metadata?.user_type !== "teacher") {
          router.push("/student-dashboard")
          return
        }

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, description, status, author_id, course_data, modules")
          .eq("id", courseId)
          .single()

        if (courseError || !courseData) {
          setError("Курс не найден")
          return
        }

        const isAuthor = courseData.author_id === currentUser.id
        if (!isAuthor) {
          const { data: collaborator } = await supabase
            .from("course_collaborators")
            .select("id")
            .eq("course_id", courseId)
            .eq("collaborator_user_id", currentUser.id)
            .maybeSingle()

          if (!collaborator) {
            setError("У вас нет прав доступа к этому курсу")
            return
          }
        }

        setCourse(courseData)

        const loadedLessons = await loadLessonsFromDB(courseId, courseData)
        setLessons(loadedLessons)

        if (loadedLessons.length > 0) {
          const firstLesson = loadedLessons[0]
          setSelectedLesson(firstLesson)
          await loadAdaptationsFromDB(firstLesson.id)
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
      loadAdaptationsFromDB(selectedLesson.id)
      loadOriginalContent(selectedLesson.id)
    }
  }, [selectedLesson])

  const hasExistingAdaptations = () => {
    if (!selectedLesson) return false
    return Object.values(adaptations).some(adaptation =>
      adaptation.status === 'completed' || adaptation.status === 'published'
    )
  }

  const startAdaptation = async () => {
    if (!selectedLesson) return

    setIsAdapting(true)
    setOverallProgress(0)
    setAdaptations({})
    setAdaptationProgress({})

    toast({
      title: "Запущена адаптация урока",
      description: `Адаптация урока «${selectedLesson.title}» для всех режимов представления материала начата. Это может занять несколько минут.`,
    })

    const initialAdaptations: Record<string, AdaptationResult> = {}
    STUDENT_TYPES.forEach(type => {
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
    setAdaptations(initialAdaptations)

    const adaptationPromises = STUDENT_TYPES.map(async (studentType, index) => {
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
            type: block.type || 'text'
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
          await loadAdaptationsFromDB(selectedLesson.id)

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

        const newProgress = Math.round(((index + 1) / STUDENT_TYPES.length) * 100)
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

    if (selectedLesson) {
      await loadAdaptationsFromDB(selectedLesson.id)
    }
  }

  const handleRegenerateClick = () => {
    if (!selectedLesson) return
    setShowRegenerateConfirm(true)
  }

  const regenerateAdaptation = async () => {
    if (!selectedLesson) return

    setIsAdapting(true)
    setOverallProgress(0)
    setAdaptationProgress({})

    toast({
      title: "Перегенерация адаптации урока",
      description: `Адаптация урока «${selectedLesson.title}» перегенерируется для всех режимов представления материала. Старая версия будет удалена.`,
    })

    const initialAdaptations: Record<string, AdaptationResult> = {}
    STUDENT_TYPES.forEach(type => {
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
    setAdaptations(initialAdaptations)

    const adaptationPromises = STUDENT_TYPES.map(async (studentType, index) => {
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
            type: block.type || 'text'
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
          await loadAdaptationsFromDB(selectedLesson.id)

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

        const newProgress = Math.round(((index + 1) / STUDENT_TYPES.length) * 100)
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

    if (selectedLesson) {
      await loadAdaptationsFromDB(selectedLesson.id)
    }

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

  const saveAdaptationChanges = async (adaptationType: AdaptationType, content: AdaptationContent) => {
    if (!selectedLesson) return

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
          blocks: content
        }),
      })

      if (response.ok) {
        setAdaptations(prev => ({
          ...prev,
          [adaptationType]: {
            ...prev[adaptationType],
            content,
            status: 'completed'
          }
        }))

        toast({
          title: "Изменения сохранены",
          description: `Адаптация для типа «${adaptationType}» успешно сохранена.`,
        })
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
          description: `Адаптация для режима «${adaptationType}» теперь доступна для студентов.`,
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

  const publishAllAdaptations = async () => {
    if (!selectedLesson) return

    setIsPublishingAll(true)
    try {
      const adaptationTypes: AdaptationType[] = ['visual', 'auditory', 'kinesthetic', 'original']
      const publishPromises = adaptationTypes.map(async (type) => {
        const adaptation = adaptations[type]
        if (adaptation && (adaptation.status === 'completed' || adaptation.status === 'edited') && adaptation.content) {
          const response = await fetch('/api/lesson-adaptation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lessonId: selectedLesson.id,
              courseId: courseId,
              type: type
            }),
          })
          return { type, success: response.ok, response }
        }
        return { type, success: true, skipped: true }
      })

      const results = await Promise.all(publishPromises)
      const successCount = results.filter(r => r.success).length
      const skippedCount = results.filter(r => r.skipped).length
      const failedCount = results.filter(r => !r.success && !r.skipped).length

      setAdaptations(prev => {
        const updated = { ...prev }
        results.forEach(result => {
          if (result.success && !result.skipped && updated[result.type]) {
            updated[result.type] = {
              ...updated[result.type],
              status: 'published'
            }
          }
        })
        return updated
      })

      await loadAdaptationsFromDB(selectedLesson.id)

      if (failedCount === 0) {
        toast({
          title: "Адаптации опубликованы",
          description: `Опубликовано адаптаций: ${successCount - skippedCount}${skippedCount > 0 ? `, пропущено: ${skippedCount}` : ''}. Теперь они доступны для студентов.`,
        })
      } else {
        toast({
          title: "Публикация завершена с ошибками",
          description: `Опубликовано: ${successCount - skippedCount}, ошибок: ${failedCount}${skippedCount > 0 ? `, пропущено: ${skippedCount}` : ''}.`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка публикации",
        description: error.message || "Произошла ошибка при публикации адаптаций.",
        variant: "destructive",
      })
    } finally {
      setIsPublishingAll(false)
    }
  }

  const hasUnpublishedAdaptations = () => {
    return Object.values(adaptations).some(adaptation =>
      (adaptation.status === 'completed' || adaptation.status === 'edited') && adaptation.content
    )
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
            <p className="text-red-600 mb-4">{error || "Курс не найден"}</p>
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
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/course/${courseId}`)}
                className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                К курсу
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
              >
                В дашборд
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Информация о курсе */}
          <Card className="border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-[#5589a7]">
                Информация о курсе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-slate-600 mt-1">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="bg-[#FDF8F3] text-slate-900 px-3 py-1 rounded-md text-sm border border-[#E5E7EB]">
                    {course.status}
                  </span>
                  <span className="text-sm text-slate-600">
                    ID курса: <span className="font-mono text-xs">{course.id}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Выбор урока */}
          {lessons.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#5589a7]">
                  Выберите урок для адаптации
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

          {/* Информация о системе */}
          <div className={`rounded-lg p-4 border ${lessons.length > 0 ? 'bg-[#FDF8F3] border-[#E5E7EB]' : 'bg-light-gray border-[#E5E7EB]'}`}>
            <h4 className="font-semibold mb-2 text-slate-900">
              {lessons.length > 0 ? 'ИИ-адаптация активна' : 'Уроки не найдены'}
            </h4>
            <div className="text-sm text-slate-600">
              {lessons.length > 0 ? (
                <>
                  <p>Система использует Claude-3.5-Sonnet для адаптации контента под разные типы обучения.</p>
                  <p className="mt-2">
                    <strong>Уроков найдено: {lessons.length}</strong> |
                    Выбранный урок: {selectedLesson ? selectedLesson.title : 'Нет'}
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2">Уроки не найдены в курсе. Пожалуйста, проверьте:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 mb-2">
                    <li>Есть ли уроки в таблице <code className="bg-slate-100 px-1 rounded">course_lessons</code> для этого курса</li>
                    <li>Есть ли уроки в поле <code className="bg-slate-100 px-1 rounded">modules.lessons</code> данных курса</li>
                    <li>Есть ли уроки в поле <code className="bg-slate-100 px-1 rounded">course_data.lessons</code> данных курса</li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Кнопка запуска/перегенерации адаптации */}
          {selectedLesson && (
            <Card className="border">
              <CardContent className="py-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {hasExistingAdaptations() ? 'Перегенерировать адаптацию урока' : 'Запустить адаптацию урока'}
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    {hasExistingAdaptations()
                      ? `ИИ перегенерирует адаптацию урока «${selectedLesson.title}» для всех режимов представления материала. Старая версия будет удалена.`
                      : `ИИ адаптирует урок «${selectedLesson.title}» для всех режимов представления материала`
                    }
                  </p>
                  <p className="text-sm text-slate-600 mb-4">
                    Визуалы, аудиалы, кинестетики и оригинальная версия
                  </p>
                  <div className="flex gap-3 justify-center">
                    {!hasExistingAdaptations() && (
                      <button
                        onClick={startAdaptation}
                        disabled={isAdapting}
                        className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isAdapting ? (
                          <>
                            <RefreshCwIcon className="w-4 h-4 animate-spin" />
                            Адаптация в процессе...
                          </>
                        ) : (
                          <>
                            <EditIcon className="w-4 h-4" />
                            Запустить адаптацию
                          </>
                        )}
                      </button>
                    )}
                    {hasExistingAdaptations() && (
                      <button
                        onClick={handleRegenerateClick}
                        disabled={isAdapting}
                        className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isAdapting ? (
                          <>
                            <RefreshCwIcon className="w-4 h-4 animate-spin" />
                            Перегенерация в процессе...
                          </>
                        ) : (
                          <>
                            <RefreshCwIcon className="w-4 h-4" />
                            Перегенерировать адаптацию
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Прогресс-бар */}
          {isAdapting && (
            <Card className="border">
              <CardContent className="py-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Прогресс адаптации
                    </h3>
                    <span className="text-sm text-slate-600 font-semibold">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                  <Progress value={overallProgress} className="h-3" showLabel />
                  <p className="text-sm text-slate-600">
                    Адаптация контента может занять несколько минут...
                  </p>

                  {/* Детальный прогресс по типам */}
                  <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
                    <h4 className="text-sm font-semibold text-slate-900">Прогресс по типам:</h4>
                    {STUDENT_TYPES.map((type) => {
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Рекомендации по материалам */}
          {materialsAnalysis && materialsAnalysis.recommendations && materialsAnalysis.recommendations.length > 0 && (
            <Card className="border bg-light-gray">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#5589a7] flex items-center gap-2">
                  <LightbulbIcon className="w-5 h-5" />
                  Рекомендации по улучшению контента
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Следующие рекомендации помогут улучшить качество адаптации для разных режимов представления материала
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materialsAnalysis.recommendations.map((rec: any, index: number) => {
                    const priority = rec.priority || 'medium'

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-[#FDF8F3] border border-[#E5E7EB]"
                      >
                        <div className="flex items-start gap-2">
                          <LightbulbIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#5589a7]" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{rec.message}</p>
                            {rec.type && (
                              <p className="text-xs mt-1 text-slate-600">
                                Тип материала: {rec.type === 'audio' ? 'Аудио' : rec.type === 'visual' ? 'Визуальный' : rec.type === 'practice' ? 'Практика' : rec.type}
                              </p>
                            )}
                          </div>
                          {priority === 'high' && (
                            <span className="bg-[#659AB8] text-white text-xs px-2 py-1 rounded">Важно</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Шаблоны адаптации */}
          {selectedLesson && (
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#5589a7]">
                  Просмотр адаптации урока
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Посмотрите, как ваш урок будет восприниматься разными режимами представления материала
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
                    <div className="flex gap-2">
                      {hasUnpublishedAdaptations() && (
                        <button
                          onClick={publishAllAdaptations}
                          disabled={isPublishingAll}
                          className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isPublishingAll ? (
                            <>
                              <RefreshCwIcon className="w-4 h-4 animate-spin" />
                              Публикация...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4" />
                              Опубликовать все адаптации
                            </>
                          )}
                        </button>
                      )}
                      {(adaptations[currentMode]?.content || (currentMode === 'original' && (adaptations['original']?.status === 'completed' || adaptations['original']?.status === 'published'))) && (
                        <>
                          <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-6 py-2 border-2 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
                              isEditing
                                ? "bg-[#659AB8] text-white border-[#659AB8] hover:bg-[#5589a7] hover:border-[#5589a7]"
                                : "bg-white text-[#659AB8] border-[#659AB8] hover:bg-[#659AB8] hover:text-white"
                            }`}
                          >
                            <EditIcon className="w-4 h-4" />
                            {isEditing ? 'Закрыть редактор' : 'Редактировать'}
                          </button>
                          {!isEditing && adaptations[currentMode]?.status !== 'published' && (
                            <button
                              onClick={() => publishAdaptation(currentMode)}
                              className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] flex items-center gap-2"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Опубликовать
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Подсказки о недостающих материалах для текущего режима */}
                  {materialsAnalysis && selectedLesson && currentMode !== 'original' && (() => {
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
                  {currentMode === 'original' ? (
                    <div className="space-y-4">
                      {adaptations['original']?.status === 'completed' || adaptations['original']?.status === 'published' ? (
                        <div className="bg-white border-2 border-[#659AB8]/20 rounded-lg p-6">
                          {isEditing && adaptations['original']?.content ? (
                            <AdaptationEditor
                              content={adaptations['original'].content}
                              onSave={async (editedContent) => {
                                await saveAdaptationChanges('original', editedContent)
                                setIsEditing(false)
                              }}
                              onCancel={() => setIsEditing(false)}
                              isSaving={isSaving}
                            />
                          ) : (
                            <UnifiedAdaptation
                              mode="original"
                              lessonTitle={selectedLesson.title}
                              adaptedContent={adaptations['original']?.content}
                              originalContent={adaptations['original']?.originalContent || {
                                blocks: selectedLesson.blocks || []
                              }}
                              isStudent={false}
                              courseId={courseId}
                              lessonId={selectedLesson.id}
                              materialsAnalysis={materialsAnalysis}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-[#E5E7EB] rounded-lg p-6">
                          <UnifiedAdaptation
                            mode="original"
                            lessonTitle={selectedLesson.title}
                            originalContent={{
                              blocks: selectedLesson.blocks || []
                            }}
                            isStudent={false}
                            courseId={courseId}
                            lessonId={selectedLesson.id}
                            materialsAnalysis={materialsAnalysis}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {adaptations[currentMode]?.status === 'completed' || adaptations[currentMode]?.status === 'published' ? (
                        <div className="bg-white border-2 border-[#659AB8]/20 rounded-lg p-6">
                          {isEditing && adaptations[currentMode]?.content ? (
                            <AdaptationEditor
                              content={adaptations[currentMode].content}
                              onSave={async (editedContent) => {
                                await saveAdaptationChanges(currentMode, editedContent)
                                setIsEditing(false)
                              }}
                              onCancel={() => setIsEditing(false)}
                              isSaving={isSaving}
                            />
                          ) : (
                            <UnifiedAdaptation
                              mode={currentMode}
                              lessonTitle={selectedLesson.title}
                              adaptedContent={adaptations[currentMode]?.content}
                              originalContent={adaptations[currentMode]?.originalContent}
                              isStudent={false}
                              courseId={courseId}
                              lessonId={selectedLesson.id}
                              materialsAnalysis={materialsAnalysis}
                            />
                          )}
                        </div>
                      ) : adaptations[currentMode]?.status === 'processing' ? (
                        <div className="bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg p-6 text-center">
                          <RefreshCwIcon className="w-8 h-8 text-[#659AB8] animate-spin mx-auto mb-2" />
                          <p className="text-[#5589a7]">Адаптация в процессе...</p>
                        </div>
                      ) : adaptations[currentMode]?.status === 'error' ? (
                        <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-6 text-center">
                          <p className="text-slate-900 mb-4">Ошибка при адаптации контента</p>
                          <button
                            onClick={() => startAdaptation()}
                            className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                          >
                            Попробовать снова
                          </button>
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-[#E5E7EB] rounded-lg p-6 text-center">
                          <div className="w-16 h-16 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpenIcon className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-slate-600 mb-4">Адаптация ещё не создана</p>
                          <button
                            onClick={() => startAdaptation()}
                            className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] flex items-center gap-2 mx-auto"
                          >
                            <EditIcon className="w-4 h-4" />
                            Создать адаптацию
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
          onClose={() => setShowRegenerateConfirm(false)}
          onConfirm={regenerateAdaptation}
          title="Перегенерировать адаптацию?"
          message={`Вы уверены, что хотите перегенерировать адаптацию урока «${selectedLesson.title}»? Старая версия будет удалена, и будет создана новая версия.`}
          confirmText="Перегенерировать"
          cancelText="Отмена"
          confirmVariant="default"
        />
      )}

      <Toaster />
    </div>
  )
}
