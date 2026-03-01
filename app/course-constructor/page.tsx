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
import { generateUUID } from "@/lib/uuid"
import { PricingEditor } from "@/components/ui/pricing-editor"
import { toast } from "@/components/ui/use-toast"
import { createBrowserClient } from "@supabase/ssr"
import { AudioUploadV2 } from "@/components/ui/audio-upload-v2"
import { createDefaultPricing } from "@/lib/course-pricing"
import { VideoUploadV2 } from "@/components/ui/video-upload-v2"
import { DocumentUpload } from "@/components/ui/document-upload"
import { ImageUploadV2 } from "@/components/ui/image-upload-v2"
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
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Методист":
      return {
        buttonText: "Добавить план / схему",
        visibleHint: "Начни с плана: 3–5 пунктов — потом легко развернуть в содержание",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Автор на вдохновении":
      return {
        buttonText: "Записать идею в потоке",
        visibleHint: "Не думай о форме — зафиксируй первую идею, а дальше мы поможем её оформить",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Первопроходец":
      return {
        buttonText: "Написать приветствие",
        visibleHint: "Твоя история — лучший старт. Скажи пару предложений о себе и о пользе курса",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Загруженный эксперт":
      return {
        buttonText: "Загрузить материалы",
        visibleHint: "Кидай как есть или наговори три идеи — мы сами разложим по шагам",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Педагог с эмпатией":
      return {
        buttonText: "Добавить объяснение простыми словами",
        visibleHint: "Скажи так, чтобы понял человек, который сталкивается с этим впервые",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Практик-рационал":
      return {
        buttonText: "Добавить шаг",
        visibleHint: "Каждый шаг = действие ученика. Два–четыре шага дадут понятный результат",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    case "Интуитивный автор":
      return {
        buttonText: "Добавить что угодно",
        visibleHint: "Выбери любимый формат и начни — мы поможем собрать это в целостный урок",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
      }
    default:
      return {
        buttonText: "Добавить контент",
        visibleHint: "Начните с любого удобного формата",
        color: "bg-[#E8F4FA] border-[#CDE6F9] text-[#5589a7]",
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
  const isInitialLoadRef = useRef(false) // Флаг для предотвращения повторной загрузки
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
  const [isHintTransitioning, setIsHintTransitioning] = useState(false)
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

  // Состояние для ИИ-структурирования тезисов
  const [isStructuringTheses, setIsStructuringTheses] = useState(false)
  const [thesesCopied, setThesesCopied] = useState(false)

  // Состояния для секции "Финальная настройка"
  const [showFinalSetupModal, setShowFinalSetupModal] = useState(false)
  const [isFinalSetupExpanded, setIsFinalSetupExpanded] = useState(false)
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(false)
  const [isConclusionExpanded, setIsConclusionExpanded] = useState(false)
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<'expectations' | 'anxiety' | 'format' | null>(null)
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false)
  const [isGeneratingNavigation, setIsGeneratingNavigation] = useState(false)
  const [isGeneratingConclusion, setIsGeneratingConclusion] = useState(false)

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

  // Helper: найти первый основной блок для показа тезисов
  const getFirstMainBlockId = (blocks: CourseBlock[]) => {
    const mainBlock = blocks.find(b => ['main_block_1', 'main_block_2', 'main_block_3'].includes(b.type))
    return mainBlock?.id || blocks[0]?.id || ""
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
    setActiveBlockId(getFirstMainBlockId(newLesson.blocks))
  }

  const removeLesson = (lessonId: string) => {
    setCourseLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId))

    if (activeLessonId === lessonId) {
      const remainingLessons = courseLessons.filter((lesson) => lesson.id !== lessonId)
      if (remainingLessons.length > 0) {
        setActiveLessonId(remainingLessons[0].id)
        setCourseBlocks(remainingLessons[0].blocks)
        setActiveBlockId(getFirstMainBlockId(remainingLessons[0].blocks))
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
      setActiveBlockId(getFirstMainBlockId(lesson.blocks))
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

    // Загружаем данные только ОДИН РАЗ при первом монтировании
    if (user && !isInitialLoadRef.current) {
      isInitialLoadRef.current = true
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

  // Автосохранение каждые 5 минут
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current)
    }

    // Устанавливаем новый таймер (5 минут = 300000 мс)
    if (courseTitle.trim()) {
      autosaveTimerRef.current = setInterval(() => {
        autosaveCourse(true)
      }, 300000) // 5 минут
    }

    // Очищаем таймер при размонтировании компонента
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current)
      }
    }
  }, [courseTitle, courseDescription, courseLessons, courseBlocks])

  // Предупреждение перед уходом со страницы при несохраненных изменениях
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" && courseTitle.trim()) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [saveStatus, courseTitle])

  // Отмечаем данные как "несохраненные" при изменениях
  useEffect(() => {
    if (courseTitle.trim() && lastSavedAt) {
      setSaveStatus("unsaved")
    }
  }, [courseTitle, courseDescription, courseLessons, courseBlocks])

  // Сохраняем в localStorage для восстановления при перезагрузке
  useEffect(() => {
    // НЕ сохраняем в localStorage если данные уже сохранены в БД
    // Это предотвращает перезапись БД данных локальными после успешного сохранения
    if (courseTitle.trim() && saveStatus !== "saved") {
      const draftData = {
        title: courseTitle,
        description: courseDescription,
        lessons: courseLessons,
        blocks: courseBlocks,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem("courseConstructorDraft", JSON.stringify(draftData))
    }
  }, [courseTitle, courseDescription, courseLessons, courseBlocks, saveStatus])

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
    const modeParam = urlParams.get("mode")
    const isNewCourse = modeParam === "new"

    // Если создаем новый курс, очищаем localStorage от старых данных
    if (isNewCourse) {
      console.log("[v0] Creating new course, clearing localStorage")
      localStorage.removeItem("currentCourseId")
      localStorage.removeItem("courseConstructorDraft")
      setCurrentCourseId(null)
      // Очищаем состояние
      setCourseTitle("")
      setCourseDescription("")
      setCourseLessons([])
      setCourseBlocks([])
      setActiveBlockId("")
      setActiveLessonId("")
      setSaveStatus("unsaved")
      setLastSavedAt(null)
      return
    }

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

          // СНАЧАЛА проверяем localStorage (приоритет локальным данным!)
          const draftString = localStorage.getItem("courseConstructorDraft")
          let useLocalData = false
          let draftTimestamp: Date | null = null

          if (draftString) {
            try {
              const draft = JSON.parse(draftString)
              draftTimestamp = new Date(draft.timestamp)
              const courseUpdatedAt = new Date(course.updated_at || 0)

              // Используем локальные данные если они свежее или равны (с учетом задержки 5 сек)
              const timeDiff = draftTimestamp.getTime() - courseUpdatedAt.getTime()
              if (timeDiff >= -5000) {
                // localStorage новее или почти равен БД (разница меньше 5 сек)
                useLocalData = true
                setCourseTitle(draft.title || "")
                setCourseDescription(draft.description || "")
                if (draft.lessons && draft.lessons.length > 0) {
                  setCourseLessons(draft.lessons)
                  setActiveLessonId(draft.lessons[0].id)
                  setCourseBlocks(draft.lessons[0].blocks)
                  setActiveBlockId(getFirstMainBlockId(draft.lessons[0].blocks))
                }

                // Если разница больше 1 секунды - данные еще не сохранены
                if (timeDiff > 1000) {
                  setSaveStatus("unsaved")
                } else {
                  setSaveStatus("saved")
                  setLastSavedAt(draftTimestamp)
                }
              }
            } catch (e) {
              console.error("Error parsing draft:", e)
              localStorage.removeItem("courseConstructorDraft")
            }
          }

          // Если не используем локальные данные - загружаем из БД
          if (!useLocalData) {
            setCourseTitle(course.title || "")
            setCourseDescription(course.description || "")

            if (course.modules && course.modules.lessons) {
              setCourseLessons(course.modules.lessons)
              if (course.modules.lessons.length > 0) {
                const firstLesson = course.modules.lessons[0]
                setActiveLessonId(firstLesson.id)
                setCourseBlocks(firstLesson.blocks)
                setActiveBlockId(getFirstMainBlockId(firstLesson.blocks))
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
              setActiveBlockId(getFirstMainBlockId(migrationLesson.blocks))
            }

            setLastSavedAt(new Date(course.updated_at || Date.now()))
            setSaveStatus("saved")
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
            setActiveBlockId(getFirstMainBlockId(draft.lessons[0].blocks))
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

    // Создаём первый блок по умолчанию
    const defaultBlock: CourseBlock = {
      id: "default-block-1",
      type: "main_block_1",
      title: "Основной блок",
      description: "Первая ключевая тема урока",
      purpose: "Дать основные знания по первой важной теме",
      elements: [],
      required: true,
      completed: false,
    }

    const firstLesson: CourseLesson = {
      id: "first-lesson",
      title: "Урок 1",
      description: "",
      order: 1,
      blocks: [defaultBlock],
      completed: false,
    }
    setCourseLessons([firstLesson])
    setActiveLessonId(firstLesson.id)
    setCourseBlocks([defaultBlock])
    setActiveBlockId(defaultBlock.id)
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
        setActiveBlockId(getFirstMainBlockId(extendedBlocks))
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
        setActiveBlockId(getFirstMainBlockId(extendedBlocks))
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

  // Функция для закрытия подсказки с анимацией
  const dismissHint = (hintId: string) => {
    setIsHintTransitioning(true)
    setTimeout(() => {
      setDismissedHints((prev) => [...prev, hintId])
      setTimeout(() => {
        setIsHintTransitioning(false)
      }, 300)
    }, 300)
  }

  useEffect(() => {
    // Логика инициализации теперь полностью в loadSavedCourse
    // который вызывается после загрузки профиля в checkAuthorProfile
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

  const getEducationalContentLength = () => {
    return courseBlocks
      .filter((block) => block.category === 'educational')
      .reduce((total, block) => {
        return total + block.elements.reduce((sum, el) => sum + (el.content?.length || 0), 0)
      }, 0)
  }

  const updateBlockTheses = (blockId: string, theses: string) => {
    const updatedBlocks = courseBlocks.map((block) =>
      block.id === blockId ? { ...block, theses } : block,
    )
    updateCourseBlocks(updatedBlocks)
  }

  const structureTheses = async () => {
    const activeBlock = courseBlocks.find((b) => b.id === activeBlockId)
    if (!activeBlock?.theses?.trim()) return

    setIsStructuringTheses(true)
    try {
      const response = await fetch("/api/ai-structure-theses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theses: activeBlock.theses,
          blockTitle: activeBlock.title,
        }),
      })
      const data = await response.json()
      if (data.success && data.structured) {
        // Сохраняем структурированный результат отдельно (черновик остаётся)
        const updatedBlocks = courseBlocks.map((block) =>
          block.id === activeBlockId
            ? { ...block, thesesStructured: data.structured }
            : block
        )
        updateCourseBlocks(updatedBlocks)
      }
    } catch (error) {
      console.error("Error structuring theses:", error)
    } finally {
      setIsStructuringTheses(false)
    }
  }

  const generateMetaBlockContent = async () => {
    if (!selectedMetaTemplate) return
    const introBlock = courseBlocks.find((b) => b.type === 'introduction')
    if (!introBlock) return

    const lessonContent = courseBlocks
      .filter((b) => b.category === 'educational')
      .map((b) => b.elements.map((el) => el.content).filter(Boolean).join('\n'))
      .filter(Boolean)
      .join('\n\n')

    const lessonTitle = courseLessons.find((l) => l.id === activeLessonId)?.title || ''

    setIsGeneratingMeta(true)
    try {
      const response = await fetch("/api/ai-generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: selectedMetaTemplate,
          lessonContent,
          lessonTitle,
        }),
      })
      const data = await response.json()
      if (data.success && data.generatedText) {
        // Добавляем сгенерированный текст как новый элемент или в первый текстовый элемент
        const textElement = introBlock.elements.find((el) => el.type === 'text')
        if (textElement) {
          updateElementContent(introBlock.id, textElement.id, data.generatedText)
        } else {
          addElement(introBlock.id, "text")
          // Обновляем после добавления
          setTimeout(() => {
            const updatedBlock = courseBlocks.find((b) => b.type === 'introduction')
            const newEl = updatedBlock?.elements[updatedBlock.elements.length - 1]
            if (newEl) {
              updateElementContent(introBlock.id, newEl.id, data.generatedText)
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error generating meta block content:", error)
    } finally {
      setIsGeneratingMeta(false)
    }
  }

  const generateNavigationContent = async () => {
    const navBlock = courseBlocks.find((b) => b.type === 'navigation')
    if (!navBlock) return

    // Собираем информацию о блоках урока для генерации навигации
    const blocksInfo = courseBlocks
      .filter((b) => b.category === 'educational')
      .map((b) => {
        const content = b.elements.map((el) => el.content).filter(Boolean).join(' ').substring(0, 200)
        return `${b.title}: ${content || 'содержание не заполнено'}`
      })
      .join('\n')

    const lessonTitle = courseLessons.find((l) => l.id === activeLessonId)?.title || ''

    setIsGeneratingNavigation(true)
    try {
      const response = await fetch("/api/ai-generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: 'navigation',
          lessonContent: blocksInfo,
          lessonTitle,
        }),
      })
      const data = await response.json()
      if (data.success && data.generatedText) {
        const textElement = navBlock.elements.find((el) => el.type === 'text')
        if (textElement) {
          updateElementContent(navBlock.id, textElement.id, data.generatedText)
        } else {
          addElement(navBlock.id, "text")
          setTimeout(() => {
            const updatedBlock = courseBlocks.find((b) => b.type === 'navigation')
            const newEl = updatedBlock?.elements[updatedBlock.elements.length - 1]
            if (newEl) {
              updateElementContent(navBlock.id, newEl.id, data.generatedText)
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error generating navigation content:", error)
    } finally {
      setIsGeneratingNavigation(false)
    }
  }

  const generateConclusionContent = async () => {
    const conclusionBlock = courseBlocks.find((b) => b.type === 'conclusion')
    if (!conclusionBlock) return

    // Собираем информацию о блоках урока для генерации заключения
    const blocksInfo = courseBlocks
      .filter((b) => b.category === 'educational')
      .map((b) => {
        const content = b.elements.map((el) => el.content).filter(Boolean).join(' ').substring(0, 200)
        return `${b.title}: ${content || 'содержание не заполнено'}`
      })
      .join('\n')

    const lessonTitle = courseLessons.find((l) => l.id === activeLessonId)?.title || ''

    setIsGeneratingConclusion(true)
    try {
      const response = await fetch("/api/ai-generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: 'conclusion',
          lessonContent: blocksInfo,
          lessonTitle,
        }),
      })
      const data = await response.json()
      if (data.success && data.generatedText) {
        const textElement = conclusionBlock.elements.find((el) => el.type === 'text')
        if (textElement) {
          updateElementContent(conclusionBlock.id, textElement.id, data.generatedText)
        } else {
          addElement(conclusionBlock.id, "text")
          setTimeout(() => {
            const updatedBlock = courseBlocks.find((b) => b.type === 'conclusion')
            const newEl = updatedBlock?.elements[updatedBlock.elements.length - 1]
            if (newEl) {
              updateElementContent(conclusionBlock.id, newEl.id, data.generatedText)
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error generating conclusion content:", error)
    } finally {
      setIsGeneratingConclusion(false)
    }
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
          setActiveBlockId(getFirstMainBlockId(modeData.lessons[0].blocks))
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

      const savedAt = new Date()
      setSaveStatus("saved")
      setLastSavedAt(savedAt)

      // Обновляем localStorage с новым timestamp (НЕ удаляем!)
      // Это позволит при перезагрузке понять, что данные актуальные
      const draftData = {
        title: courseTitle,
        description: courseDescription,
        lessons: courseLessons,
        blocks: courseBlocks,
        timestamp: savedAt.toISOString(),
      }
      localStorage.setItem("courseConstructorDraft", JSON.stringify(draftData))

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
      toast({
        title: "Внимание",
        description: "Введите название курса для сохранения",
      })
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
        const tempId = generateUUID()
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
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить курс",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Функция синхронизации уроков в таблицу course_lessons
  const syncLessonsToCourseTable = async (courseId: string, lessons: CourseLesson[]) => {
    console.log(`🔄 [Sync] Starting sync of ${lessons.length} lessons to course_lessons...`)

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      const legacyId = lesson.id // Сохраняем оригинальный ID как legacy_id

      try {
        // Проверяем, есть ли уже урок с таким legacy_id
        const { data: existingLesson } = await supabase
          .from("course_lessons")
          .select("id")
          .eq("course_id", courseId)
          .eq("legacy_id", legacyId)
          .maybeSingle()

        const lessonData = {
          course_id: courseId,
          title: lesson.title || `Урок ${i + 1}`,
          description: lesson.description || "",
          blocks: lesson.blocks || [],
          order_index: i,
          is_published: true,
          legacy_id: legacyId
        }

        if (existingLesson) {
          // Обновляем существующий урок
          const { error: updateError } = await supabase
            .from("course_lessons")
            .update(lessonData)
            .eq("id", existingLesson.id)

          if (updateError) {
            console.error(`❌ [Sync] Error updating lesson "${lesson.title}":`, updateError)
          } else {
            console.log(`✅ [Sync] Updated: "${lesson.title}" (${existingLesson.id})`)
          }
        } else {
          // Создаём новый урок с UUID
          const { data: newLesson, error: insertError } = await supabase
            .from("course_lessons")
            .insert(lessonData)
            .select("id")
            .single()

          if (insertError) {
            console.error(`❌ [Sync] Error creating lesson "${lesson.title}":`, insertError)
          } else {
            console.log(`✅ [Sync] Created: "${lesson.title}" (${legacyId} → ${newLesson.id})`)
          }
        }
      } catch (err) {
        console.error(`❌ [Sync] Error syncing lesson "${lesson.title}":`, err)
      }
    }

    console.log(`✅ [Sync] Sync complete for ${lessons.length} lessons`)
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
        const tempId = generateUUID()
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

      // Синхронизируем уроки в таблицу course_lessons с UUID
      console.log("Syncing lessons to course_lessons table...")
      await syncLessonsToCourseTable(courseId!, courseLessons)

      console.log("Course published successfully:", courseId)
      const courseLink = `${window.location.origin}/course/${courseId}`
      setModalState({ isOpen: true, type: "publish", courseLink })
    } catch (err) {
      console.error("Error publishing course:", err)
      toast({
        title: "Ошибка",
        description: "Не удалось опубликовать курс",
        variant: "destructive",
      })
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
      toast({
        title: "Ошибка",
        description: "Не удалось снять курс с публикации",
        variant: "destructive",
      })
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

  // Показываем скелетон только если данные ЕЩЕ НЕ загружены
  // Проверяем реальные данные в state + localStorage
  const hasLocalData = typeof window !== 'undefined' && (
    localStorage.getItem('currentCourseId') !== null ||
    localStorage.getItem('courseConstructorDraft') !== null
  )

  const hasData = authorProfile !== null ||
                  courseLessons.length > 0 ||
                  courseTitle.trim() !== "" ||
                  hasLocalData

  // DEBUG: логируем состояние при каждом рендере
  console.log('🔍 Skeleton check:', {
    authLoading,
    loading,
    hasData,
    hasLocalData,
    authorProfile: !!authorProfile,
    courseLessonsLength: courseLessons.length,
    courseTitle: courseTitle.substring(0, 30)
  })

  // ВАЖНО: Проверяем только loading компонента, НЕ authLoading
  // authLoading может меняться при переключении вкладок независимо от нас
  if (loading && !hasData) {
    console.log('⚠️ Showing skeleton because: loading =', loading, 'hasData =', hasData)
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
          <Card className="bg-white border-2 rounded-lg  text-center">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="w-16 h-16 bg-[#659AB8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangleIcon className="w-8 h-8 text-[#5589a7]" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#5589a7] mb-4">Пройдите тест на определение типа автора</h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
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
        actions={
          <div className="space-y-2">
            {/* Индикатор статуса автосохранения */}
            {courseTitle.trim() && (
              <div className="flex items-center justify-end gap-2 text-sm">
                {saveStatus === "saving" && (
                  <span className="text-[#5589a7] flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </span>
                )}
                {saveStatus === "saved" && lastSavedAt && (
                  <span className="text-[#5589a7] flex items-center gap-1">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Сохранено {new Date(lastSavedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {saveStatus === "unsaved" && (
                  <span className="text-slate-600 flex items-center gap-1">
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
                <button
                  onClick={() => setShowCollaboratorsModal(true)}
                  className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                >
                  Управление соавторами
                </button>
              )}
              <button
                onClick={saveCourse}
                disabled={isSaving}
                className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white disabled:opacity-50"
              >
                {isSaving ? "Сохранение..." : "Сохранить черновик"}
              </button>
              <button
                onClick={publishCourse}
                disabled={isPublishing}
                className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50"
              >
                {isPublishing ? "Публикация..." : "Опубликовать курс"}
              </button>
              {notification.type === "published" && (
                <button
                  onClick={unpublishCourse}
                  className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                >
                  Снять с публикации
                </button>
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

      {/* Mode badge at bottom */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {activeLessonId && getEducationalContentLength() >= 500 && (
          <button
            onClick={() => setShowFinalSetupModal(true)}
            className="text-sm px-4 py-2 rounded-lg bg-[#f59e0b] text-white font-semibold shadow-lg hover:bg-[#d97706] transition-colors"
          >
            Финальная настройка
          </button>
        )}
        <span className="text-sm px-4 py-2 rounded-lg bg-[#659AB8] text-white font-semibold shadow-lg">
          {constructorMode === "standard" ? "Стандартная сборка" : "По типу автора"}
        </span>
      </div>

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
          <Card className="border">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-[#5589a7] mb-4">Режим создания курса</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleModeSwitch("standard")}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border-2 border-[#659AB8] ${
                    constructorMode === "standard"
                      ? "bg-[#659AB8] text-white hover:bg-[#5589a7] hover:border-[#5589a7]"
                      : "bg-[#659AB8] text-white hover:bg-[#5589a7] hover:border-[#5589a7]"
                  }`}
                >
                  Стандартная сборка
                </button>
                <button
                  onClick={() => handleModeSwitch("personalized")}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border-2 border-[#659AB8] ${
                    constructorMode === "personalized"
                      ? "bg-[#659AB8] text-white hover:bg-[#5589a7] hover:border-[#5589a7]"
                      : "bg-[#659AB8] text-white hover:bg-[#5589a7] hover:border-[#5589a7]"
                  }`}
                >
                  По типу автора
                </button>
                <button
                  onClick={() => {
                    const currentCourseId = localStorage.getItem("currentCourseId")
                    if (currentCourseId) {
                      window.open(`/course/${currentCourseId}/adaptation`, '_blank')
                    } else {
                      toast({
                        title: "Внимание",
                        description: "Сначала сохраните курс, чтобы просмотреть адаптацию",
                      })
                    }
                  }}
                  className="w-full px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border-2 border-[#659AB8] bg-white text-[#659AB8] hover:bg-[#659AB8] hover:text-white"
                >
                  Просмотр адаптации
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Правый столбец - Название и описание курса */}
          <Card className="border">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-[#5589a7] mb-4">Информация о курсе</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="course-title" className="text-sm font-medium text-slate-900 mb-2 block">
                    Название курса
                  </Label>
                  <Input
                    id="course-title"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Введите название курса"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="course-description" className="text-sm font-medium text-slate-900 mb-2 block">
                    Описание курса
                  </Label>
                  <Textarea
                    id="course-description"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Краткое описание курса"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Уроки курса - Full Width */}
        <Card className="bg-white border-2 rounded-lg mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl lg:text-2xl font-bold text-[#5589a7]">Уроки курса</h2>
              <button onClick={addLesson} className="bg-[#659AB8] text-white w-8 h-8 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] flex items-center justify-center">
                +
              </button>
            </div>
            <p className="text-lg text-slate-600">Управляйте структурой курса</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 p-6">
              {courseLessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className={`cursor-pointer transition-all ${
                    activeLessonId === lesson.id
                      ? "ring-2 ring-[#659AB8] bg-[#659AB8]/5 border-[#659AB8]/30"
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
                            <div className="w-2 h-2 bg-[#659AB8] rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{lesson.blocks.length} блоков</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeLesson(lesson.id)
                        }}
                        className="text-[#659AB8] hover:text-[#5589a7] h-6 w-6 p-0 flex items-center justify-center"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
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
                  <p className="text-slate-600 text-sm mb-3">Нет уроков</p>
                  <Button
                    onClick={addLesson}
                    size="sm"
                    variant="secondary"
                    className="border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/10 bg-transparent transition-colors"
                  >
                    Создать первый урок
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Blocks */}
          <div className="lg:col-span-3">
            {/* Блоки активного урока */}
            {activeLessonId && (
              <Card className="border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#659AB8]">Блоки урока</h2>
                    <button
                      onClick={() => addBlock("main_block_1")}
                      className="bg-[#659AB8] text-white w-8 h-8 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] flex items-center justify-center"
                      title="Добавить блок"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">Перетаскивайте блоки для изменения порядка</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-6">
                    {courseBlocks.filter((b) => !['introduction', 'navigation', 'conclusion'].includes(b.type)).map((block) => {
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
                              ? "ring-2 ring-[#659AB8] bg-[#659AB8]/5 border-[#659AB8]/30"
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
                                    <div className="w-2 h-2 bg-[#659AB8] rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600">
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeBlock(block.id)
                                  }}
                                  className="text-[#659AB8] hover:text-[#5589a7] h-6 w-6 p-0 flex items-center justify-center"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
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
                        <p className="text-slate-600 text-sm mb-3">Нет блоков в уроке</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {[
                            { type: "main_block_1", label: "Основной блок" },
                            { type: "intermediate_practice", label: "Практика" },
                            { type: "intermediate_test", label: "Тест" },
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
                      <p className="text-sm text-slate-600 mt-1">
                        {courseBlocks.find((b) => b.id === activeBlockId)?.description}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Перетаскивайте элементы для изменения порядка</p>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const activeBlock = courseBlocks.find((b) => b.id === activeBlockId)
                    const isMainBlock = activeBlock && ['main_block_1', 'main_block_2', 'main_block_3'].includes(activeBlock.type)

                    const elementsList = (
                  <div className="space-y-4">
                    {activeBlock
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
                                ? "border-2 border-dashed border-[#E5E7EB] bg-[#FDF8F3]"
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
                                      <div className="flex items-center gap-1 px-2 py-1 bg-[#FDF8F3] border border-[#E5E7EB] rounded-full">
                                        <EyeOffIcon className="w-3 h-3 text-slate-600" />
                                        <span className="text-xs text-slate-600 font-medium">Заметки</span>
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
                                        ? "bg-[#E8F4FA] text-[#5589a7] hover:bg-[#CDE6F9]"
                                        : "bg-[#FDF8F3] text-slate-600 hover:bg-[#E5E7EB]"
                                    }`}
                                  >
                                    {element.mode === "lesson" ? "Для урока" : "Заметки"}
                                  </Button>
                                  <button
                                    onClick={() => removeElement(activeBlockId, element.id)}
                                    className="text-[#659AB8] hover:text-[#5589a7] h-6 w-6 p-0 flex items-center justify-center"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
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
                                  <div className="text-xs text-slate-600 bg-background-gray p-2 rounded">
                                    {getElementDescription(element.type, element.mode, element.educationalType)}
                                  </div>
                                </div>
                              ) : element.type === "audio" ? (
                                <AudioUploadV2
                                  courseId={currentCourseId || ""}
                                  lessonId={undefined}
                                  blockId={activeBlockId}
                                  elementId={element.id}
                                  initialAudioUrl={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileUrl || element.content
                                          } catch {
                                            return element.content
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileId={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileId
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  onAudioUpload={(fileId, fileUrl, fileName) => {
                                    const audioData = JSON.stringify({
                                      fileId,
                                      fileUrl,
                                      fileName,
                                      uploadedAt: new Date().toISOString(),
                                    })
                                    updateElementContent(activeBlockId, element.id, audioData)
                                  }}
                                />
                              ) : element.type === "video" ? (
                                <VideoUploadV2
                                  courseId={currentCourseId || ""}
                                  lessonId={undefined}
                                  blockId={activeBlockId}
                                  elementId={element.id}
                                  initialVideoUrl={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileUrl || element.content
                                          } catch {
                                            return element.content
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileId={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileId
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileName={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileName
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialSource={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.source
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  onVideoUpload={(fileId, fileUrl, fileName, source) => {
                                    const videoData = JSON.stringify({
                                      fileId,
                                      fileUrl,
                                      fileName,
                                      source: source || "file",
                                      uploadedAt: new Date().toISOString(),
                                    })
                                    updateElementContent(activeBlockId, element.id, videoData)
                                  }}
                                />
                              ) : element.type === "image" ? (
                                <ImageUploadV2
                                  courseId={currentCourseId || ""}
                                  lessonId={undefined}
                                  blockId={activeBlockId}
                                  elementId={element.id}
                                  initialImageUrl={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileUrl || element.content
                                          } catch {
                                            return element.content
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileId={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileId
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileName={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileName
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  onImageUpload={(fileId, fileUrl, fileName) => {
                                    const imageData = JSON.stringify({
                                      fileId,
                                      fileUrl,
                                      fileName,
                                      uploadedAt: new Date().toISOString(),
                                    })
                                    updateElementContent(activeBlockId, element.id, imageData)
                                  }}
                                />
                              ) : element.type === "file" ? (
                                <DocumentUpload
                                  courseId={currentCourseId || ""}
                                  lessonId={undefined}
                                  blockId={activeBlockId}
                                  elementId={element.id}
                                  initialDocumentUrl={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileUrl || element.content
                                          } catch {
                                            return element.content
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileId={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileId
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  initialFileName={
                                    element.content
                                      ? (() => {
                                          try {
                                            const parsed = JSON.parse(element.content)
                                            return parsed.fileName
                                          } catch {
                                            return undefined
                                          }
                                        })()
                                      : undefined
                                  }
                                  onDocumentUpload={(fileId, fileUrl, fileName) => {
                                    const documentData = JSON.stringify({
                                      fileId,
                                      fileUrl,
                                      fileName,
                                      uploadedAt: new Date().toISOString(),
                                    })
                                    updateElementContent(activeBlockId, element.id, documentData)
                                  }}
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
                                  <div className="text-xs text-slate-600 bg-background-gray p-2 rounded">
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
                        <h3 className="font-semibold text-slate-600 mb-4 text-center">Добавить элемент</h3>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-[#111827] mb-3">Образовательные блоки</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => addElement(activeBlockId, "text", "theory")}
                                className="h-10 text-sm bg-white text-[#659AB8] px-4 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                              >
                                Теория
                              </button>
                              <button
                                onClick={() => addElement(activeBlockId, "text", "example")}
                                className="h-10 text-sm bg-white text-[#659AB8] px-4 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                              >
                                Пример
                              </button>
                              <button
                                onClick={() => addElement(activeBlockId, "task", "practice")}
                                className="h-10 text-sm bg-white text-[#659AB8] px-4 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                              >
                                Практика
                              </button>
                              <button
                                onClick={() => addElement(activeBlockId, "test", "knowledge_check")}
                                className="h-10 text-sm bg-white text-[#659AB8] px-4 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                              >
                                Проверка знаний
                              </button>
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
                                const label = getElementLabel(elementType)

                                return (
                                  <button
                                    key={elementType}
                                    onClick={() => addElement(activeBlockId, elementType)}
                                    className="h-10 text-sm bg-white text-[#659AB8] px-4 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                                  >
                                    {label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                    )

                    if (isMainBlock) {
                      return (
                        <div className="space-y-4">
                          {/* Тезисы - два поля */}
                          <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <LightbulbIcon className="w-4 h-4 text-[#5589a7]" />
                              <span className="text-sm font-medium text-[#5589a7]">Тезисы</span>
                              <span className="text-xs text-slate-400">(только для вас)</span>
                            </div>

                            {/* Черновик */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Черновик</span>
                                <Button
                                  onClick={structureTheses}
                                  disabled={isStructuringTheses || !activeBlock?.theses?.trim()}
                                  className="bg-[#659AB8] hover:bg-[#5589a7] text-white text-xs px-3 py-1 h-auto"
                                  size="sm"
                                >
                                  {isStructuringTheses ? "Структурирую..." : "Структурировать"}
                                </Button>
                              </div>
                              <Textarea
                                value={activeBlock?.theses || ""}
                                onChange={(e) => updateBlockTheses(activeBlockId, e.target.value)}
                                placeholder="Набросайте мысли, идеи, ключевые тезисы..."
                                rows={3}
                                className="bg-white text-sm resize-none"
                              />
                              <p className="text-xs text-slate-400">
                                Пишите свободно — ученики это не увидят. Можно структурировать несколько раз.
                              </p>
                            </div>

                            {/* Результат структурирования */}
                            {activeBlock?.thesesStructured && (
                              <div className="mt-4 pt-3 border-t border-[#E5E7EB] space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-500">Структурированный план</span>
                                  <Button
                                    onClick={() => {
                                      navigator.clipboard.writeText(activeBlock.thesesStructured || "")
                                      setThesesCopied(true)
                                      setTimeout(() => setThesesCopied(false), 2000)
                                    }}
                                    variant="ghost"
                                    className="text-xs text-slate-500 hover:text-[#5589a7] px-2 py-1 h-auto"
                                    size="sm"
                                  >
                                    {thesesCopied ? "Скопировано" : "Копировать"}
                                  </Button>
                                </div>
                                <div className="bg-white border border-[#E5E7EB] rounded-md p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                  {activeBlock.thesesStructured}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Элементы */}
                          {elementsList}
                        </div>
                      )
                    }

                    return elementsList
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#659AB8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpenIcon className="w-8 h-8 text-[#659AB8]" />
                  </div>
                  {activeLessonId && courseBlocks.length === 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-[#659AB8] mb-2">Создайте первый блок</h3>
                      <p className="text-slate-600 mb-6">Добавьте блок слева, чтобы начать добавлять элементы курса</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-[#659AB8] mb-2">Выберите урок и блок для редактирования</h3>
                      <p className="text-slate-600 mb-6">Создайте урок и выберите блок, чтобы начать добавлять контент</p>
                      {courseLessons.length === 0 && (
                        <Button onClick={addLesson} className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white">
                          Создать первый урок
                        </Button>
                      )}
                    </>
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
                  <LightbulbIcon className="w-5 h-5 text-[#5589a7]" />
                  <h2 className="text-lg font-semibold text-[#5589a7]">Подсказки</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {authorProfile && constructorMode === "personalized" && (
                    <div className="space-y-4">
                      {/* Акцентная подсказка */}
                      <div className={`p-4 rounded-lg border ${getAccentElement(authorProfile.author_type).color}`}>
                        <h4 className="font-semibold text-[#5589a7] mb-2 text-sm">Рекомендация для вашего типа:</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{getAccentElement(authorProfile.author_type).visibleHint}</p>
                      </div>

                      {/* Основная подсказка */}
                      <div className="p-4 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                        <h4 className="font-semibold text-[#5589a7] mb-2 text-sm">Основная подсказка:</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {getPedagogicalHints(authorProfile.author_type).main}
                        </p>
                      </div>

                      {/* Структурная подсказка (скрытая) */}
                      <div className="p-4 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                        <h4 className="font-semibold text-[#5589a7] mb-2 text-sm">Структурная подсказка:</h4>
                        <div className="flex justify-start mb-2">
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => setShowStructuralHint(!showStructuralHint)}
                            className="text-[#5589a7] hover:text-[#5589a7]/80"
                          >
                            {showStructuralHint ? "Скрыть" : "Показать"}
                          </Button>
                        </div>
                        {showStructuralHint && (
                          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {getPedagogicalHints(authorProfile.author_type).structural}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {constructorMode === "standard" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                        <h4 className="font-semibold text-[#5589a7] mb-2 text-sm">Универсальные подсказки:</h4>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600">• Правило: 1 блок = 1 ключевая мысль</p>
                          <p className="text-sm text-slate-600">• Структура: теория → пример → практика</p>
                          <p className="text-sm text-slate-600">• Добавляйте переходы между темами</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Сообщение если нет профиля автора */}
                  {!authorProfile && constructorMode === "personalized" && (
                    <div className="text-center py-6">
                      <p className="text-slate-600 text-sm">
                        Пройдите тест автора для получения персонализированных подсказок
                      </p>
                    </div>
                  )}

                  {/* Динамические подсказки */}
                  {activeHint && (
                    <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                      <div className={`p-4 bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg transition-all duration-500 ease-out ${
                        isHintTransitioning
                          ? "opacity-0 transform -translate-x-full scale-95"
                          : "opacity-100 transform translate-x-0 scale-100"
                      }`}>
                        <h4 className="font-semibold text-[#5589a7] mb-2 text-sm">Рекомендация</h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">{activeHint.message}</p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => dismissHint(activeHint.id)}
                            disabled={isHintTransitioning}
                            className="text-slate-500 text-sm hover:text-[#5589a7] transition-colors disabled:opacity-50"
                          >
                            Позже
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Модалка "Финальная настройка" */}
        {showFinalSetupModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#E5E7EB] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#659AB8]/10 rounded-full flex items-center justify-center">
                    <ClipboardListIcon className="w-5 h-5 text-[#5589a7]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#5589a7]">Финальная настройка</h3>
                    <p className="text-sm text-slate-500">Настройте дополнительные блоки урока</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFinalSetupModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Карточка "Как работать с уроком" */}
                <Card className="bg-white border-[#E5E7EB]">
                  <CardContent className="p-5">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setIsFinalSetupExpanded(!isFinalSetupExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#659AB8]/10 rounded-full flex items-center justify-center">
                          <BookOpenIcon className="w-4 h-4 text-[#5589a7]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[#111827]">Как работать с уроком</h4>
                          <p className="text-xs text-slate-500">Инструкция для ученика перед началом урока</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-400">
                          {courseBlocks.find((b) => b.type === 'introduction')?.elements.some((el) => el.content?.trim())
                            ? <span className="text-green-600">Заполнено</span>
                            : <span>Не заполнено</span>
                          }
                        </div>
                        <span className={`text-[#659AB8] text-sm transition-transform ${isFinalSetupExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </div>

                    {isFinalSetupExpanded && (() => {
                      const introBlock = courseBlocks.find((b) => b.type === 'introduction')
                      if (!introBlock) return null

                      return (
                        <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-5">
                          <div className="p-4 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                            <p className="text-sm text-slate-600">
                              Этот блок поможет ученику понять, как устроен урок, чего ожидать и как получить максимум пользы.
                            </p>
                          </div>

                          <div>
                            <h5 className="text-sm font-medium text-[#111827] mb-3">Выберите шаблон для ИИ-генерации:</h5>
                            <div className="space-y-2">
                              {[
                                { id: 'expectations' as const, label: 'Ожидания от урока', desc: 'Что узнает ученик, какие навыки получит' },
                                { id: 'anxiety' as const, label: 'Снятие тревоги', desc: 'Поддержка и мотивация перед сложной темой' },
                                { id: 'format' as const, label: 'Формат работы', desc: 'Как устроен урок, сколько времени займёт' },
                              ].map((tmpl) => (
                                <label
                                  key={tmpl.id}
                                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                    selectedMetaTemplate === tmpl.id
                                      ? 'border-[#659AB8] bg-[#659AB8]/5'
                                      : 'border-[#E5E7EB] hover:border-[#659AB8]/50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="metaTemplate"
                                    checked={selectedMetaTemplate === tmpl.id}
                                    onChange={() => setSelectedMetaTemplate(tmpl.id)}
                                    className="mt-1 accent-[#659AB8]"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-[#111827]">{tmpl.label}</span>
                                    <p className="text-xs text-slate-500">{tmpl.desc}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <Button
                              onClick={generateMetaBlockContent}
                              disabled={isGeneratingMeta || !selectedMetaTemplate}
                              className="mt-3 bg-[#659AB8] hover:bg-[#5589a7] text-white text-sm"
                              size="sm"
                            >
                              {isGeneratingMeta ? "Генерирую черновик..." : "Сгенерировать черновик"}
                            </Button>
                          </div>

                          <div>
                            <h5 className="text-sm font-medium text-[#111827] mb-3">Содержимое блока:</h5>
                            <div className="space-y-3">
                              {introBlock.elements.map((element) => {
                                const Icon = getElementIcon(element.type, element.educationalType)
                                return (
                                  <div key={element.id} className="border border-[#E5E7EB] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-[#659AB8]" />
                                        <span className="text-sm font-medium text-[#659AB8]">
                                          {getElementLabel(element.type, element.educationalType)}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => removeElement(introBlock.id, element.id)}
                                        className="text-slate-400 hover:text-red-500 h-6 w-6 p-0 flex items-center justify-center"
                                      >
                                        <TrashIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {element.type === "title" ? (
                                      <Input
                                        value={element.content}
                                        onChange={(e) => updateElementContent(introBlock.id, element.id, e.target.value)}
                                        placeholder="Заголовок блока"
                                        className="h-9 text-sm"
                                      />
                                    ) : element.type === "audio" ? (
                                      <AudioUploadV2
                                        courseId={currentCourseId || ""}
                                        lessonId={undefined}
                                        blockId={introBlock.id}
                                        elementId={element.id}
                                        initialAudioUrl={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileUrl || element.content
                                                } catch {
                                                  return element.content
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialFileId={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileId
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        onAudioUpload={(fileId, fileUrl, fileName) => {
                                          const audioData = JSON.stringify({
                                            fileId,
                                            fileUrl,
                                            fileName,
                                            uploadedAt: new Date().toISOString(),
                                          })
                                          updateElementContent(introBlock.id, element.id, audioData)
                                        }}
                                      />
                                    ) : element.type === "video" ? (
                                      <VideoUploadV2
                                        courseId={currentCourseId || ""}
                                        lessonId={undefined}
                                        blockId={introBlock.id}
                                        elementId={element.id}
                                        initialVideoUrl={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileUrl || element.content
                                                } catch {
                                                  return element.content
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialFileId={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileId
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialFileName={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileName
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialSource={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.source
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        onVideoUpload={(fileId, fileUrl, fileName, source) => {
                                          const videoData = JSON.stringify({
                                            fileId,
                                            fileUrl,
                                            fileName,
                                            source: source || "file",
                                            uploadedAt: new Date().toISOString(),
                                          })
                                          updateElementContent(introBlock.id, element.id, videoData)
                                        }}
                                      />
                                    ) : (
                                      <Textarea
                                        value={element.content || ""}
                                        onChange={(e) => updateElementContent(introBlock.id, element.id, e.target.value)}
                                        placeholder="Введите текст..."
                                        rows={3}
                                        className="text-sm"
                                      />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[
                              { type: "text" as const, label: "Текст" },
                              { type: "video" as const, label: "Видео" },
                              { type: "audio" as const, label: "Аудио" },
                            ].map(({ type, label }) => (
                              <Button
                                key={type}
                                onClick={() => addElement(introBlock.id, type)}
                                size="sm"
                                variant="secondary"
                                className="text-xs border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/10"
                              >
                                + {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Карточка "Навигация" */}
                <Card className="bg-white border-[#E5E7EB]">
                  <CardContent className="p-5">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setIsNavigationExpanded(!isNavigationExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#659AB8]/10 rounded-full flex items-center justify-center">
                          <ClipboardListIcon className="w-4 h-4 text-[#5589a7]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[#111827]">Навигация</h4>
                          <p className="text-xs text-slate-500">Структура урока для ученика (опционально)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-400">
                          {courseBlocks.find((b) => b.type === 'navigation')?.elements.some((el) => el.content?.trim())
                            ? <span className="text-green-600">Заполнено</span>
                            : <span>Не заполнено</span>
                          }
                        </div>
                        <span className={`text-[#659AB8] text-sm transition-transform ${isNavigationExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </div>

                    {isNavigationExpanded && (() => {
                      const navBlock = courseBlocks.find((b) => b.type === 'navigation')
                      if (!navBlock) return null

                      return (
                        <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-5">
                          <div className="p-4 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                            <p className="text-sm text-slate-600">
                              Этот блок покажет ученику структуру урока и поможет сориентироваться.
                            </p>
                          </div>

                          <div>
                            <Button
                              onClick={generateNavigationContent}
                              disabled={isGeneratingNavigation}
                              className="bg-[#659AB8] hover:bg-[#5589a7] text-white text-sm"
                              size="sm"
                            >
                              {isGeneratingNavigation ? "Генерирую структуру..." : "Сгенерировать структуру урока"}
                            </Button>
                            <p className="text-xs text-slate-400 mt-2">ИИ создаст навигацию на основе содержимого блоков урока</p>
                          </div>

                          <div>
                            <h5 className="text-sm font-medium text-[#111827] mb-3">Содержимое блока:</h5>
                            <div className="space-y-3">
                              {navBlock.elements.map((element) => {
                                const Icon = getElementIcon(element.type, element.educationalType)
                                return (
                                  <div key={element.id} className="border border-[#E5E7EB] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-[#659AB8]" />
                                        <span className="text-sm font-medium text-[#659AB8]">
                                          {getElementLabel(element.type, element.educationalType)}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => removeElement(navBlock.id, element.id)}
                                        className="text-slate-400 hover:text-red-500 h-6 w-6 p-0 flex items-center justify-center"
                                      >
                                        <TrashIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <Textarea
                                      value={element.content || ""}
                                      onChange={(e) => updateElementContent(navBlock.id, element.id, e.target.value)}
                                      placeholder="Введите текст..."
                                      rows={3}
                                      className="text-sm"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <Button
                            onClick={() => addElement(navBlock.id, "text")}
                            size="sm"
                            variant="secondary"
                            className="text-xs border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/10"
                          >
                            + Текст
                          </Button>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Карточка "Интеграция и завершение" */}
                <Card className="bg-white border-[#E5E7EB]">
                  <CardContent className="p-5">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setIsConclusionExpanded(!isConclusionExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#659AB8]/10 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="w-4 h-4 text-[#5589a7]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[#111827]">Интеграция и завершение</h4>
                          <p className="text-xs text-slate-500">Итоги урока и следующие шаги</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-400">
                          {courseBlocks.find((b) => b.type === 'conclusion')?.elements.some((el) => el.content?.trim())
                            ? <span className="text-green-600">Заполнено</span>
                            : <span>Не заполнено</span>
                          }
                        </div>
                        <span className={`text-[#659AB8] text-sm transition-transform ${isConclusionExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </div>

                    {isConclusionExpanded && (() => {
                      const conclusionBlock = courseBlocks.find((b) => b.type === 'conclusion')
                      if (!conclusionBlock) return null

                      return (
                        <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-5">
                          <div className="p-4 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                            <p className="text-sm text-slate-600">
                              Подведите итоги урока: что ученик узнал, какие следующие шаги, как применить знания.
                            </p>
                          </div>

                          <div>
                            <Button
                              onClick={generateConclusionContent}
                              disabled={isGeneratingConclusion}
                              className="bg-[#659AB8] hover:bg-[#5589a7] text-white text-sm"
                              size="sm"
                            >
                              {isGeneratingConclusion ? "Генерирую итоги..." : "Сгенерировать итоги урока"}
                            </Button>
                          </div>

                          <div>
                            <h5 className="text-sm font-medium text-[#111827] mb-3">Содержимое блока:</h5>
                            <div className="space-y-3">
                              {conclusionBlock.elements.map((element) => {
                                const Icon = getElementIcon(element.type, element.educationalType)
                                return (
                                  <div key={element.id} className="border border-[#E5E7EB] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-[#659AB8]" />
                                        <span className="text-sm font-medium text-[#659AB8]">
                                          {getElementLabel(element.type, element.educationalType)}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => removeElement(conclusionBlock.id, element.id)}
                                        className="text-slate-400 hover:text-red-500 h-6 w-6 p-0 flex items-center justify-center"
                                      >
                                        <TrashIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {element.type === "audio" ? (
                                      <AudioUploadV2
                                        courseId={currentCourseId || ""}
                                        lessonId={undefined}
                                        blockId={conclusionBlock.id}
                                        elementId={element.id}
                                        initialAudioUrl={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileUrl || element.content
                                                } catch {
                                                  return element.content
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialFileId={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileId
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        onAudioUpload={(fileId, fileUrl, fileName) => {
                                          const audioData = JSON.stringify({
                                            fileId,
                                            fileUrl,
                                            fileName,
                                            uploadedAt: new Date().toISOString(),
                                          })
                                          updateElementContent(conclusionBlock.id, element.id, audioData)
                                        }}
                                      />
                                    ) : element.type === "video" ? (
                                      <VideoUploadV2
                                        courseId={currentCourseId || ""}
                                        lessonId={undefined}
                                        blockId={conclusionBlock.id}
                                        elementId={element.id}
                                        initialVideoUrl={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileUrl || element.content
                                                } catch {
                                                  return element.content
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialFileId={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileId
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialFileName={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.fileName
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        initialSource={
                                          element.content
                                            ? (() => {
                                                try {
                                                  const parsed = JSON.parse(element.content)
                                                  return parsed.source
                                                } catch {
                                                  return undefined
                                                }
                                              })()
                                            : undefined
                                        }
                                        onVideoUpload={(fileId, fileUrl, fileName, source) => {
                                          const videoData = JSON.stringify({
                                            fileId,
                                            fileUrl,
                                            fileName,
                                            source: source || "file",
                                            uploadedAt: new Date().toISOString(),
                                          })
                                          updateElementContent(conclusionBlock.id, element.id, videoData)
                                        }}
                                      />
                                    ) : (
                                      <Textarea
                                        value={element.content || ""}
                                        onChange={(e) => updateElementContent(conclusionBlock.id, element.id, e.target.value)}
                                        placeholder="Введите текст..."
                                        rows={3}
                                        className="text-sm"
                                      />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[
                              { type: "text" as const, label: "Текст" },
                              { type: "video" as const, label: "Видео" },
                              { type: "audio" as const, label: "Аудио" },
                            ].map(({ type, label }) => (
                              <Button
                                key={type}
                                onClick={() => addElement(conclusionBlock.id, type)}
                                size="sm"
                                variant="secondary"
                                className="text-xs border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/10"
                              >
                                + {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Тарифы и оплата - At Bottom */}
        {currentCourseId && (
          <Card className="mt-8 bg-white border-2 rounded-lg">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="text-center mb-6">
                <h3 className="text-xl lg:text-2xl font-semibold text-[#5589a7] mb-2">Тарифы и оплата</h3>
                <p className="text-lg text-slate-600">
                  Настройте тарифы курса и режим запуска
                </p>
              </div>

              {/* Режим запуска курса */}
              <div className="mb-8 p-6 bg-light-blue/30 border border-[#659AB8]/20 rounded-lg">
                <Label className="text-lg font-semibold text-[#5589a7] mb-4 block">
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
                          ? "bg-[#659AB8] text-white"
                          : "border-[#659AB8] text-[#5589a7] hover:bg-light-blue"
                      }`}
                    >
                      Постоянный (доступ сразу после оплаты)
                    </Button>
                    <Button
                      variant={launchMode === "stream" ? "default" : "secondary"}
                      onClick={() => setLaunchMode("stream")}
                      className={`flex-1 h-12 ${
                        launchMode === "stream"
                          ? "bg-[#659AB8] text-white"
                          : "border-[#659AB8] text-[#5589a7] hover:bg-light-blue"
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
                      <p className="text-xs text-slate-600 mt-1">
                        Ученики смогут оплатить курс заранее, но доступ откроется только в указанную дату
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={saveLaunchMode}
                    disabled={launchMode === "stream" && !streamStartDate}
                    className="w-full bg-[#659AB8] hover:bg-[#5589a7] text-white"
                  >
                    Сохранить режим запуска
                  </Button>
                </div>
              </div>

              {/* Редактирование тарифов */}
              <div>
                <Label className="text-lg font-semibold text-[#5589a7] mb-4 block">
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
                    <p className="text-slate-600 mb-4">Тарифы для курса еще не созданы</p>
                    <Button
                      onClick={createDefaultPricingHandler}
                      disabled={loadingPricing}
                      className="bg-[#659AB8] hover:bg-[#5589a7] text-white"
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
          <Card className="w-full max-w-md mx-4 bg-white border-2 border-[#659AB8]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#5589a7] mb-2">Закрыть доступ</h2>
                  <p className="text-slate-600 text-sm">
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
                  className="text-slate-600"
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
