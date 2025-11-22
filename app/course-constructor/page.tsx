"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import {
  getTemplateForAuthorType,
  getStandardTemplate,
  getContextualHints,
  getPersonalizedInterface,
  checkLessonElements,
  generateDynamicHints,
  type CourseBlock,
  type CourseElement,
  type DynamicHint,
} from "@/lib/course-constructor-logic"
import {
  PlayIcon,
  FileTextIcon,
  ImageIcon,
  CheckCircleIcon,
  MessageCircleIcon,
  DownloadIcon,
  HelpCircleIcon,
  TrashIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  GripVerticalIcon,
  EyeOffIcon,
  BookOpenIcon,
  ClipboardListIcon,
  TargetIcon,
  XIcon,
  UsersIcon,
} from "@/components/ui/icons"

import { Notification } from "@/components/ui/notification"
import { CourseActionModal } from "@/components/ui/course-action-modal"
import { CourseCollaboratorsManager } from "@/components/ui/course-collaborators-manager"
import { TestCreator } from "@/components/test-creator"
import { PricingEditor } from "@/components/ui/pricing-editor"
import { toast } from "@/components/ui/use-toast"
import { createBrowserClient } from "@supabase/ssr"
import { AudioUpload } from "@/components/ui/audio-upload"
import { createDefaultPricing } from "@/lib/course-pricing"
import { VideoUpload } from "@/components/ui/video-upload"
import { ImageLibrary } from "@/components/ui/image-library"
import { ModeSwitchWarning } from "@/components/ui/mode-switch-warning"

type ElementMode = "lesson" | "notes"
type EducationalBlockType = "theory" | "example" | "practice" | "knowledge_check"

interface ExtendedCourseElement extends CourseElement {
  mode: ElementMode
  educationalType?: EducationalBlockType
}

interface ExtendedCourseBlock extends Omit<CourseBlock, "elements"> {
  elements: ExtendedCourseElement[]
}

interface AuthorProfile {
  author_type: string
  communication_style: string
  motivation: string
  barrier: string
  test_results: any
}

interface AIHint {
  id: string
  type: "structure" | "content" | "personalized"
  message: string
  blockId?: string
  elementType?: string
}

interface TestData {
  question: string
  answers: Array<{
    id: string
    text: string
    correct: boolean
  }>
  multipleChoice: boolean
  attempts: number
  showCorrectAnswers: boolean
}

interface AccentElement {
  buttonText: string
  visibleHint: string
  color: string
}

interface PedagogicalHints {
  main: string
  structural: string
}

interface CourseLesson {
  id: string
  title: string
  description: string
  order: number
  blocks: ExtendedCourseBlock[]
  completed: boolean
}

const loadPersonalizedTemplate = () => {
  // Placeholder for loadPersonalizedTemplate function
}

const getAccentElement = (authorType: string): AccentElement => {
  switch (authorType) {
    case "Оратор":
      return {
        buttonText: "Добавить голосовую заметку",
        visibleHint: "Проще всего начать вслух — мы переведём это в черновик, с которым ты сможешь дальше работать",
        color: "bg-blue-100 border-blue-300 text-blue-800",
      }
    case "Методист":
      return {
        buttonText: "Добавить план / схему",
        visibleHint: "Начни с плана: 3–5 пунктов — потом легко развернуть в содержание",
        color: "bg-cream border-primary text-primary",
      }
    case "Автор на вдохновении":
      return {
        buttonText: "Записать идею в потоке",
        visibleHint: "Не думай о форме — зафиксируй первую идею, а дальше мы поможем её оформить",
        color: "bg-purple-100 border-purple-300 text-purple-800",
      }
    case "Первопроходец":
      return {
        buttonText: "Написать приветствие",
        visibleHint: "Твоя история — лучший старт. Скажи пару предложений о себе и о пользе курса",
        color: "bg-orange-100 border-orange-300 text-orange-800",
      }
    case "Загруженный эксперт":
      return {
        buttonText: "Загрузить материалы",
        visibleHint: "Кидай как есть или наговори три идеи — мы сами разложим по шагам",
        color: "bg-red-100 border-red-300 text-red-800",
      }
    case "Педагог с эмпатией":
      return {
        buttonText: "Добавить объяснение простыми словами",
        visibleHint: "Скажи так, чтобы понял человек, который сталкивается с этим впервые",
        color: "bg-teal-100 border-teal-300 text-teal-800",
      }
    case "Практик-рационал":
      return {
        buttonText: "Добавить шаг",
        visibleHint: "Каждый шаг = действие ученика. Два–четыре шага дадут понятный результат",
        color: "bg-indigo-100 border-indigo-300 text-indigo-800",
      }
    case "Интуитивный автор":
      return {
        buttonText: "Добавить что угодно",
        visibleHint: "Выбери любимый формат и начни — мы поможем собрать это в целостный урок",
        color: "bg-pink-100 border-pink-300 text-pink-800",
      }
    default:
      return {
        buttonText: "Добавить контент",
        visibleHint: "Начните с любого удобного формата",
        color: "bg-gray-100 border-gray-300 text-gray-800",
      }
  }
}

const getPedagogicalHints = (authorType: string): PedagogicalHints => {
  switch (authorType) {
    case "Оратор":
      return {
        main: "Сформулируй вслух одну ключевую мысль — это станет сердцем блока. Остальное можно добавить вокруг",
        structural:
          "Хочешь опереться на универсальный каркас урока?\n\n1. Ввод (1–2 мин)\n2. Основной смысл (3–5 мин)\n3. Пример (2–3 мин)\n4. Микропрактика (2–3 мин)\n5. Вывод (1 мин)",
      }
    case "Методист":
      return {
        main: "Сначала назови 3–5 ключевых шагов. Каждый шаг станет отдельным блоком",
        structural:
          "Каркас урока:\n\n1. Ввод (1–2 мин)\n2. Шаги (3–5 мин)\n3. Пример (2–3 мин)\n4. Практика (2–3 мин)\n5. Вывод (1 мин)",
      }
    case "Автор на вдохновении":
      return {
        main: "Скажи одну мысль, которая прямо сейчас для тебя важна. Она станет первым шагом урока",
        structural:
          "Простая схема:\n\n1. Мысль-вдохновение (1–2 мин)\n2. История (2–3 мин)\n3. Мини-задание (2–3 мин)\n4. Вывод (1 мин)",
      }
    case "Первопроходец":
      return {
        main: "Начни с приветствия: расскажи, кто ты и чем твой курс поможет ученику",
        structural:
          "Мини-структура:\n\n1. Приветствие (1–2 мин)\n2. Ключевая мысль (3–4 мин)\n3. Маленькое задание (2–3 мин)\n4. Итог (1 мин)",
      }
    case "Загруженный эксперт":
      return {
        main: "Не трать время на оформление — загрузи материалы или набросай идеи. Мы сделаем из этого черновик урока",
        structural:
          "Быстрый каркас:\n\n1. Ввод (1 мин)\n2. Ключевые шаги (по 2–3 мин)\n3. Практика (2–3 мин)\n4. Итог (1 мин)",
      }
    case "Педагог с эмпатией":
      return {
        main: "Скажи так, чтобы понял человек, который впервые сталкивается с этим",
        structural:
          "Каркас понятного урока:\n\n1. Объяснение (3–4 мин)\n2. Пример (2–3 мин)\n3. Вопрос/практика (2–3 мин)\n4. Вывод (1–2 мин)",
      }
    case "Практик-рационал":
      return {
        main: "Начни с проблемы: что мы хотим решить? Затем добавь первый шаг к решению",
        structural:
          "Каркас практического урока:\n\n1. Проблема (1–2 мин)\n2. Шаги (2–3 по 2–3 мин)\n3. Пример применения (2–3 мин)\n4. Итог/результат (1–2 мин)",
      }
    case "Интуитивный автор":
      return {
        main: "Начни с того, что вдохновляет — фото, текст, голос. Это станет первым шагом урока",
        structural:
          "Простая схема:\n\n1. Идея (что важно)\n2. Пример (как выглядит)\n3. Действие (что сделать самому)\n4. Вывод (к чему пришли)",
      }
    default:
      return {
        main: "Начните с одной ключевой идеи и развивайте её пошагово",
        structural: "Базовая структура:\n\n1. Дополнительный блок\n2. Основная часть\n3. Практика\n4. Заключение",
      }
  }
}

