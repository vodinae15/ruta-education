"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
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
    color: 'bg-gray-100 text-gray-800'
  },
  {
    id: 'visual',
    name: 'Визуал',
    description: 'Любит схемы, диаграммы, структурированную информацию',
    icon: <EyeIcon className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'auditory',
    name: 'Аудиал',
    description: 'Любит истории, диалоги, эмоциональные примеры',
    icon: <EarIcon className="w-5 h-5" />,
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'kinesthetic',
    name: 'Кинестетик',
    description: 'Любит практику, действия, интерактивные элементы',
    icon: <HandIcon className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-800'
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
      console.log("🔍 [Adaptation] Course data:", courseData)
      
      let lessons: any[] = []
      
      // Сначала проверяем поле modules.lessons в данных курса (основной источник для конструктора)
      if (courseData?.modules?.lessons && Array.isArray(courseData.modules.lessons) && courseData.modules.lessons.length > 0) {
        lessons = courseData.modules.lessons
        console.log("✅ [Adaptation] Found lessons in modules.lessons:", lessons.length)
        console.log("✅ [Adaptation] First lesson from modules:", lessons[0])
      }
      // Fallback: проверяем course_data.lessons
      else if (courseData?.course_data?.lessons && Array.isArray(courseData.course_data.lessons) && courseData.course_data.lessons.length > 0) {
        lessons = courseData.course_data.lessons
        console.log("✅ [Adaptation] Found lessons in course_data.lessons:", lessons.length)
        console.log("✅ [Adaptation] First lesson from course_data:", lessons[0])
      }
      // Fallback: проверяем отдельную таблицу course_lessons
      else {
        console.log("🔍 [Adaptation] Trying to load from course_lessons table...")
        console.log("🔍 [Adaptation] Course ID type:", typeof courseId, "Value:", courseId)
        
        // Пробуем загрузить уроки из таблицы course_lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true })

        if (lessonsError) {
          console.error("❌ [Adaptation] Error loading lessons from table:", lessonsError)
          console.error("❌ [Adaptation] Error code:", lessonsError.code)
          console.error("❌ [Adaptation] Error message:", lessonsError.message)
          console.error("❌ [Adaptation] Error details:", JSON.stringify(lessonsError, null, 2))
          console.error("❌ [Adaptation] Error hint:", lessonsError.hint)
          console.error("❌ [Adaptation] This might be a RLS (Row Level Security) policy issue")
        } else {
          console.log("🔍 [Adaptation] Query executed successfully")
          console.log("🔍 [Adaptation] Lessons data:", lessonsData)
          console.log("🔍 [Adaptation] Lessons data type:", typeof lessonsData)
          console.log("🔍 [Adaptation] Lessons data length:", lessonsData?.length)
          
          if (lessonsData && Array.isArray(lessonsData) && lessonsData.length > 0) {
            lessons = lessonsData
            console.log("✅ [Adaptation] Found lessons in course_lessons table:", lessons.length)
            console.log("✅ [Adaptation] First lesson:", lessons[0])
          } else {
            console.log("⚠️ [Adaptation] No lessons found in course_lessons table")
            console.log("⚠️ [Adaptation] lessonsData is:", lessonsData)
            console.log("⚠️ [Adaptation] Is array?", Array.isArray(lessonsData))
          }
        }
      }

      if (lessons.length === 0) {
        console.log("⚠️ [Adaptation] No lessons found in any source")
        console.log("🔍 [Adaptation] Course ID:", courseId)
        console.log("🔍 [Adaptation] Course data:", courseData)
        if (courseData) {
          console.log("🔍 [Adaptation] Course data keys:", Object.keys(courseData))
          console.log("🔍 [Adaptation] Course data.modules:", courseData.modules)
          console.log("🔍 [Adaptation] Course data.course_data:", courseData.course_data)
          if (courseData.course_data) {
            console.log("🔍 [Adaptation] Course data.course_data keys:", Object.keys(courseData.course_data))
            console.log("🔍 [Adaptation] Course data.course_data.lessons:", courseData.course_data.lessons)
          }
          if (courseData.modules) {
            console.log("🔍 [Adaptation] Course data.modules keys:", Object.keys(courseData.modules))
            console.log("🔍 [Adaptation] Course data.modules.lessons:", courseData.modules.lessons)
          }
          console.log("🔍 [Adaptation] Full course data JSON:", JSON.stringify(courseData, null, 2))
        } else {
          console.log("🔍 [Adaptation] Course data is null or undefined")
        }
        return []
      }

      // Преобразуем уроки в нужный формат
      const formattedLessons = lessons.map((lesson: any, index: number) => {
        console.log(`🔍 [Adaptation] Processing lesson ${index}:`, lesson)
        
        // Если урок уже имеет нужную структуру (из таблицы course_lessons)
        if (lesson.id && lesson.title) {
          const formatted = {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || "",
            blocks: lesson.blocks || [],
            materials: lesson.materials || [],
            tests: lesson.tests || [],
            order_index: lesson.order_index ?? lesson.order ?? index
          }
          console.log(`✅ [Adaptation] Formatted lesson ${index} (from table):`, formatted)
          return formatted
        }
        // Если урок из modules.lessons или course_data.lessons (может быть другим форматом)
        // Уроки из конструктора имеют структуру CourseLesson: { id, title, description, order, blocks, completed }
        else {
          const formatted = {
            id: lesson.id || lesson.lessonId || `lesson-${courseId}-${index}`,
            title: lesson.title || lesson.name || `Урок ${index + 1}`,
            description: lesson.description || "",
            blocks: lesson.blocks || lesson.content || [],
            materials: lesson.materials || [],
            tests: lesson.tests || [],
            order_index: lesson.order_index ?? lesson.order ?? index
          }
          console.log(`✅ [Adaptation] Formatted lesson ${index} (from modules/course_data):`, formatted)
          return formatted
        }
      })

      console.log("✅ [Adaptation] Formatted lessons:", formattedLessons.length)
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

      // Загружаем адаптации для каждого типа
      for (const type of adaptationTypes) {
        try {
          console.log(`🔍 [Adaptation] Loading ${type} adaptation for lesson ${lessonId}`)
          const response = await fetch(`/api/lesson-adaptation?lessonId=${encodeURIComponent(lessonId)}&courseId=${courseId}&type=${type}&includeUnpublished=true`)
          if (response.ok) {
            const data = await response.json()
            console.log(`📥 [Adaptation] Response for ${type}:`, {
              success: data.success,
              hasAdaptation: !!data.adaptation,
              status: data.adaptation?.status
            })
            if (data.success && data.adaptation) {
              // Преобразуем структуру данных адаптации
              const adaptationContent: AdaptationContent = {
                block1: data.adaptation.block1,
                block2: data.adaptation.block2,
                block3: data.adaptation.block3,
                block4: data.adaptation.block4,
                block5: data.adaptation.block5
              }
              
              // Вспомогательная функция для проверки, что блок не пустой
              const isBlockValid = (block: any): boolean => {
                if (!block) return false
                if (typeof block !== 'object') return false
                // Проверяем, что блок имеет хотя бы одно из обязательных полей
                return !!(block.intro || block.content || block.adaptation)
              }
              
              // Проверяем, что блоки не пустые
              const hasValidBlocks = !!(
                isBlockValid(adaptationContent.block1) || 
                isBlockValid(adaptationContent.block2) || 
                isBlockValid(adaptationContent.block3) || 
                isBlockValid(adaptationContent.block4) || 
                isBlockValid(adaptationContent.block5)
              )
              
              console.log(`✅ [Adaptation] Loaded ${type} adaptation:`, {
                hasBlock1: !!adaptationContent.block1,
                hasBlock2: !!adaptationContent.block2,
                hasBlock3: !!adaptationContent.block3,
                hasBlock4: !!adaptationContent.block4,
                hasBlock5: !!adaptationContent.block5,
                hasValidBlocks: hasValidBlocks,
                block1Type: typeof adaptationContent.block1,
                block1Value: adaptationContent.block1 ? 'exists' : 'null/undefined',
                block1Keys: adaptationContent.block1 && typeof adaptationContent.block1 === 'object' ? Object.keys(adaptationContent.block1) : 'N/A'
              })
              
              // Если блоки пустые, логируем предупреждение
              if (!hasValidBlocks) {
                console.warn(`⚠️ [Adaptation] ${type} adaptation exists but all blocks are empty/null`)
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
              // Если адаптация не найдена (data.adaptation === null), создаем пустую запись
              console.log(`⚠️ [Adaptation] ${type} adaptation not found`)
              loadedAdaptations[type] = {
                studentType: type,
                status: 'pending',
                progress: 0
              }
            }
          } else {
            // Если ответ не OK, логируем, но не показываем ошибку пользователю
            console.warn(`⚠️ [Adaptation] Failed to load ${type} adaptation:`, response.status, response.statusText)
            loadedAdaptations[type] = {
              studentType: type,
              status: 'pending',
              progress: 0
            }
          }
        } catch (error) {
          console.error(`❌ [Adaptation] Error loading adaptation for ${type}:`, error)
          // Создаем пустую запись при ошибке
          loadedAdaptations[type] = {
            studentType: type,
            status: 'pending',
            progress: 0
          }
        }
      }
      
      console.log(`📊 [Adaptation] Loaded adaptations:`, Object.keys(loadedAdaptations).map(key => ({
        type: key,
        status: loadedAdaptations[key].status,
        hasContent: !!loadedAdaptations[key].content
      })))

      // Загружаем метаданные адаптации (передаем courseId для поиска урока в modules.lessons)
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

      // Сначала пытаемся найти урок в modules.lessons (основной источник)
      if (course.modules?.lessons && Array.isArray(course.modules.lessons)) {
        lessonData = course.modules.lessons.find((lesson: any) => lesson.id === lessonId)
      }

      // Если урок не найден в modules.lessons, пробуем найти в course_data.lessons
      if (!lessonData && course.course_data?.lessons && Array.isArray(course.course_data.lessons)) {
        lessonData = course.course_data.lessons.find((lesson: any) => lesson.id === lessonId)
      }

      // Если урок все еще не найден, пробуем загрузить из таблицы course_lessons
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
          // Игнорируем ошибку, если урок не найден в таблице (это нормально для уроков из modules.lessons)
          console.log("Lesson not found in course_lessons table, using modules.lessons:", error)
        }
      }

      if (!lessonData) {
        console.error("Error: Lesson not found in any source")
        return
      }

      // Преобразуем блоки урока в формат оригинального контента
      const originalContent = {
        blocks: (lessonData.blocks || []).map((block: any, index: number) => ({
          title: block.title || `Блок ${index + 1}`,
          content: block.content || block.text || "",
          type: block.type || "text",
          elements: block.elements || [] // Добавляем элементы (для тестов)
        }))
      }

      // Добавляем оригинальный контент во все адаптации
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
        // Получаем текущего пользователя
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
          router.push("/auth")
          return
        }

        setUser(currentUser)

        // Проверяем, что это преподаватель
        if (currentUser.user_metadata?.user_type !== "teacher") {
          router.push("/student-dashboard")
          return
        }

        // Загружаем информацию о курсе
        // Проверяем доступ: автор или соавтор
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, description, status, author_id, course_data, modules")
          .eq("id", courseId)
          .single()

        if (courseError || !courseData) {
          setError("Курс не найден")
          return
        }

        // Проверяем доступ к редактированию
        const isAuthor = courseData.author_id === currentUser.id
        if (!isAuthor) {
          // Проверяем, является ли соавтором
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
        
        // ДИАГНОСТИКА: Выводим полную структуру данных курса
        console.log("🔍 [Adaptation] ===== COURSE DATA DIAGNOSTICS =====")
        console.log("🔍 [Adaptation] Course ID:", courseId)
        console.log("🔍 [Adaptation] Course title:", courseData.title)
        console.log("🔍 [Adaptation] Course data keys:", Object.keys(courseData))
        console.log("🔍 [Adaptation] Course data.modules:", courseData.modules)
        console.log("🔍 [Adaptation] Course data.modules type:", typeof courseData.modules)
        console.log("🔍 [Adaptation] Course data.modules.lessons:", courseData.modules?.lessons)
        console.log("🔍 [Adaptation] Course data.modules.lessons type:", typeof courseData.modules?.lessons)
        console.log("🔍 [Adaptation] Course data.modules.lessons is array?", Array.isArray(courseData.modules?.lessons))
        console.log("🔍 [Adaptation] Course data.modules.lessons length:", courseData.modules?.lessons?.length)
        console.log("🔍 [Adaptation] Course data.course_data:", courseData.course_data)
        console.log("🔍 [Adaptation] Course data.course_data type:", typeof courseData.course_data)
        console.log("🔍 [Adaptation] Full course data:", JSON.stringify(courseData, null, 2))
        console.log("🔍 [Adaptation] ===== END DIAGNOSTICS =====")
        
        // Загружаем уроки из БД (передаем данные курса для проверки модулей)
        const loadedLessons = await loadLessonsFromDB(courseId, courseData)
        console.log('✅ [Adaptation] LOADED LESSONS FROM DB:', loadedLessons)
        console.log('📊 [Adaptation] Number of lessons found:', loadedLessons.length)
        
        if (loadedLessons.length === 0) {
          console.error("❌ [Adaptation] ===== NO LESSONS FOUND =====")
          console.error("❌ [Adaptation] Course ID:", courseId)
          console.error("❌ [Adaptation] Course data exists?", !!courseData)
          console.error("❌ [Adaptation] Course data.modules exists?", !!courseData?.modules)
          console.error("❌ [Adaptation] Course data.modules.lessons exists?", !!courseData?.modules?.lessons)
          console.error("❌ [Adaptation] Course data.modules.lessons:", courseData?.modules?.lessons)
          console.error("❌ [Adaptation] Course data.course_data exists?", !!courseData?.course_data)
          console.error("❌ [Adaptation] Course data.course_data.lessons exists?", !!courseData?.course_data?.lessons)
          console.error("❌ [Adaptation] Full course data JSON:", JSON.stringify(courseData, null, 2))
          console.error("❌ [Adaptation] ===== END ERROR DIAGNOSTICS =====")
        }
        
        setLessons(loadedLessons)
        
        // Выбираем первый урок по умолчанию
        if (loadedLessons.length > 0) {
          const firstLesson = loadedLessons[0]
          setSelectedLesson(firstLesson)
          console.log('Selected lesson:', firstLesson)
          
          // Загружаем адаптации для первого урока
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

  // Загружаем адаптации при изменении выбранного урока
  useEffect(() => {
    if (selectedLesson) {
      loadAdaptationsFromDB(selectedLesson.id)
      loadOriginalContent(selectedLesson.id)
    }
  }, [selectedLesson])

  // Проверяем, есть ли уже адаптации
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

    // Показываем уведомление о начале адаптации
    toast({
      title: "Запущена адаптация урока",
      description: `Адаптация урока "${selectedLesson.title}" для всех режимов представления материала начата. Это может занять несколько минут.`,
    })

    // Инициализируем адаптации
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
    
    // Запускаем адаптацию для каждого режима представления материала
    const adaptationPromises = STUDENT_TYPES.map(async (studentType, index) => {
      try {
        // Обновляем статус на "обработка"
        setAdaptations(prev => ({
          ...prev,
          [studentType.id]: {
            ...prev[studentType.id],
            status: 'processing',
            progress: 10
          }
        }))
        setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 10 }))

        // Преобразуем урок в формат, ожидаемый API
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

        console.log('📤 [Adaptation] Sending adaptation request:', {
          lessonId: selectedLesson.id,
          studentType: studentType.id,
          lessonContent: {
            title: lessonContent.title,
            blocksCount: lessonContent.blocks.length,
            hasDescription: !!lessonContent.description
          }
        })

        const response = await fetch('/api/ai-adaptation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonContent,
            studentType: studentType.id,
            lessonId: selectedLesson.id,
            courseId: courseId, // Передаем courseId для проверки доступа
            forceRegenerate: false // Для обычной адаптации не перегенерируем
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
          
          console.error('❌ [Adaptation] API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
          
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
            title: `Ошибка адаптации для ${studentType.name}`,
            description: errorData.error || `Ошибка сервера: ${response.status} ${response.statusText}`,
            variant: "destructive",
          })
          return
        }

        const result = await response.json()

        if (result.success) {
          // Адаптация сохраняется в БД автоматически через API
          // Загружаем обновленную адаптацию из БД
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

          // Показываем уведомление об успешной адаптации
          toast({
            title: `Адаптация для ${studentType.name} завершена`,
            description: `Урок успешно адаптирован для типа "${studentType.name}".`,
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

          // Показываем уведомление об ошибке
          toast({
            title: `Ошибка адаптации для ${studentType.name}`,
            description: result.error || "Произошла ошибка при адаптации урока.",
            variant: "destructive",
          })
        }

        // Обновляем общий прогресс
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

        // Показываем уведомление об ошибке
        toast({
          title: `Ошибка адаптации для ${studentType.name}`,
          description: error.message || "Произошла ошибка при адаптации урока.",
          variant: "destructive",
        })
      }
    })

    await Promise.all(adaptationPromises)
    setOverallProgress(100)
    setIsAdapting(false)
    
    // Перезагружаем адаптации из БД после завершения
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

    // Показываем уведомление о начале перегенерации
    toast({
      title: "Перегенерация адаптации урока",
      description: `Адаптация урока "${selectedLesson.title}" перегенерируется для всех режимов представления материала. Старая версия будет удалена.`,
    })

    // Инициализируем адаптации
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
    
    // Запускаем адаптацию для каждого режима представления материала
    const adaptationPromises = STUDENT_TYPES.map(async (studentType, index) => {
      try {
        // Обновляем статус на "обработка"
        setAdaptations(prev => ({
          ...prev,
          [studentType.id]: {
            ...prev[studentType.id],
            status: 'processing',
            progress: 10
          }
        }))
        setAdaptationProgress(prev => ({ ...prev, [studentType.id]: 10 }))

        // Преобразуем урок в формат, ожидаемый API
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

        console.log('📤 [Adaptation] Sending regeneration request:', {
          lessonId: selectedLesson.id,
          studentType: studentType.id,
          forceRegenerate: true
        })

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
            forceRegenerate: true // Перегенерируем - удаляем старую версию
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
          
          console.error('❌ [Adaptation] API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
          
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
            title: `Ошибка адаптации для ${studentType.name}`,
            description: errorData.error || `Ошибка сервера: ${response.status} ${response.statusText}`,
            variant: "destructive",
          })
          return
        }

        const result = await response.json()

        if (result.success) {
          // Адаптация сохраняется в БД автоматически через API
          // Загружаем обновленную адаптацию из БД
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

          // Показываем уведомление об успешной перегенерации
          toast({
            title: `Перегенерация для ${studentType.name} завершена`,
            description: `Урок успешно перегенерирован для типа "${studentType.name}". Старая версия удалена.`,
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

          // Показываем уведомление об ошибке
          toast({
            title: `Ошибка перегенерации для ${studentType.name}`,
            description: result.error || "Произошла ошибка при перегенерации урока.",
            variant: "destructive",
          })
        }

        // Обновляем общий прогресс
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

        // Показываем уведомление об ошибке
        toast({
          title: `Ошибка перегенерации для ${studentType.name}`,
          description: error.message || "Произошла ошибка при перегенерации урока.",
          variant: "destructive",
        })
      }
    })

    await Promise.all(adaptationPromises)
    setOverallProgress(100)
    setIsAdapting(false)
    
    // Перезагружаем адаптации из БД после завершения
    if (selectedLesson) {
      await loadAdaptationsFromDB(selectedLesson.id)
    }

    // Показываем итоговое уведомление на основе актуальных данных
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

  // Сохранение изменений в адаптации
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
        const result = await response.json()
        console.log('Adaptation saved:', result)
        
        // Обновляем адаптацию в состоянии
        setAdaptations(prev => ({
          ...prev,
          [adaptationType]: {
            ...prev[adaptationType],
            content,
            status: 'completed'
          }
        }))

        // Показываем уведомление об успешном сохранении
        toast({
          title: "Изменения сохранены",
          description: `Адаптация для типа "${adaptationType}" успешно сохранена.`,
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: "Неизвестная ошибка" }))
        console.error('Error saving adaptation:', response.status)
        
        // Показываем уведомление об ошибке
        toast({
          title: "Ошибка сохранения",
          description: errorData.error || "Не удалось сохранить изменения.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('Error saving adaptation:', error)
      
      // Показываем уведомление об ошибке
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Произошла ошибка при сохранении.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Публикация адаптации
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
        // Обновляем статус адаптации
        setAdaptations(prev => ({
          ...prev,
          [adaptationType]: {
            ...prev[adaptationType],
            status: 'published'
          }
        }))

        // Показываем уведомление об успешной публикации
        toast({
          title: "Адаптация опубликована",
          description: `Адаптация для режима "${adaptationType}" теперь доступна для студентов.`,
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: "Неизвестная ошибка" }))
        console.error('Error publishing adaptation:', response.status)
        
        // Показываем уведомление об ошибке
        toast({
          title: "Ошибка публикации",
          description: errorData.error || "Не удалось опубликовать адаптацию.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('Error publishing adaptation:', error)
      
      // Показываем уведомление об ошибке
      toast({
        title: "Ошибка публикации",
        description: error.message || "Произошла ошибка при публикации.",
        variant: "destructive",
      })
    }
  }

  // Публикация всех адаптаций урока
  const publishAllAdaptations = async () => {
    if (!selectedLesson) return

    setIsPublishingAll(true)
    try {
      const adaptationTypes: AdaptationType[] = ['visual', 'auditory', 'kinesthetic', 'original']
      const publishPromises = adaptationTypes.map(async (type) => {
        // Публикуем только если адаптация существует и не опубликована
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

      // Обновляем статусы адаптаций
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

      // Перезагружаем адаптации из БД
      await loadAdaptationsFromDB(selectedLesson.id)

      // Показываем уведомление
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
      console.error('Error publishing all adaptations:', error)
      toast({
        title: "Ошибка публикации",
        description: error.message || "Произошла ошибка при публикации адаптаций.",
        variant: "destructive",
      })
    } finally {
      setIsPublishingAll(false)
    }
  }

  // Проверяем, есть ли неопубликованные адаптации
  const hasUnpublishedAdaptations = () => {
    return Object.values(adaptations).some(adaptation => 
      (adaptation.status === 'completed' || adaptation.status === 'edited') && adaptation.content
    )
  }

  const extractCourseContent = (course: Course): string => {
    if (!course.course_data?.blocks) {
      return course.description || course.title
    }

    let content = `Курс: ${course.title}\n\n`
    if (course.description) {
      content += `Описание: ${course.description}\n\n`
    }

    course.course_data.blocks.forEach((block, index) => {
      content += `Блок ${index + 1}: ${block.title || 'Без названия'}\n`
      if (block.description) {
        content += `${block.description}\n`
      }
      if (block.elements) {
        block.elements.forEach((element: any) => {
          if (element.content) {
            content += `${element.content}\n`
          }
        })
      }
      content += '\n'
    })

    return content
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'processing':
        return <RefreshCwIcon className="w-5 h-5 text-blue-600 animate-spin" />
      case 'error':
        return <div className="w-5 h-5 bg-red-600 rounded-full" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-8 w-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
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

  if (error || !course) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border-2 rounded-lg shadow-ruta-sm">
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">{error || "Курс не найден"}</p>
            <Button onClick={() => router.push("/dashboard")} className="bg-primary hover:bg-primary/90 text-white">
              Вернуться в дашборд
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />
      
      <PageHeader
        title="Просмотр адаптации курса"
        description={`Как курс "${course.title}" будет выглядеть для разных режимов представления материала`}
        breadcrumbs={[
          { label: "Главная", href: "/" },
          { label: "Дашборд", href: "/dashboard" },
          { label: course.title, href: `/course/${courseId}` },
          { label: "Просмотр адаптации" }
        ]}
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(`/course/${courseId}`)}
              className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              К курсу
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              В дашборд
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Информация о курсе */}
          <Card className="bg-white border-2 rounded-lg shadow-ruta-sm mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-primary font-bold">
                Информация о курсе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{course.title}</h3>
                  {course.description && (
                    <p className="text-slate-600 mt-1">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="border-primary text-primary">
                    {course.status}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    ID курса: <span className="font-mono text-xs">{course.id}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Выбор урока */}
          {lessons.length > 0 && (
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm mb-8">
              <CardHeader>
                <CardTitle className="text-lg text-primary font-bold">
                  Выберите урок для адаптации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <Button
                      key={lesson.id}
                      variant={selectedLesson?.id === lesson.id ? "primary" : "secondary"}
                      onClick={() => setSelectedLesson(lesson)}
                      className="h-auto p-4 text-left justify-start"
                    >
                      <div>
                        <div className="font-semibold">{lesson.title}</div>
                        {lesson.description && (
                          <div className="text-sm opacity-75 mt-1">
                            {lesson.description.length > 100 
                              ? `${lesson.description.substring(0, 100)}...` 
                              : lesson.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Информация о системе */}
          <Card className={`border-2 mb-4 ${lessons.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'}`}>
            <CardContent className="py-4">
              <h4 className={`font-semibold mb-2 ${lessons.length > 0 ? 'text-yellow-800' : 'text-slate-800'}`}>
                {lessons.length > 0 ? '🤖 ИИ-адаптация активна' : '⚠️ Уроки не найдены'}
              </h4>
              <div className={`text-sm ${lessons.length > 0 ? 'text-yellow-700' : 'text-slate-700'}`}>
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
                    <p className="mt-2 text-xs">
                      Откройте консоль браузера (F12) для подробной информации о загрузке уроков. Ищите логи с префиксом <code className="bg-slate-100 px-1 rounded">[Adaptation]</code>.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Кнопка запуска/перегенерации адаптации */}
          {selectedLesson && (
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm mb-8">
              <CardContent className="py-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {hasExistingAdaptations() ? 'Перегенерировать адаптацию урока' : 'Запустить адаптацию урока'}
                  </h3>
                  <p className="text-slate-600 mb-2">
                    {hasExistingAdaptations() 
                      ? `ИИ перегенерирует адаптацию урока "${selectedLesson.title}" для всех режимов представления материала. Старая версия будет удалена.`
                      : `ИИ адаптирует урок "${selectedLesson.title}" для всех режимов представления материала`
                    }
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    Визуалы, аудиалы, кинестетики и оригинальная версия
                  </p>
                  <div className="flex gap-3 justify-center">
                    {!hasExistingAdaptations() && (
                      <Button
                        onClick={startAdaptation}
                        disabled={isAdapting}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
                      >
                        {isAdapting ? (
                          <>
                            <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                            Адаптация в процессе...
                          </>
                        ) : (
                          <>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Запустить адаптацию
                          </>
                        )}
                      </Button>
                    )}
                    {hasExistingAdaptations() && (
                      <Button
                        onClick={handleRegenerateClick}
                        disabled={isAdapting}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
                      >
                        {isAdapting ? (
                          <>
                            <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                            Перегенерация в процессе...
                          </>
                        ) : (
                          <>
                            <RefreshCwIcon className="w-4 h-4 mr-2" />
                            Перегенерировать адаптацию
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Прогресс-бар */}
          {isAdapting && (
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm mb-8">
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
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-slate-700">Прогресс по типам:</h4>
                    {STUDENT_TYPES.map((type) => {
                      const progress = adaptationProgress[type.id] || 0
                      const status = adaptations[type.id]?.status || 'pending'
                      
                      return (
                        <div key={type.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {type.icon}
                              <span className="text-slate-700">{type.name}</span>
                              {status === 'processing' && (
                                <RefreshCwIcon className="w-3 h-3 text-blue-600 animate-spin" />
                              )}
                              {status === 'completed' && (
                                <CheckCircleIcon className="w-3 h-3 text-green-600" />
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
            <Card className="bg-slate-50 border-2 border-slate-200 mb-8">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <LightbulbIcon className="w-5 h-5" />
                  Рекомендации по улучшению контента
                </CardTitle>
                <CardDescription className="text-slate-700">
                  Следующие рекомендации помогут улучшить качество адаптации для разных режимов представления материала
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materialsAnalysis.recommendations.map((rec: any, index: number) => {
                    const priority = rec.priority || 'medium'
                    // Все плашки с рекомендациями теперь желтые
                    const priorityColors = {
                      high: 'text-yellow-800 bg-yellow-50 border-yellow-200',
                      medium: 'text-yellow-800 bg-yellow-50 border-yellow-200',
                      low: 'text-yellow-800 bg-yellow-50 border-yellow-200'
                    }
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium}`}
                      >
                        <div className="flex items-start gap-2">
                          <LightbulbIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{rec.message}</p>
                            {rec.type && (
                              <p className="text-xs mt-1 opacity-75">
                                Тип материала: {rec.type === 'audio' ? 'Аудио' : rec.type === 'visual' ? 'Визуальный' : rec.type === 'practice' ? 'Практика' : rec.type}
                              </p>
                            )}
                          </div>
                          {priority === 'high' && (
                            <Badge className="bg-yellow-600 text-white text-xs">Важно</Badge>
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
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
              <CardHeader>
                <CardTitle className="text-xl text-primary font-bold">
                  Просмотр адаптации урока
                </CardTitle>
                <CardDescription>
                  Посмотрите, как ваш урок будет восприниматься разными режимами представления материала
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Переключатель режимов */}
                  <div className="flex items-center justify-between">
                    <AdaptationModeSwitcher
                      currentMode={currentMode}
                      onModeChange={setCurrentMode}
                      availableModes={['visual', 'auditory', 'kinesthetic', 'original']}
                    />
                    <div className="flex gap-2">
                      {hasUnpublishedAdaptations() && (
                        <Button
                          onClick={publishAllAdaptations}
                          disabled={isPublishingAll}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isPublishingAll ? (
                            <>
                              <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                              Публикация...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4 mr-2" />
                              Опубликовать все адаптации
                            </>
                          )}
                        </Button>
                      )}
                      {(adaptations[currentMode]?.content || (currentMode === 'original' && (adaptations['original']?.status === 'completed' || adaptations['original']?.status === 'published'))) && (
                        <>
                          <Button
                            onClick={() => setIsEditing(!isEditing)}
                            variant={isEditing ? "primary" : "secondary"}
                            className={isEditing ? "bg-primary hover:bg-primary/90 text-white" : "border-primary text-primary hover:bg-primary/5"}
                          >
                            <EditIcon className="w-4 h-4 mr-2" />
                            {isEditing ? 'Закрыть редактор' : 'Редактировать'}
                          </Button>
                          {!isEditing && adaptations[currentMode]?.status !== 'published' && (
                            <Button
                              onClick={() => publishAdaptation(currentMode)}
                              className="bg-primary hover:bg-primary/90 text-white"
                            >
                              <CheckCircleIcon className="w-4 h-4 mr-2" />
                              Опубликовать
                            </Button>
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
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
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
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                          <RefreshCwIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                          <p className="text-blue-800">Адаптация в процессе...</p>
                        </div>
                      ) : adaptations[currentMode]?.status === 'error' ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                          <p className="text-red-800">Ошибка при адаптации контента</p>
                          <Button
                            onClick={() => startAdaptation()}
                            className="mt-4 bg-primary hover:bg-primary/90 text-white"
                          >
                            Попробовать снова
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
                          <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-4">Адаптация еще не создана</p>
                          <Button
                            onClick={() => startAdaptation()}
                            className="bg-primary hover:bg-primary/90 text-white"
                          >
                            <EditIcon className="w-4 h-4 mr-2" />
                            Создать адаптацию
                          </Button>
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
          message={`Вы уверены, что хотите перегенерировать адаптацию урока "${selectedLesson.title}"? Старая версия будет удалена, и будет создана новая версия.`}
          confirmText="Перегенерировать"
          cancelText="Отмена"
          confirmVariant="default"
        />
      )}
      
      <Toaster />
    </div>
  )
}
