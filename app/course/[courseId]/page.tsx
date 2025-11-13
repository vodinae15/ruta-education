"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { TestPlayer } from "@/components/test-player"
import {
  PlayIcon,
  FileTextIcon,
  ImageIcon,
  MessageCircleIcon,
  DownloadIcon,
  CheckCircleIcon,
} from "@/components/ui/icons"

interface CourseElement {
  id: string
  type: string
  content: string
  mode: "lesson" | "notes"
  educationalType?: string
}

interface CourseBlock {
  id: string
  title: string
  elements: CourseElement[]
}

interface Course {
  id: string
  title: string
  description: string
  modules: {
    blocks: CourseBlock[]
  }
}

interface TestResult {
  selectedAnswers: string[]
  isCorrect: boolean
  attemptNumber: number
  timestamp: Date
}

export default function StudentCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [course, setCourse] = useState<Course | null>(null)
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completedElements, setCompletedElements] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkAuthAndLoadCourse = async () => {
      console.log("[v0] Loading course with ID:", courseId)

      try {
        const supabase = createClient()
        
        // Получаем текущего пользователя из Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          console.log("[v0] No authenticated user found, redirecting to auth")
          router.push(`/auth?courseId=${courseId}`)
          return
        }

        console.log("[v0] Authenticated user:", user.email)
        console.log("[v0] Loading existing course with ID:", courseId)

        const { data: courseData, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .eq("is_published", true)
          .single()

        if (error) {
          console.error("[v0] Course loading error:", error)
          setError("Курс не найден или не опубликован")
          setLoading(false)
          return
        }

        if (!courseData) {
          console.error("[v0] No course data found")
          setError("Курс не найден")
          setLoading(false)
          return
        }

        console.log("[v0] Loaded course data:", courseData)
        setCourse(courseData)

        const progressKey = `course_progress_${courseId}_${user.email}`
        const savedProgress = localStorage.getItem(progressKey)
        if (savedProgress) {
          const progress = JSON.parse(savedProgress)
          setCompletedElements(new Set(progress.completedElements || []))
          setCurrentBlockIndex(progress.currentBlockIndex || 0)
        }
      } catch (err) {
        console.error("[v0] Error loading course:", err)
        setError("Ошибка загрузки курса")
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      checkAuthAndLoadCourse()
    }
  }, [courseId, router])

  const saveProgress = async () => {
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) return

      const progressKey = `course_progress_${courseId}_${user.email}`
      const progress = {
        currentBlockIndex,
        completedElements: Array.from(completedElements),
        lastAccessed: new Date().toISOString(),
      }
      localStorage.setItem(progressKey, JSON.stringify(progress))
    } catch (err) {
      console.error("Error saving progress:", err)
    }
  }

  useEffect(() => {
    saveProgress()
  }, [currentBlockIndex, completedElements])

  const handleTestComplete = async (elementId: string, result: TestResult) => {
    if (result.isCorrect) {
      setCompletedElements((prev) => new Set([...prev, elementId]))
    }

    // Save test result to database
    try {
      const studentEmail = localStorage.getItem("studentEmail")
      if (!studentEmail) return

      const supabase = createClient()
      await supabase.from("student_test_results").insert({
        student_email: studentEmail,
        course_id: courseId,
        element_id: elementId,
        result: result,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error("Error saving test result:", err)
    }
  }

  const markElementCompleted = (elementId: string) => {
    setCompletedElements((prev) => new Set([...prev, elementId]))
  }

  const getElementIcon = (type: string) => {
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
        return CheckCircleIcon
      case "file":
        return DownloadIcon
      default:
        return FileTextIcon
    }
  }

  const renderElement = (element: CourseElement) => {
    const Icon = getElementIcon(element.type)
    const isCompleted = completedElements.has(element.id)

    if (element.type === "test" && element.content) {
      try {
        const testData = JSON.parse(element.content)
        return (
          <div key={element.id} className="mb-6">
            <TestPlayer
              testData={testData}
              onComplete={(result) => handleTestComplete(element.id, result)}
              studentId={localStorage.getItem("studentEmail") || undefined}
            />
          </div>
        )
      } catch (err) {
        console.error("Error parsing test data:", err)
        return (
          <div key={element.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Ошибка загрузки теста</p>
          </div>
        )
      }
    }

    return (
      <Card key={element.id} className={`mb-4 ${isCompleted ? "border-green-500 bg-green-50" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCompleted ? "bg-green-500" : "bg-[#659AB8]"
              }`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-500 mb-2 capitalize">{element.educationalType || element.type}</div>

              {element.type === "video" && element.content ? (
                <div className="space-y-2">
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">Видео: {element.content}</p>
                  </div>
                  {!isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => markElementCompleted(element.id)}
                      className="bg-[#659AB8] hover:bg-[#659AB8]/90"
                    >
                      Отметить как просмотренное
                    </Button>
                  )}
                </div>
              ) : element.type === "audio" && element.content ? (
                <div className="space-y-2">
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <p className="text-slate-600">Аудио: {element.content}</p>
                  </div>
                  {!isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => markElementCompleted(element.id)}
                      className="bg-[#659AB8] hover:bg-[#659AB8]/90"
                    >
                      Отметить как прослушанное
                    </Button>
                  )}
                </div>
              ) : element.type === "image" && element.content ? (
                <div className="space-y-2">
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">Изображение: {element.content}</p>
                  </div>
                  {!isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => markElementCompleted(element.id)}
                      className="bg-[#659AB8] hover:bg-[#659AB8]/90"
                    >
                      Отметить как изученное
                    </Button>
                  )}
                </div>
              ) : element.type === "task" ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Практическое задание</h4>
                    <p className="text-blue-800">{element.content || "Задание будет добавлено автором"}</p>
                  </div>
                  {!isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => markElementCompleted(element.id)}
                      className="bg-[#659AB8] hover:bg-[#659AB8]/90"
                    >
                      Отметить как выполненное
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-slate-800 leading-relaxed">
                    {element.content || "Содержимое будет добавлено автором"}
                  </div>
                  {element.content && !isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => markElementCompleted(element.id)}
                      className="bg-[#659AB8] hover:bg-[#659AB8]/90"
                    >
                      Отметить как изученное
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isCompleted && (
              <div className="text-green-600">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#CDE6F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-6">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
              </div>
              <div className="space-y-4">
                <Card className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#CDE6F9] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <Button
            onClick={() => router.push("/student-dashboard")}
            className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
          >
            Вернуться к курсам
          </Button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#CDE6F9] flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600 text-xl mb-4">Курс не найден</div>
          <Button
            onClick={() => router.push("/student-dashboard")}
            className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
          >
            Вернуться к курсам
          </Button>
        </div>
      </div>
    )
  }

  if (!course.modules || !course.modules.blocks || course.modules.blocks.length === 0) {
    return (
      <div className="min-h-screen bg-[#CDE6F9] flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600 text-xl mb-4">Курс пока не содержит материалов</div>
          <Button
            onClick={() => router.push("/student-dashboard")}
            className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
          >
            Вернуться к курсам
          </Button>
        </div>
      </div>
    )
  }

  const currentBlock = course.modules.blocks[currentBlockIndex]
  const lessonElements = currentBlock?.elements?.filter((el) => el.mode === "lesson") || []

  return (
    <div className="min-h-screen bg-[#CDE6F9] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#659AB8] mb-2">{course.title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              Блок {currentBlockIndex + 1} из {course.modules.blocks.length}
            </span>
            <div className="flex-1 bg-white rounded-full h-2">
              <div
                className="bg-[#659AB8] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentBlockIndex + 1) / course.modules.blocks.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-[#659AB8]">{currentBlock?.title || "Блок курса"}</CardTitle>
          </CardHeader>
          <CardContent>
            {lessonElements.length > 0 ? (
              <div className="space-y-4">{lessonElements.map(renderElement)}</div>
            ) : (
              <p className="text-slate-500 italic">Содержимое блока пока не добавлено</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentBlockIndex(Math.max(0, currentBlockIndex - 1))}
            disabled={currentBlockIndex === 0}
            className="border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/5"
          >
            Назад
          </Button>

          <Button onClick={() => router.push("/student-dashboard")} variant="ghost">
            К курсам
          </Button>

          <Button
            onClick={() => setCurrentBlockIndex(Math.min(course.modules.blocks.length - 1, currentBlockIndex + 1))}
            disabled={currentBlockIndex === course.modules.blocks.length - 1}
            className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
          >
            Далее
          </Button>
        </div>
      </div>
    </div>
  )
}