// Компонент для загрузки файлов с распознаванием PDF/DOCX
function FileUploadElement({
  elementId,
  blockId,
  currentContent,
  onContentUpdate,
}: {
  elementId: string
  blockId: string
  currentContent: string
  onContentUpdate: (blockId: string, elementId: string, content: string) => void
}) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    onContentUpdate(blockId, elementId, `Файл: ${file.name}`)
  }

  const handleExtractText = async () => {
    if (!uploadedFile) return

    const fileType = uploadedFile.type.toLowerCase()
    const fileName = uploadedFile.name.toLowerCase()
    
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    const isDOCX = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   fileName.endsWith('.docx')

    if (!isPDF && !isDOCX) {
      alert('Распознавание доступно только для PDF и DOCX файлов')
      return
    }

    setIsExtracting(true)
    
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const { transcription } = await response.json()
        onContentUpdate(blockId, elementId, transcription)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Ошибка при извлечении текста из файла')
      }
    } catch (error) {
      console.error('Ошибка извлечения текста:', error)
      alert('Ошибка при извлечении текста из файла')
    } finally {
      setIsExtracting(false)
    }
  }

  const isDocumentFile = uploadedFile && (
    uploadedFile.type.toLowerCase() === 'application/pdf' ||
    uploadedFile.name.toLowerCase().endsWith('.pdf') ||
    uploadedFile.type.toLowerCase() === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    uploadedFile.name.toLowerCase().endsWith('.docx')
  )

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={handleFileUpload}
        className="hidden"
        id={`file-${elementId}`}
      />
      <label htmlFor={`file-${elementId}`} className="cursor-pointer">
        <div className="text-gray-500">
          <p className="text-sm">Выберите файл (PDF, DOCX)</p>
        </div>
      </label>
      
      {uploadedFile && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{uploadedFile.name}</p>
          {isDocumentFile && (
            <Button
              onClick={handleExtractText}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 mx-auto"
              disabled={isExtracting}
            >
              <FileTextIcon className="w-4 h-4" />
              {isExtracting ? 'Распознавание...' : 'Распознать'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CourseConstructor() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null)
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([])
  const [activeLessonId, setActiveLessonId] = useState<string>("")
  const [courseBlocks, setCourseBlocks] = useState<ExtendedCourseBlock[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string>("")
  const [courseTitle, setCourseTitle] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  const [contextualHints, setContextualHints] = useState<string[]>([])
  const [aiHints, setAiHints] = useState<AIHint[]>([])
  const [personalizedInterface, setPersonalizedInterface] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showTestPrompt, setShowTestPrompt] = useState(false)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null)
  const [constructorMode, setConstructorMode] = useState<"standard" | "personalized">("standard")
  const [notification, setNotification] = useState<{
    type: "draft" | "published"
    isVisible: boolean
    courseLink?: string
  }>({
    type: "draft",
    isVisible: false,
  })
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: "save" | "publish" | "hide" | null
    courseLink?: string
  }>({
    isOpen: false,
    type: null,
  })

  const [inviteEmails, setInviteEmails] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean
    validEmails: string[]
    invalidEmails: string[]
    duplicateEmails: string[]
  }>({ isValid: true, validEmails: [], invalidEmails: [], duplicateEmails: [] })

  const [studentsWithAccess, setStudentsWithAccess] = useState<Array<{
    id: string
    email: string
    first_accessed_at: string
    last_accessed_at: string
    progress: any
  }>>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null)
  
  // Состояние для модального окна подтверждения удаления доступа
  const [showRemoveAccessModal, setShowRemoveAccessModal] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<{ accessId: string; email: string } | null>(null)

  const [showStructuralHint, setShowStructuralHint] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [isCourseAuthor, setIsCourseAuthor] = useState(false)

  // Состояния для переключения режимов
  const [showModeSwitchWarning, setShowModeSwitchWarning] = useState(false)
  const [pendingMode, setPendingMode] = useState<"standard" | "personalized" | null>(null)
  
  // Состояния для динамических подсказок
  const [dynamicHints, setDynamicHints] = useState<DynamicHint[]>([])
  const [activeHint, setActiveHint] = useState<DynamicHint | null>(null)
  const [dismissedHints, setDismissedHints] = useState<string[]>([])

  // Состояния для тарифов и режима запуска
  const [coursePricing, setCoursePricing] = useState<Array<{
    id: string
    name: string
    price: number
    description: string
    has_feedback: boolean
    bonus_content?: string | null
    is_default: boolean
    order_index: number
  }>>([])
  const [launchMode, setLaunchMode] = useState<"stream" | "permanent" | null>(null)
  const [streamStartDate, setStreamStartDate] = useState("")
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [updatingPricingId, setUpdatingPricingId] = useState<string | null>(null)

  // Функция загрузки списка студентов с доступом к курсу
  const loadStudentsWithAccess = async () => {
    if (!currentCourseId) {
      console.log("No currentCourseId, skipping loadStudentsWithAccess")
      setStudentsWithAccess([])
      return
    }

    console.log("Loading students with access for course:", currentCourseId)
    setLoadingStudents(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data, error } = await supabase
        .from("student_course_access")
        .select(`
          id,
          first_accessed_at,
          last_accessed_at,
          progress,
          students (
            id,
            email
          )
        `)
        .eq("course_id", currentCourseId)
        .order("first_accessed_at", { ascending: false })

      console.log("Loaded students with access:", { data, error, courseId: currentCourseId })

      if (error) {
        console.error("Error in loadStudentsWithAccess:", error)
        throw error
      }

      const formattedData = data?.map(access => ({
        id: access.id,
        email: Array.isArray(access.students) ? access.students[0]?.email : access.students?.email,
        first_accessed_at: access.first_accessed_at,
        last_accessed_at: access.last_accessed_at,
        progress: access.progress,
      })).filter(item => item.email) || []

      console.log("Formatted data:", formattedData)
      console.log("Setting students with access:", formattedData.length, "students")
      setStudentsWithAccess(formattedData)
    } catch (error) {
      console.error("Error loading students with access:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список студентов",
        variant: "destructive",
      })
      setStudentsWithAccess([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Функция показа модального окна подтверждения удаления доступа
  const showRemoveAccessConfirmation = (accessId: string, studentEmail: string) => {
    setStudentToRemove({ accessId, email: studentEmail })
    setShowRemoveAccessModal(true)
  }

  // Функция удаления доступа студента к курсу
  const removeStudentAccess = async () => {
    if (!studentToRemove) return

    try {
      console.log("Attempting to remove access for:", studentToRemove)
      console.log("Current course ID:", currentCourseId)
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // Сначала проверим, существует ли запись
      const { data: existingRecord, error: checkError } = await supabase
        .from("student_course_access")
        .select("*")
        .eq("id", studentToRemove.accessId)
        .single()

      console.log("Existing record check:", { existingRecord, checkError })

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (!existingRecord) {
        console.log("Record not found, it might already be deleted")
        toast({
          title: "Запись не найдена",
          description: "Доступ уже был удален или не существует",
        })
        await loadStudentsWithAccess()
        setShowRemoveAccessModal(false)
        setStudentToRemove(null)
        return
      }

      // Удаляем запись
      const { data, error } = await supabase
        .from("student_course_access")
        .delete()
        .eq("id", studentToRemove.accessId)
        .select()

      console.log("Delete result:", { data, error })

      if (error) {
        console.error("Delete error details:", error)
        throw error
      }

      if (!data || data.length === 0) {
        console.log("No records were deleted")
        toast({
          title: "Ошибка",
          description: "Запись не была удалена",
          variant: "destructive",
        })
        return
      }

      console.log("Successfully deleted record:", data[0])

      toast({
        title: "Доступ закрыт",
        description: `Доступ к курсу закрыт для ${studentToRemove.email}`,
      })

      // Принудительно обновляем список студентов
      console.log("Reloading students list...")
      await loadStudentsWithAccess()
      
      // Дополнительная проверка через небольшую задержку
      setTimeout(async () => {
        console.log("Additional reload after 1 second...")
        await loadStudentsWithAccess()
      }, 1000)
      
      // Закрываем модальное окно
      setShowRemoveAccessModal(false)
      setStudentToRemove(null)
    } catch (error) {
      console.error("Error removing student access:", error)
      toast({
        title: "Ошибка",
        description: `Не удалось закрыть доступ к курсу: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        variant: "destructive",
      })
    }
  }

  // Функция валидации email адресов
  const validateEmails = (emailString: string) => {
    if (!emailString.trim()) {
      setEmailValidation({ isValid: true, validEmails: [], invalidEmails: [], duplicateEmails: [] })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emails = emailString
      .split(/[,\n;]/)
      .map((email) => email.trim())
      .filter((email) => email)

    const validEmails: string[] = []
    const invalidEmails: string[] = []
    const duplicateEmails: string[] = []

    emails.forEach((email) => {
      if (emailRegex.test(email)) {
        if (validEmails.includes(email)) {
          duplicateEmails.push(email)
        } else {
          validEmails.push(email)
        }
      } else {
        invalidEmails.push(email)
      }
    })

    setEmailValidation({
      isValid: invalidEmails.length === 0 && duplicateEmails.length === 0,
      validEmails,
      invalidEmails,
      duplicateEmails,
    })
  }

  const addLesson = () => {
    const newLesson: CourseLesson = {
      id: Date.now().toString(),
      title: `Урок ${courseLessons.length + 1}`,
      description: "",
      order: courseLessons.length + 1,
      blocks: getTemplateForAuthorType(authorProfile?.author_type || "").blocks,
      completed: false,
    }

    setCourseLessons((prev) => [...prev, newLesson])
    setActiveLessonId(newLesson.id)
    setCourseBlocks(newLesson.blocks)
    setActiveBlockId(newLesson.blocks[0]?.id || "")
  }

  const removeLesson = (lessonId: string) => {
    setCourseLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId))

    if (activeLessonId === lessonId) {
      const remainingLessons = courseLessons.filter((lesson) => lesson.id !== lessonId)
      if (remainingLessons.length > 0) {
        setActiveLessonId(remainingLessons[0].id)
        setCourseBlocks(remainingLessons[0].blocks)
        setActiveBlockId(remainingLessons[0].blocks[0]?.id || "")
      } else {
        setActiveLessonId("")
        setCourseBlocks([])
        setActiveBlockId("")
      }
    }
  }

  const updateLessonTitle = (lessonId: string, title: string) => {
    setCourseLessons((prev) => prev.map((lesson) => (lesson.id === lessonId ? { ...lesson, title } : lesson)))
  }

  const updateLessonDescription = (lessonId: string, description: string) => {
    setCourseLessons((prev) => prev.map((lesson) => (lesson.id === lessonId ? { ...lesson, description } : lesson)))
  }

  const selectLesson = (lessonId: string) => {
    const lesson = courseLessons.find((l) => l.id === lessonId)
    if (lesson) {
      setActiveLessonId(lessonId)
      setCourseBlocks(lesson.blocks)
      setActiveBlockId(lesson.blocks[0]?.id || "")
    }
  }

  const updateCurrentLessonBlocks = (blocks: ExtendedCourseBlock[]) => {
    setCourseLessons((prev) => prev.map((lesson) => (lesson.id === activeLessonId ? { ...lesson, blocks } : lesson)))
  }

  const updateCourseBlocks = (blocks: ExtendedCourseBlock[]) => {
    setCourseBlocks(blocks)
    updateCurrentLessonBlocks(blocks)
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    if (user) {
      checkAuthorProfile()
    }
  }, [user, authLoading, router])

  // Загружаем список студентов с доступом при изменении currentCourseId
  useEffect(() => {
    console.log("useEffect triggered for currentCourseId:", currentCourseId)
    if (currentCourseId) {
      loadStudentsWithAccess()
    } else {
      console.log("No currentCourseId, clearing students list")
      setStudentsWithAccess([])
    }
  }, [currentCourseId])

  // Автосохранение каждые 4 минуты
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current)
    }

    // Устанавливаем новый таймер (4 минуты = 240000 мс)
    if (courseTitle.trim()) {
      autosaveTimerRef.current = setInterval(() => {
        autosaveCourse(true)
      }, 240000) // 4 минуты
    }

    // Очищаем таймер при размонтировании компонента
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current)
      }
    }
  }, [courseTitle, courseDescription, courseLessons, courseBlocks])

  // Отмечаем данные как "несохраненные" при изменениях
  useEffect(() => {
    if (courseTitle.trim() && lastSavedAt) {
      setSaveStatus("unsaved")
    }
  }, [courseTitle, courseDescription, courseLessons, courseBlocks])

  // Сохраняем в localStorage для восстановления при перезагрузке
  useEffect(() => {
    if (courseTitle.trim()) {
      const draftData = {
        title: courseTitle,
        description: courseDescription,
        lessons: courseLessons,
        blocks: courseBlocks,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem("courseConstructorDraft", JSON.stringify(draftData))
    }
  }, [courseTitle, courseDescription, courseLessons, courseBlocks])

  const checkAuthorProfile = async () => {
    try {
      setLoading(true)

      // Check if user is authenticated first
      if (!user) {
        console.error("No authenticated user found")
        setLoading(false)
        return
      }

      const supabase = createClient()

      const { data: profileData, error: profileError } = await supabase
        .from("author_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Profile query error:", profileError)
        throw profileError
      }

      if (!profileData) {
        setShowTestPrompt(true)
        setLoading(false)
        return
      }

      setAuthorProfile(profileData)

      const interfaceSettings = getPersonalizedInterface(profileData)
      setPersonalizedInterface(interfaceSettings)

      await loadSavedCourse(profileData)
    } catch (err) {
      console.error("Error loading author profile:", err)
      // Don't throw the error, just log it and continue
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedCourse = async (profileData?: AuthorProfile) => {
    if (!user) {
      console.error("No user available for loading course")
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const courseIdFromUrl = urlParams.get("courseId")
    const courseIdFromStorage = localStorage.getItem("currentCourseId")
    const courseId = courseIdFromUrl || courseIdFromStorage

    console.log("[v0] Loading course with ID:", courseId)

    if (courseId) {
      try {
        const supabase = createClient()

        // Проверяем доступ: автор или соавтор
        const { data: course, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single()

        console.log("[v0] Loaded course data:", course)

        if (error || !course) {
          console.log("[v0] Course not found or error:", error?.message)
          localStorage.removeItem("currentCourseId")
          return
        }

        // Проверяем, является ли пользователь автором
        const isAuthor = course.author_id === user.id
        setIsCourseAuthor(isAuthor)

        // Если не автор, проверяем, является ли соавтором
        if (!isAuthor) {
          const { data: collaborator } = await supabase
            .from("course_collaborators")
            .select("id")
            .eq("course_id", courseId)
            .eq("collaborator_user_id", user.id)
            .maybeSingle()

          if (!collaborator) {
            console.log("[v0] User is not author or collaborator")
            localStorage.removeItem("currentCourseId")
            router.push("/dashboard")
            return
          }
        }

        if (course) {
          setCourseTitle(course.title || "")
          setCourseDescription(course.description || "")

          if (course.modules && course.modules.lessons) {
            setCourseLessons(course.modules.lessons)
            if (course.modules.lessons.length > 0) {
              const firstLesson = course.modules.lessons[0]
              setActiveLessonId(firstLesson.id)
              setCourseBlocks(firstLesson.blocks)
              setActiveBlockId(firstLesson.blocks[0]?.id || "")
            }
          } else if (course.modules && course.modules.blocks) {
            // Миграция старых курсов: создаем урок из существующих блоков
            const migrationLesson: CourseLesson = {
              id: "migration-lesson",
              title: "Основной урок",
              description: "Автоматически созданный урок",
              order: 1,
              blocks: course.modules.blocks,
              completed: false,
            }
            setCourseLessons([migrationLesson])
            setActiveLessonId(migrationLesson.id)
            setCourseBlocks(migrationLesson.blocks)
            setActiveBlockId(migrationLesson.blocks[0]?.id || "")
          }

          setCurrentCourseId(course.id)
          localStorage.setItem("currentCourseId", course.id)

          // Загружаем режим запуска
          setLaunchMode(course.launch_mode || null)
          if (course.stream_start_date) {
            const date = new Date(course.stream_start_date)
            setStreamStartDate(date.toISOString().split('T')[0])
          }

          // Загружаем тарифы
          await loadCoursePricing(course.id)

          // Проверяем наличие несохраненного черновика в localStorage
          const draftString = localStorage.getItem("courseConstructorDraft")
          if (draftString) {
            try {
              const draft = JSON.parse(draftString)
              const draftTimestamp = new Date(draft.timestamp)
              const courseUpdatedAt = new Date(course.updated_at || 0)

              // Если черновик новее, чем сохраненная версия, восстанавливаем его
              if (draftTimestamp > courseUpdatedAt) {
                setCourseTitle(draft.title || "")
                setCourseDescription(draft.description || "")
                if (draft.lessons && draft.lessons.length > 0) {
                  setCourseLessons(draft.lessons)
                  setActiveLessonId(draft.lessons[0].id)
                  setCourseBlocks(draft.lessons[0].blocks)
                  setActiveBlockId(draft.lessons[0].blocks[0]?.id || "")
                }
                setSaveStatus("unsaved")
                toast({
                  title: "Восстановлен несохраненный черновик",
                  description: `Восстановлены изменения от ${draftTimestamp.toLocaleString("ru-RU")}`,
                })
              } else {
                // Черновик старше - удаляем его
                localStorage.removeItem("courseConstructorDraft")
                setLastSavedAt(courseUpdatedAt)
              }
            } catch (e) {
              console.error("Error parsing draft:", e)
              localStorage.removeItem("courseConstructorDraft")
            }
          } else {
            // Нет черновика в localStorage, устанавливаем lastSavedAt
            setLastSavedAt(new Date(course.updated_at || Date.now()))
          }
        }
      } catch (err) {
        console.error("[v0] Error loading course:", err)
        localStorage.removeItem("currentCourseId")
      }
    } else {
      // Нет сохраненного курса, проверяем localStorage draft
      const draftString = localStorage.getItem("courseConstructorDraft")
      if (draftString) {
        try {
          const draft = JSON.parse(draftString)
          setCourseTitle(draft.title || "")
          setCourseDescription(draft.description || "")
          if (draft.lessons && draft.lessons.length > 0) {
            setCourseLessons(draft.lessons)
            setActiveLessonId(draft.lessons[0].id)
            setCourseBlocks(draft.lessons[0].blocks)
            setActiveBlockId(draft.lessons[0].blocks[0]?.id || "")
          }
          setSaveStatus("unsaved")
          toast({
            title: "Восстановлен несохраненный черновик",
            description: "Восстановлены ваши последние изменения",
          })
        } catch (e) {
          console.error("Error parsing draft:", e)
          localStorage.removeItem("courseConstructorDraft")
        }
      }
    }
  }

  // Функция загрузки тарифов курса
  const loadCoursePricing = async (courseId: string) => {
    try {
      setLoadingPricing(true)
      const response = await fetch(`/api/course-pricing?courseId=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCoursePricing(data.pricing || [])
      }
    } catch (error) {
      console.error("Error loading pricing:", error)
    } finally {
      setLoadingPricing(false)
    }
  }

  // Функция создания тарифов по умолчанию
  const createDefaultPricingHandler = async () => {
    const courseId = localStorage.getItem("currentCourseId")
    if (!courseId) {
      toast({
        title: "Ошибка",
        description: "Сначала сохраните курс",
        variant: "destructive",
      })
      return
    }

    try {
      setLoadingPricing(true)
      const success = await createDefaultPricing(courseId)
      
      if (success) {
        // Перезагружаем тарифы
        await loadCoursePricing(courseId)
        toast({
          title: "Успешно",
          description: "Тарифы по умолчанию созданы",
        })
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось создать тарифы",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating default pricing:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать тарифы",
        variant: "destructive",
      })
    } finally {
      setLoadingPricing(false)
    }
  }

  // Функция обновления тарифа
  const updatePricing = async (pricingId: string, updates: any) => {
    try {
      setUpdatingPricingId(pricingId)
      const response = await fetch("/api/course-pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pricingId,
          updates,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при обновлении тарифа")
      }

      // Обновляем локальное состояние
      setCoursePricing((prev) =>
        prev.map((p) => (p.id === pricingId ? { ...p, ...updates } : p))
      )

      toast({
        title: "Успешно",
        description: "Тариф обновлен",
      })
    } catch (error) {
      console.error("Error updating pricing:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить тариф",
        variant: "destructive",
      })
    } finally {
      setUpdatingPricingId(null)
    }
  }

  // Функция сохранения режима запуска
  const saveLaunchMode = async () => {
    const courseId = localStorage.getItem("currentCourseId")
    if (!courseId) return

    try {
      const updates: any = {
        launch_mode: launchMode,
      }

      if (launchMode === "stream") {
        if (!streamStartDate) {
          toast({
            title: "Ошибка",
            description: "Укажите дату старта для потокового курса",
            variant: "destructive",
          })
          return
        }

        // Валидация даты старта потока
        const selectedDate = new Date(streamStartDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Сбрасываем время для корректного сравнения
        selectedDate.setHours(0, 0, 0, 0)

        if (selectedDate < today) {
          toast({
            title: "Ошибка",
            description: "Дата старта потока не может быть в прошлом. Выберите сегодняшнюю дату или дату в будущем.",
            variant: "destructive",
          })
          return
        }

        updates.stream_start_date = new Date(streamStartDate).toISOString()
      } else {
        updates.stream_start_date = null
      }

      const { error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Режим запуска сохранен",
      })
    } catch (error) {
      console.error("Error saving launch mode:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить режим запуска",
        variant: "destructive",
      })
    }
  }

  const determineCourseMode = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlCourseId = urlParams.get("courseId")
    const isNewMode = urlParams.get("mode") === "new"

    if (isNewMode) {
      return { mode: "new", courseId: null }
    } else if (urlCourseId) {
      return { mode: "edit", courseId: urlCourseId }
    } else {
      return { mode: "unknown", courseId: null }
    }
  }

  const initializeNewCourse = () => {
    console.log("[v0] Initializing new course")
    localStorage.removeItem("currentCourseId")
    setCourseTitle("")
    setCourseDescription("")
    const firstLesson: CourseLesson = {
      id: "first-lesson",
      title: "Урок 1",
      description: "",
      order: 1,
      blocks: [],
      completed: false,
    }
    setCourseLessons([firstLesson])
    setActiveLessonId(firstLesson.id)
    setCourseBlocks([])
    setActiveBlockId("")
  }

  const loadExistingCourse = async (courseId: string) => {
    if (!user) {
      console.log("User not available yet, skipping course load")
      return
    }

    console.log("[v0] Loading existing course with ID:", courseId)

    try {
      const supabase = createClient()

      // Загружаем курс (RLS политики проверяют доступ: автор или соавтор)
      const { data: course, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      console.log("[v0] Loaded course data:", course)

      if (error || !course) {
        console.log("[v0] Course not found or no access:", error?.message)
        localStorage.removeItem("currentCourseId")
        initializeNewCourse()
        return
      }

      // Проверяем доступ: автор или соавтор
      const isAuthor = course.author_id === user.id
      if (!isAuthor) {
        // Проверяем, является ли соавтором
        const { data: collaborator } = await supabase
          .from("course_collaborators")
          .select("id")
          .eq("course_id", courseId)
          .eq("collaborator_user_id", user.id)
          .maybeSingle()

        if (!collaborator) {
          console.log("[v0] User is not author or collaborator")
          localStorage.removeItem("currentCourseId")
          initializeNewCourse()
          return
        }
      }

      if (course) {
        setCourseTitle(course.title || "")
        setCourseDescription(course.description || "")

        // Load course blocks from modules field
        if (course.modules && course.modules.blocks) {
          setCourseBlocks(course.modules.blocks)
        } else {
          // If no blocks, load personalized template
          if (authorProfile) {
            loadPersonalizedTemplate()
          }
        }

        setCurrentCourseId(course.id)
        localStorage.setItem("currentCourseId", course.id)
      }
    } catch (err) {
      console.error("[v0] Error loading course:", err)
      localStorage.removeItem("currentCourseId")
      initializeNewCourse()
    }
  }

  const loadTemplate = (profileData: AuthorProfile) => {
    if (constructorMode === "personalized") {
      const template = getTemplateForAuthorType(profileData.author_type)
      const extendedBlocks: ExtendedCourseBlock[] = template.blocks.map((block) => ({
        ...block,
        elements: block.elements.map((element) => ({
          ...element,
          mode: "lesson" as ElementMode,
        })),
      }))

      // Если есть активный урок, обновляем его блоки
      if (activeLessonId) {
        const firstLesson: CourseLesson = {
          id: activeLessonId,
          title: "Урок 1",
          description: "",
          order: 1,
          blocks: extendedBlocks,
          completed: false,
        }
        setCourseLessons([firstLesson])
        setCourseBlocks(extendedBlocks)
        setActiveBlockId(extendedBlocks[0]?.id || "")
      }
    } else {
      const standardTemplate = getStandardTemplate()
      const extendedBlocks: ExtendedCourseBlock[] = standardTemplate.blocks.map((block) => ({
        ...block,
        elements: block.elements.map((element) => ({
          ...element,
          mode: "lesson" as ElementMode,
        })),
      }))

      // Если есть активный урок, обновляем его блоки
      if (activeLessonId) {
        const firstLesson: CourseLesson = {
          id: activeLessonId,
          title: "Урок 1",
          description: "",
          order: 1,
          blocks: extendedBlocks,
          completed: false,
        }
        setCourseLessons([firstLesson])
        setCourseBlocks(extendedBlocks)
        setActiveBlockId(extendedBlocks[0]?.id || "")
      }
    }
  }

  const getRecommendedElements = (): CourseElement["type"][] => {
    if (constructorMode === "personalized" && authorProfile) {
      // В персонализированном режиме показываем элементы для данного типа автора
      const authorElementsMap: Record<string, CourseElement["type"][]> = {
        Оратор: ["video", "audio", "text"],
        Методист: ["title", "text", "image", "file", "test", "task"],
        "Автор на вдохновении": ["video", "text", "image", "task"],
        Первопроходец: ["video", "text", "file", "task", "test"],
        "Загруженный эксперт": ["audio", "text", "title", "file", "task", "test"],
        "Педагог с эмпатией": ["video", "text", "audio", "test", "task"],
        "Практик-рационал": ["text", "task", "file", "image", "test"],
        "Интуитивный автор": ["image", "video", "text", "task", "test"],
      }
      return authorElementsMap[authorProfile.author_type] || ["text", "video", "task"]
    } else {
      // В стандартном режиме показываем базовые элементы
      return ["text", "video", "task", "test", "image", "audio", "file", "title"]
    }
  }

  useEffect(() => {
    if (activeBlockId && authorProfile && constructorMode === "personalized") {
      const activeBlock = courseBlocks.find((block) => block.id === activeBlockId)
      if (activeBlock) {
        const hints = getContextualHints(activeBlock, authorProfile)
        setContextualHints(hints)
      }
    } else if (constructorMode === "standard") {
      // Standard hints for standard mode
      setContextualHints([
        "Добавьте заголовок для лучшей структуры",
        "Включите практическое задание для закрепления",
        "Используйте примеры для лучшего понимания",
      ])
    }
  }, [activeBlockId, courseBlocks, authorProfile, constructorMode])

  // Обновление динамических подсказок при изменении блоков урока
  useEffect(() => {
    if (courseBlocks.length > 0) {
      // Проверяем наличие элементов в уроке
      const check = checkLessonElements(courseBlocks)
      
      // Генерируем подсказки
      const hints = generateDynamicHints(check)
      setDynamicHints(hints)
    } else {
      setDynamicHints([])
      setActiveHint(null)
    }
  }, [courseBlocks])

  // Обновление активной подсказки при изменении подсказок или закрытых подсказок
  useEffect(() => {
    if (dynamicHints.length > 0) {
      const firstNotDismissed = dynamicHints.find((hint) => !dismissedHints.includes(hint.id))
      setActiveHint(firstNotDismissed || null)
    } else {
      setActiveHint(null)
    }
  }, [dismissedHints, dynamicHints])

  // Функция для закрытия подсказки
  const dismissHint = (hintId: string) => {
    setDismissedHints((prev) => [...prev, hintId])
  }

  useEffect(() => {
    const { mode, courseId } = determineCourseMode()

    switch (mode) {
      case "new":
        initializeNewCourse()
        setTimeout(() => {
          if (courseBlocks.length > 0) {
            setActiveBlockId(courseBlocks[0].id)
          } else {
            setActiveBlockId("1") // Default first block ID
          }
        }, 200)
        break
      case "edit":
        if (courseId) {
          loadExistingCourse(courseId).then(() => {
            // Auto-select first block after loading
            setTimeout(() => setActiveBlockId(courseBlocks[0]?.id || "1"), 200)
          })
        }
        break
    }
  }, [])

  const updateElementContent = (blockId: string, elementId: string, content: string) => {
    const updatedBlocks = courseBlocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            elements: block.elements.map((element) =>
              element.id === elementId ? { ...element, content, completed: content.trim().length > 0 } : element,
            ),
          }
        : block,
    )
    updateCourseBlocks(updatedBlocks)
  }

  const addElement = (blockId: string, elementType: CourseElement["type"], educationalType?: EducationalBlockType) => {
    const newElement: ExtendedCourseElement = {
      id: Date.now().toString(),
      type: elementType,
      content: "",
      required: false,
      completed: false,
      mode: "lesson",
      educationalType,
    }

    const updatedBlocks = courseBlocks.map((block) =>
      block.id === blockId ? { ...block, elements: [...block.elements, newElement] } : block,
    )
    updateCourseBlocks(updatedBlocks)
  }

  const toggleElementMode = (blockId: string, elementId: string) => {
    const updatedBlocks = courseBlocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            elements: block.elements.map((element) =>
              element.id === elementId ? { ...element, mode: element.mode === "lesson" ? "notes" : "lesson" } : element,
            ),
          }
        : block,
    )
    updateCourseBlocks(updatedBlocks)
  }

  const removeElement = (blockId: string, elementId: string) => {
    const updatedBlocks = courseBlocks.map((block) =>
      block.id === blockId ? { ...block, elements: block.elements.filter((el) => el.id !== elementId) } : block,
    )
    updateCourseBlocks(updatedBlocks)
  }

  const getElementIcon = (type: CourseElement["type"], educationalType?: EducationalBlockType) => {
    if (educationalType) {
      switch (educationalType) {
        case "theory":
          return BookOpenIcon
        case "example":
          return TargetIcon
        case "practice":
          return ClipboardListIcon
        case "knowledge_check":
          return HelpCircleIcon
      }
    }

    switch (type) {
      case "video":
        return PlayIcon
      case "audio":
        return MessageCircleIcon
      case "image":
        return ImageIcon
      case "task":
        return CheckCircleIcon
      case "test":
        return HelpCircleIcon
      case "file":
        return DownloadIcon
      default:
        return FileTextIcon
    }
  }

  const getElementLabel = (type: CourseElement["type"], educationalType?: EducationalBlockType) => {
    if (educationalType) {
      switch (educationalType) {
        case "theory":
          return "Теория"
        case "example":
          return "Пример"
        case "practice":
          return "Практика"
        case "knowledge_check":
          return "Проверка знаний"
      }
    }

    switch (type) {
      case "title":
        return "Заголовок"
      case "text":
        return "Текст"
      case "video":
        return "Видео"
      case "audio":
        return "Аудио"
      case "image":
        return "Изображение"
      case "task":
        return "Задание"
      case "test":
        return "Тест"
      case "file":
        return "Файл"
      default:
        return "Элемент"
    }
  }

  const getElementPlaceholder = (type: CourseElement["type"], educationalType?: EducationalBlockType) => {
    if (educationalType) {
      switch (educationalType) {
        case "theory":
          return "Объясните основные концепции и принципы"
        case "example":
          return "Опишите конкретный случай или ситуацию"
        case "practice":
          return "Сформулируйте задание для выполнения"
        case "knowledge_check":
          return "Создайте вопросы для проверки понимания"
      }
    }

    switch (type) {
      case "title":
        return "Введите заголовок блока"
      case "text":
        return "Напишите, о чем вы хотели бы рассказать в этом блоке"
      case "video":
        return "Вставьте ссылку на видео"
      case "audio":
        return "Загрузите аудиозапись"
      case "image":
        return "Загрузите изображение"
      case "task":
        return "Опишите задание для учеников"
      case "test":
        return "Создайте вопросы для проверки"
      case "file":
        return "Загрузите файл с материалами"
      default:
        return "Введите содержимое элемента"
    }
  }

  const getElementDescription = (
    type: CourseElement["type"],
    mode: ElementMode,
    educationalType?: EducationalBlockType,
  ) => {
    if (mode === "notes") {
      return "Заметки автора — этот контент не будет показан ученикам, используйте для подготовки"
    }

    if (educationalType) {
      switch (educationalType) {
        case "theory":
          return "Структурированное объяснение концепций будет показано ученикам как основной материал"
        case "example":
          return "Разбор конкретного кейса поможет ученикам понять применение на практике"
        case "practice":
          return "Практическое задание для активного закрепления материала учениками"
        case "knowledge_check":
          return "Тест или вопросы для проверки усвоения материала учениками"
      }
    }

    switch (type) {
      case "text":
        return "Текст будет отображен ученикам как основной материал урока"
      case "video":
        return "Видео будет встроено в урок. Ученики смогут смотреть его прямо на странице курса"
      case "audio":
        return "Аудио будет воспроизводиться на странице урока с возможностью паузы и перемотки"
      case "image":
        return "Изображение будет показано ученикам для лучшего понимания материала"
      case "file":
        return "Файл станет доступен для скачивания ученикам в этом разделе курса"
      case "task":
        return "Задание поможет ученикам закрепить материал и проверить понимание"
      case "test":
        return "Тест позволит ученикам проверить свои знания по теме"
      default:
        return ""
    }
  }

  const removeBlock = (blockId: string) => {
    const updatedBlocks = courseBlocks.filter((block) => block.id !== blockId)
    updateCourseBlocks(updatedBlocks)
    if (activeBlockId === blockId) {
      setActiveBlockId(updatedBlocks[0]?.id || "")
    }
  }

  const addBlock = (blockType: CourseBlock["type"]) => {
    const blockTitles = {
      introduction: "Дополнительный блок",
      navigation: "Навигация",
      main_block_1: "Основной блок 1",
      intermediate_practice: "Промежуточная практика",
      main_block_2: "Основной блок 2",
      intermediate_test: "Промежуточный тест",
      main_block_3: "Основной блок 3",
      conclusion: "Итог и завершение",
      bonus_support: "Бонус и поддержка",
    }

    const newBlock: ExtendedCourseBlock = {
      id: Date.now().toString(),
      type: blockType,
      title: blockTitles[blockType],
      description: `Описание для ${blockTitles[blockType].toLowerCase()}`,
      elements: [],
      required: blockType !== "bonus_support",
      completed: false,
      mode: "lesson",
    }

    const updatedBlocks = [...courseBlocks, newBlock]
    updateCourseBlocks(updatedBlocks)
    setActiveBlockId(newBlock.id)
  }

  // Функции для работы с данными режимов
  const saveModeData = (mode: "standard" | "personalized") => {
    const modeData = {
      title: courseTitle,
      description: courseDescription,
      lessons: courseLessons,
      blocks: courseBlocks,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(`courseMode_${mode}`, JSON.stringify(modeData))
  }

  const loadModeData = (mode: "standard" | "personalized") => {
    const modeDataString = localStorage.getItem(`courseMode_${mode}`)
    if (modeDataString) {
      try {
        const modeData = JSON.parse(modeDataString)
        setCourseTitle(modeData.title || "")
        setCourseDescription(modeData.description || "")
        if (modeData.lessons && modeData.lessons.length > 0) {
          setCourseLessons(modeData.lessons)
          setActiveLessonId(modeData.lessons[0].id)
          setCourseBlocks(modeData.lessons[0].blocks)
          setActiveBlockId(modeData.lessons[0].blocks[0]?.id || "")
        } else {
          // Если нет данных режима, загружаем шаблон
          if (authorProfile) {
            loadTemplate(authorProfile)
          }
        }
        return true
      } catch (e) {
        console.error("Error loading mode data:", e)
        return false
      }
    }
    return false
  }

  const handleModeSwitch = (targetMode: "standard" | "personalized") => {
    // Если уже в этом режиме, ничего не делаем
    if (targetMode === constructorMode) {
      return
    }

    // Показываем предупреждение
    setPendingMode(targetMode)
    setShowModeSwitchWarning(true)
  }

  const confirmModeSwitch = async (saveBeforeSwitch: boolean) => {
    if (!pendingMode) return

    try {
      // Сохраняем данные текущего режима
      saveModeData(constructorMode)

      // Если нужно сохранить в БД перед переключением
      if (saveBeforeSwitch && courseTitle.trim()) {
        await autosaveCourse(false)
      }

      // Переключаем режим
      setConstructorMode(pendingMode)

      // Загружаем данные нового режима
      const loaded = loadModeData(pendingMode)

      // Если не удалось загрузить сохраненные данные, загружаем шаблон
      if (!loaded && authorProfile) {
        loadTemplate(authorProfile)
      }

      // Закрываем модалку
      setShowModeSwitchWarning(false)
      setPendingMode(null)

      toast({
        title: "Режим переключён",
        description: `Вы работаете в режиме «${pendingMode === "standard" ? "Стандартная сборка" : "Сборка по типу автора"}»`,
      })
    } catch (error) {
      console.error("Error switching mode:", error)
      toast({
        title: "Ошибка переключения",
        description: "Не удалось переключить режим",
        variant: "destructive",
      })
    }
  }

  // Функция автосохранения
  const autosaveCourse = async (silent = true) => {
    // Не сохраняем, если нет названия курса
    if (!courseTitle.trim()) {
      return
    }

    // Не сохраняем, если уже идет сохранение
    if (isSaving) {
      return
    }

    try {
      setSaveStatus("saving")

      const courseId = localStorage.getItem("currentCourseId")

      const response = await fetch("/api/drafts/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title: courseTitle,
          description: courseDescription,
          lessons: courseLessons,
          blocks: courseBlocks,
          personalizedInterface,
          authorType: authorProfile?.author_type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при сохранении")
      }

      // Сохраняем ID курса, если это новый черновик
      if (data.courseId && !courseId) {
        localStorage.setItem("currentCourseId", data.courseId)
        setCurrentCourseId(data.courseId)
        window.history.replaceState({}, "", `?courseId=${data.courseId}`)
      }

      setSaveStatus("saved")
      setLastSavedAt(new Date())

      // Очищаем localStorage draft после успешного сохранения
      localStorage.removeItem("courseConstructorDraft")

      if (!silent) {
        toast({
          title: "Черновик сохранен",
          description: "Все изменения успешно сохранены",
        })
      }
    } catch (err) {
      console.error("Autosave error:", err)
      setSaveStatus("unsaved")

      if (!silent) {
        toast({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить изменения",
          variant: "destructive",
        })
      }
    }
  }

  const saveCourse = async () => {
    if (!courseTitle.trim()) {
      setModalState({ isOpen: true, type: "save" })
      return
    }

    setIsSaving(true)
    try {
      const courseId = localStorage.getItem("currentCourseId")

      if (courseId) {
        const { error: updateError } = await supabase
          .from("courses")
          .update({
            title: courseTitle,
            description: courseDescription,
            modules: {
              lessons: courseLessons,
              author_type: authorProfile?.author_type,
              personalization: personalizedInterface,
            },
          })
          .eq("id", courseId)
          // RLS политики проверяют доступ (автор или соавтор)

        if (updateError) throw updateError

        // Очищаем localStorage draft после успешного сохранения
        localStorage.removeItem("courseConstructorDraft")
        setSaveStatus("saved")
        setLastSavedAt(new Date())

        setModalState({ isOpen: true, type: "save" })
      } else {
        const tempId = crypto.randomUUID()
        const uniqueLink = `${window.location.origin}/course/${tempId}`

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .insert({
            title: courseTitle,
            description: courseDescription,
            author_id: user!.id,
            status: "draft",
            is_published: false,
            unique_link: uniqueLink,
            modules: {
              lessons: courseLessons,
              author_type: authorProfile?.author_type,
              personalization: personalizedInterface,
            },
          })
          .select()
          .single()

        if (courseError) throw courseError

        const actualUniqueLink = `${window.location.origin}/course/${courseData.id}`
        await supabase.from("courses").update({ unique_link: actualUniqueLink }).eq("id", courseData.id)

        localStorage.setItem("currentCourseId", courseData.id)
        window.history.replaceState({}, "", `?courseId=${courseData.id}`)

        // Загружаем тарифы (если они уже созданы)
        await loadCoursePricing(courseData.id)

        // Очищаем localStorage draft после успешного сохранения
        localStorage.removeItem("courseConstructorDraft")
        setSaveStatus("saved")
        setLastSavedAt(new Date())

        setModalState({ isOpen: true, type: "save" })
      }
    } catch (err) {
      console.error("Error saving course:", err)
      alert("Ошибка при сохранении курса")
    } finally {
      setIsSaving(false)
    }
  }

  const publishCourse = async () => {
    if (!courseTitle.trim()) {
      setModalState({ isOpen: true, type: "save" })
      return
    }

    setIsPublishing(true)
    try {
      let courseId = localStorage.getItem("currentCourseId")

      // Если курс еще не сохранен, сначала создаем его
      if (!courseId) {
        console.log("Course not saved yet, creating new course...")
        const tempId = crypto.randomUUID()
        const uniqueLink = `${window.location.origin}/course/${tempId}`

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .insert({
            title: courseTitle,
            description: courseDescription,
            author_id: user!.id,
            status: "draft",
            is_published: false,
            unique_link: uniqueLink,
            modules: {
              lessons: courseLessons,
              author_type: authorProfile?.author_type,
              personalization: personalizedInterface,
            },
          })
          .select()
          .single()

        if (courseError) throw courseError

        courseId = courseData.id
        const actualUniqueLink = `${window.location.origin}/course/${courseId}`
        await supabase.from("courses").update({ unique_link: actualUniqueLink }).eq("id", courseId)

        localStorage.setItem("currentCourseId", courseId)
        window.history.replaceState({}, "", `?courseId=${courseId}`)
        console.log("Course created with ID:", courseId)

        // Загружаем тарифы (если они уже созданы)
        await loadCoursePricing(courseId)
      }

      // Теперь публикуем курс
      const { error: updateError } = await supabase
        .from("courses")
        .update({
          title: courseTitle,
          description: courseDescription,
          status: "published",
          is_published: true,
          modules: {
            lessons: courseLessons,
            author_type: authorProfile?.author_type,
            personalization: personalizedInterface,
          },
        })
        .eq("id", courseId)
        // RLS политики проверяют доступ (автор или соавтор)

      if (updateError) throw updateError

      console.log("Course published successfully:", courseId)
      const courseLink = `${window.location.origin}/course/${courseId}`
      setModalState({ isOpen: true, type: "publish", courseLink })
    } catch (err) {
      console.error("Error publishing course:", err)
      alert("Ошибка при публикации курса")
    } finally {
      setIsPublishing(false)
    }
  }

  const unpublishCourse = async () => {
    const courseId = localStorage.getItem("currentCourseId")
    if (!courseId) {
      return
    }

    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "draft", is_published: false })
        .eq("id", courseId)
        // RLS политики проверяют доступ (автор или соавтор)

      if (error) throw error

      setModalState({ isOpen: true, type: "hide" })
    } catch (err) {
      console.error("Error hiding course:", err)
      alert("Ошибка при снятии с публикации курса")
    }
  }

  const inviteStudents = async () => {
    if (!inviteEmails.trim() || !currentCourseId) return

    setIsInviting(true)
    try {
      // Улучшенная валидация email адресов
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const emails = inviteEmails
        .split(/[,\n;]/)
        .map((email) => email.trim())
        .filter((email) => email && emailRegex.test(email))

      if (emails.length === 0) {
        toast({
          title: "Ошибка валидации",
          description: "Введите корректные email-адреса в формате example@domain.com",
          variant: "destructive",
        })
        return
      }

      // Проверяем на дубликаты
      const uniqueEmails = [...new Set(emails)]
      if (uniqueEmails.length !== emails.length) {
        toast({
          title: "Обнаружены дубликаты",
          description: "Некоторые email-адреса повторяются. Дубликаты будут проигнорированы.",
          variant: "destructive",
        })
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // Для каждого email найдем или создадим студента
      const studentIds: string[] = []
      const createdStudents: string[] = []
      const existingStudents: string[] = []

      for (const email of uniqueEmails) {
        try {
          // Проверяем, существует ли студент с таким email
          const { data: existingStudent, error: selectError } = await supabase
            .from("students")
            .select("id")
            .eq("email", email)
            .single()

          let studentId: string

          if (existingStudent && !selectError) {
            studentId = existingStudent.id
            existingStudents.push(email)
          } else {
            // Создаем нового студента
            const { data: newStudent, error: createError } = await supabase
              .from("students")
              .insert({
                email,
                student_type: "default",
                test_results: {},
              })
              .select("id")
              .single()

            if (createError) {
              console.error(`Error creating student for ${email}:`, createError)
              throw new Error(`Не удалось создать аккаунт для ${email}`)
            }
            
            studentId = newStudent.id
            createdStudents.push(email)
          }

          studentIds.push(studentId)
        } catch (error) {
          console.error(`Error processing email ${email}:`, error)
          throw error
        }
      }

      // Проверяем, есть ли уже доступ к курсу у некоторых студентов
      const { data: existingAccess, error: accessError } = await supabase
        .from("student_course_access")
        .select("student_id")
        .eq("course_id", currentCourseId)
        .in("student_id", studentIds)

      if (accessError) {
        console.error("Error checking existing access:", accessError)
        throw new Error("Не удалось проверить существующий доступ к курсу")
      }

      const existingAccessIds = existingAccess?.map(access => access.student_id) || []
      const newAccessRecords = studentIds
        .filter(studentId => !existingAccessIds.includes(studentId))
        .map((studentId) => ({
          student_id: studentId,
          course_id: currentCourseId,
          first_accessed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          progress: {},
        }))

      if (newAccessRecords.length === 0) {
        toast({
          title: "Информация",
          description: "Все указанные студенты уже имеют доступ к этому курсу",
          variant: "default",
        })
        setInviteEmails("")
        return
      }

      // Создаем записи доступа для новых студентов
      const { error: insertError } = await supabase
        .from("student_course_access")
        .insert(newAccessRecords)

      if (insertError) {
        console.error("Error inserting access records:", insertError)
        throw new Error("Не удалось предоставить доступ к курсу")
      }

      // Формируем сообщение об успехе
      let successMessage = `Доступ к курсу предоставлен для ${newAccessRecords.length} учеников`
      if (createdStudents.length > 0) {
        successMessage += `\nСозданы новые аккаунты: ${createdStudents.join(", ")}`
      }
      if (existingStudents.length > 0) {
        successMessage += `\nОбновлен доступ для существующих: ${existingStudents.join(", ")}`
      }

      toast({
        title: "Доступ к курсу открыт",
        description: successMessage,
      })

      setInviteEmails("")
      
      // Обновляем список студентов с доступом
      await loadStudentsWithAccess()
    } catch (error) {
      console.error("Error inviting students:", error)
      const errorMessage = error instanceof Error ? error.message : "Не удалось открыть доступ к курсу"
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  // const hideCourse = async () => {
  //   const courseId = localStorage.getItem("currentCourseId")
  //   if (!courseId) {
  //     return
  //   }

  //   try {
  //     const { error } = await supabase
  //       .from("courses")
  //       .update({ status: "hidden" })
  //       .eq("id", courseId)
  //       .eq("author_id", user!.id)

  //     if (error) throw error

  //     setModalState({ isOpen: true, type: "hide" })
  //   } catch (err) {
  //     console.error("Error hiding course:", err)
  //     alert("Ошибка при скрытии курса")
  //   }
  // }

  // const completedBlocks = courseBlocks.filter((block) =>
  //   block.elements.filter((el) => el.required).every((el) => el.completed),
  // ).length
  // const progress = courseBlocks.length > 0 ? (completedBlocks / courseBlocks.length) * 100 : 0

  const handleElementDragStart = (e: React.DragEvent, elementId: string) => {
    setDraggedElement(elementId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleElementDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleElementDrop = (e: React.DragEvent, targetElementId: string, blockId: string) => {
    e.preventDefault()
    if (!draggedElement || draggedElement === targetElementId) return

    setCourseBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block

        const elements = [...block.elements]
        const draggedIndex = elements.findIndex((el) => el.id === draggedElement)
        const targetIndex = elements.findIndex((el) => el.id === targetElementId)

        if (draggedIndex === -1 || targetIndex === -1) return block

        const [draggedItem] = elements.splice(draggedIndex, 1)
        elements.splice(targetIndex, 0, draggedItem)

        return { ...block, elements }
      }),
    )
    setDraggedElement(null)
  }

  const handleBlockDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlock(blockId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleBlockDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault()
    if (!draggedBlock || draggedBlock === targetBlockId) return

    const blocks = [...courseBlocks]
    const draggedIndex = blocks.findIndex((block) => block.id === draggedBlock)
    const targetIndex = blocks.findIndex((block) => block.id === targetBlockId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const [draggedItem] = blocks.splice(draggedIndex, 1)
    blocks.splice(targetIndex, 0, draggedItem)

    setCourseBlocks(blocks)
    setDraggedBlock(null)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </Card>
              </div>
              <div className="lg:col-span-3 space-y-4">
                <Card className="p-6">
                  <Skeleton className="h-8 w-48 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
                <Card className="p-6">
                  <Skeleton className="h-6 w-40 mb-4" />
                  <Skeleton className="h-32 w-full" />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (showTestPrompt) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <Card className="bg-white border-2 rounded-lg shadow-ruta-sm text-center">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangleIcon className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-primary mb-4">Пройдите тест на определение типа автора</h1>
              <p className="text-lg text-[#6B7280] mb-8 leading-relaxed">
                Чтобы приступить к созданию курса, сначала пройдите диагностический тест. Это поможет нам
                персонализировать конструктор под ваш стиль работы.
              </p>
              <Button onClick={() => router.push("/author-test")} className="h-12 px-8">
                Пройти тест автора
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      <PageHeader
        title="Конструктор курса"
        description={
          constructorMode === "personalized"
            ? `Персонализированный режим для типа «${authorProfile?.author_type || "Загрузка..."}»`
            : "Стандартный режим создания курса"
        }
        breadcrumbs={[
          { label: "Главная", href: "/" },
          { label: "Дашборд", href: "/dashboard" },
          { label: "Создание курса" },
        ]}
        actions={
          <div className="space-y-2">
            {/* Плашка текущего режима */}
            <div className="flex items-center justify-end gap-2 text-sm mb-2">
              <span className="text-slate-600">Режим:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  constructorMode === "standard"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-purple-100 text-purple-700 border border-purple-300"
                }`}
              >
                {constructorMode === "standard" ? "Стандартная сборка" : "По типу автора"}
              </span>
            </div>

            {/* Индикатор статуса автосохранения */}
            {courseTitle.trim() && (
              <div className="flex items-center justify-end gap-2 text-sm">
                {saveStatus === "saving" && (
                  <span className="text-blue-600 flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </span>
                )}
                {saveStatus === "saved" && lastSavedAt && (
                  <span className="text-green-600 flex items-center gap-1">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Сохранено {new Date(lastSavedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {saveStatus === "unsaved" && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Не сохранено
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-4">
              {currentCourseId && isCourseAuthor && (
                <Button
                  onClick={() => setShowCollaboratorsModal(true)}
                  variant="outline"
                  className="border-primary text-primary hover:bg-light-blue bg-transparent transition-colors flex items-center gap-2"
                >
                  <UsersIcon className="w-4 h-4" />
                  Управление соавторами
                </Button>
              )}
              <Button
                onClick={saveCourse}
                disabled={isSaving}
                variant="outline"
                className="border-primary text-primary hover:bg-light-blue bg-transparent transition-colors"
              >
                {isSaving ? "Сохранение..." : "Сохранить черновик"}
              </Button>
            <Button
              onClick={publishCourse}
              disabled={isPublishing}
              className="bg-primary hover:bg-primary-hover text-white transition-colors"
            >
              {isPublishing ? "Публикация..." : "Опубликовать курс"}
            </Button>
            {notification.type === "published" && (
              <Button
                onClick={unpublishCourse}
                variant="secondary"
                className="border-primary text-primary hover:bg-primary/5 bg-transparent transition-colors"
              >
                Снять с публикации
              </Button>
            )}
            </div>
          </div>
        }
      />

      <Notification
        type={notification.type}
        isVisible={notification.isVisible}
        courseLink={notification.courseLink}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />

      {currentCourseId && (
        <CourseCollaboratorsManager
          courseId={currentCourseId}
          isOpen={showCollaboratorsModal}
          onClose={() => setShowCollaboratorsModal(false)}
          isAuthor={isCourseAuthor}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Левый столбец - Режим создания курса */}
          <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="text-center mb-6">
                <h3 className="text-xl lg:text-2xl font-semibold text-primary mb-2">Выберите режим создания курса</h3>
                <p className="text-lg text-[#6B7280]">
                  Стандартный режим подходит всем, персонализированный — адаптирован под ваш тип автора
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  onClick={() => handleModeSwitch("standard")}
                  className={`w-full h-14 px-8 text-lg font-medium shadow-ruta-sm border-2 transition-all duration-200 ${
                    constructorMode === "standard"
                      ? "bg-primary text-white border-primary hover:bg-primary-hover"
                      : "border-primary text-primary hover:bg-light-blue bg-transparent"
                  }`}
                >
                  Стандартная сборка курса
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleModeSwitch("personalized")}
                  className={`w-full h-14 px-8 text-lg font-medium shadow-ruta-sm border-2 transition-all duration-200 ${
                    constructorMode === "personalized"
                      ? "bg-primary text-white border-primary hover:bg-primary-hover"
                      : "border-primary text-primary hover:bg-light-blue bg-transparent"
                  }`}
                >
                  Сборка по вашему типу автора
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const currentCourseId = localStorage.getItem("currentCourseId")
                    if (currentCourseId) {
                      window.open(`/course/${currentCourseId}/adaptation`, '_blank')
                    } else {
                      alert('Сначала сохраните курс, чтобы просмотреть адаптацию')
                    }
                  }}
                  className="w-full h-14 px-8 text-lg font-medium shadow-ruta-sm border-2 transition-all duration-200 border-primary text-primary hover:bg-light-blue bg-transparent"
                >
                  Просмотр адаптации
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Правый столбец - Приглашение учеников */}
          <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="text-center mb-6">
                <h3 className="text-xl lg:text-2xl font-semibold text-primary mb-2">Пригласите учеников по почте</h3>
                <p className="text-lg text-[#6B7280]">
                  Введите email-адреса учеников, которым нужно открыть доступ к курсу
                </p>
              </div>
              <div className="space-y-4">
              <div>
                <Textarea
                  value={inviteEmails}
                  onChange={(e) => {
                    setInviteEmails(e.target.value)
                    validateEmails(e.target.value)
                  }}
                  placeholder="Введите email-адреса через запятую или с новой строки&#10;example1@email.com, example2@email.com&#10;example3@email.com"
                  className={`min-h-[100px] text-lg ${
                    inviteEmails.trim() && !emailValidation.isValid 
                      ? "border-red-300 focus:border-red-500" 
                      : ""
                  }`}
                  rows={4}
                />
                <p className="text-sm text-[#6B7280] mt-2">
                  💡 Подсказка: Можно вводить email-адреса через запятую, точку с запятой или с новой строки
                </p>
                
                {/* Отображение результатов валидации */}
                {inviteEmails.trim() && (
                  <div className="mt-3 space-y-2">
                    {emailValidation.validEmails.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Корректные email ({emailValidation.validEmails.length}): {emailValidation.validEmails.join(", ")}</span>
                      </div>
                    )}
                    {emailValidation.invalidEmails.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span>Некорректные email ({emailValidation.invalidEmails.length}): {emailValidation.invalidEmails.join(", ")}</span>
                      </div>
                    )}
                    {emailValidation.duplicateEmails.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span>Дубликаты ({emailValidation.duplicateEmails.length}): {emailValidation.duplicateEmails.join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
                <div className="text-center">
                  <Button
                    onClick={inviteStudents}
                    disabled={!inviteEmails.trim() || isInviting || !emailValidation.isValid}
                    className="w-full h-12 px-8 text-lg font-medium shadow-ruta-sm transition-colors"
                  >
                    {isInviting ? "Открываем доступ..." : "Открыть доступ к курсу"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Список студентов с доступом */}
        <Card className="mb-8 bg-white border-2 rounded-lg shadow-ruta-sm">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-4 mb-2">
                <h3 className="text-xl lg:text-2xl font-semibold text-primary">
                  Студенты с доступом к курсу
                  {studentsWithAccess.length > 0 && (
                    <span className="ml-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                      {studentsWithAccess.length}
                    </span>
                  )}
                </h3>
                <Button
                  onClick={loadStudentsWithAccess}
                  disabled={loadingStudents}
                  variant="secondary"
                  size="sm"
                  className="border-primary text-primary hover:bg-light-blue transition-colors"
                >
                  {loadingStudents ? (
                    <Skeleton className="h-4 w-4 rounded-full" />
                  ) : (
                    "Обновить"
                  )}
                </Button>
              </div>
              <p className="text-lg text-[#6B7280]">
                Управляйте доступом студентов к курсу
              </p>
            </div>
            
            {loadingStudents ? (
              <div className="space-y-4 py-8">
                <Skeleton className="h-6 w-48 mx-auto" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            ) : studentsWithAccess.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#6B7280] text-lg mb-4">Пока никто не имеет доступа к курсу</p>
                <p className="text-slate-400 text-sm">Пригласите студентов, чтобы они появились в этом списке</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentsWithAccess.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-light-blue/20 rounded-lg border border-primary/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {student.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#111827]">{student.email}</p>
                          <p className="text-sm text-[#6B7280]">
                            Доступ предоставлен: {new Date(student.first_accessed_at).toLocaleDateString('ru-RU')}
                          </p>
                          {student.last_accessed_at !== student.first_accessed_at && (
                            <p className="text-sm text-[#6B7280]">
                              Последний вход: {new Date(student.last_accessed_at).toLocaleDateString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => showRemoveAccessConfirmation(student.id, student.email)}
                      variant="secondary"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Закрыть доступ
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Info */}
        <Card className="mb-8 bg-white border-2 rounded-lg shadow-ruta-sm">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Label htmlFor="course-title" className="text-lg font-semibold text-primary mb-2 block">
                  Название курса
                </Label>
                <Input
                  id="course-title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Введите название курса"
                  className="h-12 text-lg"
                />
              </div>
              <div>
                <Label htmlFor="course-description" className="text-lg font-semibold text-primary mb-2 block">
                  Описание курса
                </Label>
                <Textarea
                  id="course-description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Краткое описание курса"
                  className="text-lg"
                  rows={3}
                />
              </div>
            </div>

            {/* <div className="flex items-center justify-between text-base text-[#659AB8] font-semibold mb-3">
                <span>Прогресс создания курса</span>
                <span>
                  {completedBlocks} из {courseBlocks.length} блоков готово
                </span>
              </div>
              <Progress value={progress} className="h-3" /> */}
          </CardContent>
        </Card>

        {/* Тарифы и оплата */}
        {currentCourseId && (
          <Card className="mb-8 bg-white border-2 rounded-lg shadow-ruta-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="text-center mb-6">
                <h3 className="text-xl lg:text-2xl font-semibold text-primary mb-2">Тарифы и оплата</h3>
                <p className="text-lg text-[#6B7280]">
                  Настройте тарифы курса и режим запуска
                </p>
              </div>

              {/* Режим запуска курса */}
              <div className="mb-8 p-6 bg-light-blue/30 border border-primary/20 rounded-lg">
                <Label className="text-lg font-semibold text-primary mb-4 block">
                  Режим запуска курса
                </Label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant={launchMode === "permanent" ? "default" : "secondary"}
                      onClick={() => {
                        setLaunchMode("permanent")
                        setStreamStartDate("")
                      }}
                      className={`flex-1 h-12 ${
                        launchMode === "permanent"
                          ? "bg-primary text-white"
                          : "border-primary text-primary hover:bg-light-blue"
                      }`}
                    >
                      Постоянный (доступ сразу после оплаты)
                    </Button>
                    <Button
                      variant={launchMode === "stream" ? "default" : "secondary"}
                      onClick={() => setLaunchMode("stream")}
                      className={`flex-1 h-12 ${
                        launchMode === "stream"
                          ? "bg-primary text-white"
                          : "border-primary text-primary hover:bg-light-blue"
                      }`}
                    >
                      Потоковый (запуск по дате)
                    </Button>
                  </div>

                  {launchMode === "stream" && (
                    <div>
                      <Label htmlFor="stream-start-date" className="text-sm font-medium text-[#111827] mb-2 block">
                        Дата старта потока *
                      </Label>
                      <Input
                        id="stream-start-date"
                        type="date"
                        value={streamStartDate}
                        onChange={(e) => setStreamStartDate(e.target.value)}
                        className="h-12"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <p className="text-xs text-[#6B7280] mt-1">
                        Ученики смогут оплатить курс заранее, но доступ откроется только в указанную дату
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={saveLaunchMode}
                    disabled={launchMode === "stream" && !streamStartDate}
                    className="w-full bg-primary hover:bg-primary-hover text-white"
                  >
                    Сохранить режим запуска
                  </Button>
                </div>
              </div>

              {/* Редактирование тарифов */}
              <div>
                <Label className="text-lg font-semibold text-primary mb-4 block">
                  Тарифы курса
                </Label>
                {loadingPricing ? (
                  <div className="space-y-4 py-8">
                    <Skeleton className="h-6 w-40 mx-auto" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-6">
                          <Skeleton className="h-6 w-32 mb-4" />
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-3/4" />
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : coursePricing.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-[#6B7280] mb-4">Тарифы для курса еще не созданы</p>
                    <Button
                      onClick={createDefaultPricingHandler}
                      disabled={loadingPricing}
                      className="bg-primary hover:bg-primary-hover text-white"
                    >
                      {loadingPricing ? "Создание..." : "Создать тарифы по умолчанию"}
                    </Button>
                    <p className="text-xs text-slate-400 mt-2">
                      После создания вы сможете настроить цены и описание тарифов
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coursePricing.map((pricing) => (
                      <PricingEditor
                        key={pricing.id}
                        pricing={pricing}
                        onUpdate={updatePricing}
                        isUpdating={updatingPricingId === pricing.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Lessons and Blocks */}
          <div className="lg:col-span-3">
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-2xl font-bold text-primary">Уроки курса</h2>
                  <Button onClick={addLesson} size="sm" className="bg-primary hover:bg-primary-hover text-white transition-colors">
                    + Урок
                  </Button>
                </div>
                <p className="text-lg text-[#6B7280]">Управляйте структурой курса</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-6">
                  {courseLessons.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className={`cursor-pointer transition-all ${
                        activeLessonId === lesson.id
                          ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                          : "hover:bg-background-gray"
                      }`}
                      onClick={() => selectLesson(lesson.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-[#111827] text-sm">{lesson.title}</h3>
                              {activeLessonId === lesson.id && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280]">{lesson.blocks.length} блоков</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="text"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeLesson(lesson.id)
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {activeLessonId === lesson.id && (
                          <div className="mt-3 space-y-2">
                            <Input
                              value={lesson.title}
                              onChange={(e) => updateLessonTitle(lesson.id, e.target.value)}
                              placeholder="Название урока"
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Textarea
                              value={lesson.description}
                              onChange={(e) => updateLessonDescription(lesson.id, e.target.value)}
                              placeholder="Описание урока"
                              className="text-sm"
                              rows={2}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {courseLessons.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-[#6B7280] text-sm mb-3">Нет уроков</p>
                      <Button
                        onClick={addLesson}
                        size="sm"
                        variant="secondary"
                        className="border-primary text-primary hover:bg-primary/10 bg-transparent transition-colors"
                      >
                        Создать первый урок
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Блоки активного урока */}
            {activeLessonId && (
              <Card className="border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#659AB8]">Блоки урока</h2>
                    <div className="flex gap-1">
                      {/* Кнопки для добавления блоков */}
                      <Button
                        onClick={() => addBlock("introduction")}
                        size="sm"
                        variant="secondary"
                        className="text-xs px-2 py-1 h-6"
                        title="Добавить блок"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-[#6B7280]">Перетаскивайте блоки для изменения порядка</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-6">
                    {courseBlocks.map((block) => {
                      const completedElements = block.elements.filter((el) => el.completed).length
                      const totalElements = block.elements.length

                      return (
                        <Card
                          key={block.id}
                          draggable
                          onDragStart={(e) => handleBlockDragStart(e, block.id)}
                          onDragOver={handleElementDragOver}
                          onDrop={(e) => handleBlockDrop(e, block.id)}
                          className={`cursor-pointer transition-all ${
                            activeBlockId === block.id
                              ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                              : "hover:bg-background-gray"
                          } ${draggedBlock === block.id ? "opacity-50" : ""}`}
                          onClick={() => setActiveBlockId(block.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-[#111827] text-sm">{block.title}</h3>
                                  {activeBlockId === block.id && (
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-[#6B7280]">
                                  {completedElements}/{totalElements} элементов заполнено
                                </p>
                                {totalElements > 0 && (
                                  <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                                    <div
                                      className="bg-[#659AB8] h-1 rounded-full transition-all"
                                      style={{ width: `${(completedElements / totalElements) * 100}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="text"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeBlock(block.id)
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </Button>
                                <div className="cursor-move text-slate-400">
                                  <GripVerticalIcon className="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}

                    {courseBlocks.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-[#6B7280] text-sm mb-3">Нет блоков в уроке</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {[
                            { type: "introduction", label: "Дополнительный блок" },
                            { type: "main_block_1", label: "Основной блок" },
                            { type: "intermediate_practice", label: "Практика" },
                          ].map(({ type, label }) => (
                            <Button
                              key={type}
                              onClick={() => addBlock(type as CourseBlock["type"])}
                              size="sm"
                              variant="secondary"
                              className="text-xs border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/10"
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Column - Block Editor */}
          <div className="lg:col-span-6">
            {activeLessonId && activeBlockId ? (
              <Card className="border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-[#659AB8]">
                          {courseBlocks.find((b) => b.id === activeBlockId)?.title}
                        </h2>
                        <div className="text-xs bg-[#659AB8]/10 text-[#659AB8] px-2 py-1 rounded-full">
                          {courseLessons.find((l) => l.id === activeLessonId)?.title}
                        </div>
                      </div>
                      <p className="text-sm text-[#6B7280] mt-1">
                        {courseBlocks.find((b) => b.id === activeBlockId)?.description}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#6B7280]">Перетаскивайте элементы для изменения порядка</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseBlocks
                      .find((b) => b.id === activeBlockId)
                      ?.elements.map((element) => {
                        const Icon = getElementIcon(element.type, element.educationalType)
                        return (
                          <Card
                            key={element.id}
                            draggable
                            onDragStart={(e) => handleElementDragStart(e, element.id)}
                            onDragOver={handleElementDragOver}
                            onDrop={(e) => handleElementDrop(e, element.id, activeBlockId)}
                            className={`bg-white transition-all ${
                              draggedElement === element.id ? "opacity-50" : ""
                            } ${
                              element.mode === "notes"
                                ? "border-2 border-dashed border-amber-300 bg-amber-50/30"
                                : "border-0"
                            }`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <GripVerticalIcon className="w-4 h-4 text-slate-400 cursor-grab" />
                                  <div className="w-8 h-8 bg-[#659AB8] rounded-full flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[#659AB8]">
                                      {getElementLabel(element.type, element.educationalType)}
                                    </span>
                                    {element.mode === "notes" && (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
                                        <EyeOffIcon className="w-3 h-3 text-amber-600" />
                                        <span className="text-xs text-amber-600 font-medium">Заметки</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="text"
                                    size="sm"
                                    onClick={() => toggleElementMode(activeBlockId, element.id)}
                                    className={`h-8 px-3 text-xs ${
                                      element.mode === "lesson"
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    }`}
                                  >
                                    {element.mode === "lesson" ? "Для урока" : "Заметки"}
                                  </Button>
                                  <Button
                                    variant="text"
                                    size="sm"
                                    onClick={() => removeElement(activeBlockId, element.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {element.type === "title" ? (
                                <div className="space-y-3">
                                  <Input
                                    value={element.content}
                                    onChange={(e) => updateElementContent(activeBlockId, element.id, e.target.value)}
                                    placeholder={getElementPlaceholder(element.type, element.educationalType)}
                                    className="h-11"
                                  />
                                  <div className="text-xs text-[#6B7280] bg-background-gray p-2 rounded">
                                    {getElementDescription(element.type, element.mode, element.educationalType)}
                                  </div>
                                </div>
                              ) : element.type === "video" ? (
                                <div className="space-y-3">
                                  <Input
                                    type="url"
                                    value={element.content}
                                    onChange={(e) => updateElementContent(activeBlockId, element.id, e.target.value)}
                                    placeholder={getElementPlaceholder(element.type, element.educationalType)}
                                    className="h-11"
                                  />
                                  <div className="text-xs text-[#6B7280] bg-background-gray p-2 rounded">
                                    {getElementDescription(element.type, element.mode, element.educationalType)}
                                  </div>
                                </div>
                              ) : element.type === "audio" ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        updateElementContent(activeBlockId, element.id, `Аудиофайл: ${file.name}`)
                                      }
                                    }}
                                    className="hidden"
                                    id={`audio-${element.id}`}
                                  />
                                  <label htmlFor={`audio-${element.id}`} className="cursor-pointer">
                                    <div className="text-gray-500">
                                      <p className="text-sm">Выберите файл</p>
                                    </div>
                                  </label>
                                </div>
                              ) : element.type === "image" ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        updateElementContent(activeBlockId, element.id, `Изображение: ${file.name}`)
                                      }
                                    }}
                                    className="hidden"
                                    id={`image-${element.id}`}
                                  />
                                  <label htmlFor={`image-${element.id}`} className="cursor-pointer">
                                    <div className="text-gray-500">
                                      <p className="text-sm">Выберите файл</p>
                                    </div>
                                  </label>
                                </div>
                              ) : element.type === "audio" ? (
                                <AudioUpload
                                  onAudioUpload={(audioFile) => {
                                    updateElementContent(activeBlockId, element.id, `Аудио: ${audioFile.name}`)
                                  }}
                                  onTranscription={(transcription) => {
                                    if (transcription) {
                                      updateElementContent(activeBlockId, element.id, transcription)
                                    }
                                  }}
                                />
                              ) : element.type === "video" ? (
                                <VideoUpload
                                  onVideoUpload={(videoFile) => {
                                    updateElementContent(activeBlockId, element.id, `Видео: ${videoFile.name}`)
                                  }}
                                  onTranscription={(transcription) => {
                                    if (transcription) {
                                      updateElementContent(activeBlockId, element.id, transcription)
                                    }
                                  }}
                                />
                              ) : element.type === "image" ? (
                                <ImageLibrary
                                  onImageSelect={(imageUrl, imageData) => {
                                    updateElementContent(activeBlockId, element.id, `Изображение: ${imageData.alt_description}`)
                                  }}
                                  onCustomUpload={(file) => {
                                    updateElementContent(activeBlockId, element.id, `Изображение: ${file.name}`)
                                  }}
                                />
                              ) : element.type === "file" ? (
                                <FileUploadElement
                                  elementId={element.id}
                                  blockId={activeBlockId}
                                  currentContent={element.content}
                                  onContentUpdate={updateElementContent}
                                />
                              ) : element.type === "test" ? (
                                <TestCreator
                                  initialData={element.content ? JSON.parse(element.content) : undefined}
                                  onChange={(testData) => {
                                    updateElementContent(activeBlockId, element.id, JSON.stringify(testData))
                                  }}
                                />
                              ) : (
                                <div className="space-y-3">
                                  <Textarea
                                    value={element.content || ""}
                                    onChange={(e) => updateElementContent(activeBlockId, element.id, e.target.value)}
                                    placeholder="Напишите, о чём вы хотели бы рассказать в этом блоке"
                                    rows={4}
                                  />
                                  <div className="text-xs text-[#6B7280] bg-background-gray p-2 rounded">
                                    {getElementDescription(element.type, element.mode, element.educationalType)}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}

                    <Card className="bg-background-gray border-2 border-dashed border-slate-300">
                      <CardContent className="p-6 sm:p-8 lg:p-10">
                        <h3 className="font-semibold text-[#6B7280] mb-4 text-center">Добавить элемент</h3>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-[#111827] mb-3">Образовательные блоки</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="secondary"
                                onClick={() => addElement(activeBlockId, "text", "theory")}
                                className="h-10 text-sm justify-start flex items-center"
                              >
                                <BookOpenIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">Теория</span>
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => addElement(activeBlockId, "text", "example")}
                                className="h-10 text-sm justify-start flex items-center"
                              >
                                <TargetIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">Пример</span>
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => addElement(activeBlockId, "task", "practice")}
                                className="h-10 text-sm justify-start flex items-center"
                              >
                                <ClipboardListIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">Практика</span>
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => addElement(activeBlockId, "test", "knowledge_check")}
                                className="h-10 text-sm justify-start flex items-center"
                              >
                                <HelpCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">Проверка знаний</span>
                              </Button>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-[#111827] mb-3">
                              {constructorMode === "personalized" && authorProfile
                                ? `Рекомендуемые элементы для типа "${authorProfile.author_type}"`
                                : "Базовые элементы"}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {getRecommendedElements().map((elementType) => {
                                const Icon = getElementIcon(elementType)
                                const label = getElementLabel(elementType)

                                return (
                                  <Button
                                    key={elementType}
                                    variant="secondary"
                                    onClick={() => addElement(activeBlockId, elementType)}
                                    className={`h-10 text-sm justify-start ${
                                      constructorMode === "personalized"
                                        ? "border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/10"
                                        : ""
                                    }`}
                                  >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {label}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#659AB8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpenIcon className="w-8 h-8 text-[#659AB8]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#659AB8] mb-2">Выберите урок и блок для редактирования</h3>
                  <p className="text-[#6B7280] mb-6">Создайте урок и выберите блок, чтобы начать добавлять контент</p>
                  {courseLessons.length === 0 && (
                    <Button onClick={addLesson} className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white">
                      Создать первый урок
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Hints */}
          <div className="lg:col-span-3">
            <Card className="border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <LightbulbIcon className="w-5 h-5 text-[#659AB8]" />
                  <h2 className="text-lg font-bold text-[#659AB8]">Подсказки</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {authorProfile && constructorMode === "personalized" && (
                    <div className="space-y-4">
                      {/* Акцентная кнопка */}
                      <div className={`p-4 rounded-lg border-2 ${getAccentElement(authorProfile.author_type).color}`}>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            // Пока без функциональности
                          }}
                          className="w-full mb-3 bg-white/50 hover:bg-white/80"
                        >
                          {getAccentElement(authorProfile.author_type).buttonText}
                        </Button>
                        <p className="text-sm font-medium">{getAccentElement(authorProfile.author_type).visibleHint}</p>
                      </div>

                      {/* Основная подсказка */}
                      <div className="p-4 bg-[#FEFDF2] border border-[#659AB8]/20 rounded-lg">
                        <h4 className="font-semibold text-[#659AB8] mb-2">Основная подсказка:</h4>
                        <p className="text-sm text-[#111827] leading-relaxed">
                          {getPedagogicalHints(authorProfile.author_type).main}
                        </p>
                      </div>

                      {/* Структурная подсказка (скрытая) */}
                      <div className="p-4 bg-background-gray border border-[#E5E7EB] rounded-lg">
                        <h4 className="font-semibold text-[#111827] mb-3">Структурная подсказка:</h4>
                        <div className="flex justify-start mb-3">
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => setShowStructuralHint(!showStructuralHint)}
                            className="text-[#659AB8] hover:text-[#659AB8]/80"
                          >
                            {showStructuralHint ? "Скрыть" : "Показать"}
                          </Button>
                        </div>
                        {showStructuralHint && (
                          <div className="text-sm text-[#111827] leading-relaxed whitespace-pre-line">
                            {getPedagogicalHints(authorProfile.author_type).structural}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {constructorMode === "standard" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#FEFDF2] border border-[#659AB8]/20 rounded-lg">
                        <h4 className="font-semibold text-[#659AB8] mb-2">Универсальные подсказки:</h4>
                        <div className="space-y-2">
                          <p className="text-sm text-[#111827]">• Правило: 1 блок = 1 ключевая мысль</p>
                          <p className="text-sm text-[#111827]">• Структура: теория → пример → практика</p>
                          <p className="text-sm text-[#111827]">• Добавляйте переходы между темами</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Сообщение если нет профиля автора */}
                  {!authorProfile && constructorMode === "personalized" && (
                    <div className="text-center py-6">
                      <p className="text-[#6B7280] text-sm">
                        Пройдите тест автора для получения персонализированных подсказок
                      </p>
                    </div>
                  )}

                  {/* Динамические подсказки */}
                  {activeHint && (
                    <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                      <div className="p-4 bg-[#FEFDF2] border border-[#659AB8]/20 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            <LightbulbIcon className="w-5 h-5 text-[#659AB8] mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#659AB8] mb-1 text-sm">Рекомендация</h4>
                              <p className="text-sm text-[#111827]">{activeHint.message}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissHint(activeHint.id)}
                            className="text-[#6B7280] hover:text-[#111827] text-xs px-2 py-1 h-auto flex-shrink-0"
                          >
                            Позже
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <CourseActionModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        courseLink={modalState.courseLink}
        onClose={() => setModalState({ isOpen: false, type: null })}
      />

      {/* Модальное окно подтверждения удаления доступа */}
      {showRemoveAccessModal && studentToRemove && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-white border-2 border-primary">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-primary mb-2">Закрыть доступ</h2>
                  <p className="text-[#6B7280] text-sm">
                    Вы уверены, что хотите закрыть доступ к курсу для {studentToRemove.email}?
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowRemoveAccessModal(false)
                    setStudentToRemove(null)
                  }} 
                  className="p-1 h-auto"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRemoveAccessModal(false)
                    setStudentToRemove(null)
                  }}
                  className="text-[#6B7280]"
                >
                  Отменить
                </Button>
                <Button
                  onClick={removeStudentAccess}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Закрыть доступ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Модалка переключения режимов */}
      <ModeSwitchWarning
        isOpen={showModeSwitchWarning}
        onClose={() => {
          setShowModeSwitchWarning(false)
          setPendingMode(null)
        }}
        onConfirm={() => confirmModeSwitch(false)}
        onSaveAndSwitch={() => confirmModeSwitch(true)}
        currentMode={constructorMode}
        targetMode={pendingMode || "standard"}
        hasUnsavedChanges={saveStatus === "unsaved"}
      />
    </div>
  )
}
