"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { BookOpenIcon, PlayIcon, UserIcon, GraduationCapIcon, MessageCircleIcon, ClockIcon, LockIcon, ArrowRightIcon } from "@/components/ui/icons"
import { StudentNotesManager } from "@/components/ui/student-notes-manager"
import { createClient } from "@/lib/supabase/client"
import { MainNavigation } from "@/components/ui/main-navigation"
import { CheckCircleIcon } from "@/components/ui/icons"
import { useAuth } from "@/lib/auth"
import {
  determineStudentType,
  type StudentTestAnswers,
} from "@/lib/student-test-logic"

interface Student {
  id: string
  email: string
  student_type: string | null
  test_results: any
  created_at: string
  user_id?: string
}


interface Course {
  id: string
  title: string
  description: string | null
  is_published: boolean
  created_at: string
  launch_mode?: "stream" | "permanent" | null
  stream_start_date?: string | null
  status?: string
}

interface CourseAccess {
  course_id: string
  first_accessed_at: string
  last_accessed_at: string
  progress: any
  courses: Course
}

interface CourseAccessInfo {
  hasAccess: boolean
  accessType: "free" | "paid" | null
  accessStatus: "granted" | "pending" | "denied"
  accessMessage: string
}

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [courses, setCourses] = useState<CourseAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourseForNotes, setSelectedCourseForNotes] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [courseAccessInfo, setCourseAccessInfo] = useState<Record<string, CourseAccessInfo>>({})
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // Ждем пока useAuth загрузит пользователя
    if (authLoading) return

    // Если нет пользователя, перенаправляем на авторизацию
    if (!user) {
      router.push("/auth")
      return
    }

    // Проверяем, что это студент (не преподаватель)
    if (user.user_metadata?.user_type === "teacher") {
      router.push("/dashboard")
      return
    }

    const loadStudentData = async () => {
      try {
        const supabase = createClient()

        // Ищем или создаем запись студента
        let { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("email", user.email)
          .maybeSingle()

        if (studentError) {
          console.error("Error loading student:", studentError)
          // Если не можем загрузить, создаем временную структуру
          studentData = {
            id: user.id,
            email: user.email!,
            user_id: user.id,
            student_type: null,
            test_results: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        } else if (!studentData) {
          // Если студент не найден, создаем запись
          const { data: newStudent, error: createError } = await supabase
            .from("students")
            .insert({
              email: user.email!,
              user_id: user.id
            })
            .select()
            .single()

          if (createError) {
            console.error("Error creating student:", createError)
            // Если не можем создать запись, создаем временную структуру
            studentData = {
              id: user.id,
              email: user.email!,
              user_id: user.id,
              student_type: null,
              test_results: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          } else {
            studentData = newStudent
          }
        }

        setStudent(studentData)

        // Загружаем курсы студента через API, используя email из базы данных
        try {
          // Нормализуем email: trim и lowercase для консистентности
          const studentEmail = (studentData.email || user.email || '').trim().toLowerCase()
          console.log("📚 [Dashboard] Загружаем курсы для студента с email:", studentEmail)
          const response = await fetch(`/api/student-courses?email=${encodeURIComponent(studentEmail)}`)
          if (response.ok) {
            const data = await response.json()
            console.log("📚 [Dashboard] Загружены курсы студента:", {
              studentId: data.student?.id,
              studentEmail: data.student?.email,
              coursesCount: data.courses?.length || 0,
              courses: data.courses
            })
            setCourses(data.courses || [])
            
            // Загружаем информацию о доступе для каждого курса
            const accessInfoMap: Record<string, CourseAccessInfo> = {}
            for (const courseAccess of data.courses || []) {
              try {
                const accessResponse = await fetch(`/api/course-access-check?courseId=${courseAccess.course_id}`)
                if (accessResponse.ok) {
                  const accessData = await accessResponse.json()
                  accessInfoMap[courseAccess.course_id] = {
                    hasAccess: accessData.access || false,
                    accessType: accessData.type || null,
                    accessStatus: accessData.status || (accessData.access ? "granted" : "denied"),
                    accessMessage: accessData.message || "",
                  }
                  console.log(`✅ [Dashboard] Доступ для курса ${courseAccess.course_id}:`, accessInfoMap[courseAccess.course_id])
                } else {
                  console.error(`❌ [Dashboard] Ошибка проверки доступа для курса ${courseAccess.course_id}:`, accessResponse.status)
                }
              } catch (err) {
                console.error(`❌ [Dashboard] Ошибка проверки доступа для курса ${courseAccess.course_id}:`, err)
              }
            }
            setCourseAccessInfo(accessInfoMap)
          } else {
            const errorText = await response.text().catch(() => '')
            console.error("❌ [Dashboard] Ошибка загрузки курсов:", {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            })
            setCourses([])
          }
        } catch (error) {
          console.error("Error loading courses:", error)
          setCourses([])
        }
      } catch (err) {
        console.error("Error loading student data:", err)
        
        // Более детальная обработка ошибок
        let errorMessage = "Произошла ошибка при загрузке данных"
        
        if (err instanceof Error) {
          if (err.message.includes("Invalid login credentials")) {
            errorMessage = "Неверные данные для входа. Попробуйте войти заново."
          } else if (err.message.includes("JWT")) {
            errorMessage = "Сессия истекла. Пожалуйста, войдите заново."
          } else if (err.message.includes("permission denied")) {
            errorMessage = "Недостаточно прав доступа. Обратитесь к администратору."
          } else {
            errorMessage = err.message
          }
        }
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [router, user, authLoading])

  const handleStartLearning = (courseId: string) => {
    router.push(`/course/${courseId}/learn`)
  }

  const handleOpenNotes = (courseId: string) => {
    if (!student?.id) return
    setSelectedCourseForNotes(courseId)
    setNotesOpen(true)
  }

  const handleCloseNotes = () => {
    setNotesOpen(false)
    setSelectedCourseForNotes(null)
  }


  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-white border border-[#E5E7EB]">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border border-[#E5E7EB]">
          <CardContent className="text-center py-8">
            <p className="text-slate-900 mb-4">{error}</p>
            <button
              onClick={() => router.push("/auth")}
              className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
            >
              Вернуться к входу
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Личный кабинет</h1>
          <p className="text-lg text-slate-600">Добро пожаловать в Ruta.Education</p>
        </div>
        {/* Student Profile Section */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Profile info */}
          <Card className="bg-white border border-[#E5E7EB]">
            <CardContent className="p-6 h-full flex flex-col justify-center">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg text-[#5589a7] font-bold mb-1">
                  {student?.email || user?.email}
                </h2>
                <p className="text-sm text-slate-600 mb-4">Ученик Ruta.Education</p>

                {student?.test_results && student.test_results.test_version === "3.0" && (
                  <button
                    onClick={() => router.push("/student-test?retake=true")}
                    className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                  >
                    Пройти тест повторно
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right column - Test results */}
          <Card className="bg-white border border-[#E5E7EB]">
            <CardContent className="p-6 h-full flex flex-col justify-center">
              {student?.test_results && student.test_results.test_version === "3.0" ? (
                <div className="text-center">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg text-[#5589a7] font-bold mb-4">
                    Профиль настроен
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {(() => {
                      try {
                        const result = determineStudentType(student.test_results.answers as StudentTestAnswers)
                        return result.generalMessage
                      } catch {
                        return "Ваш профиль обучения настроен на основе результатов теста."
                      }
                    })()}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-lg text-slate-600 font-bold mb-2">
                    Профиль не настроен
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Пройдите тест для персонализации обучения
                  </p>
                  <button
                    className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                    onClick={() => router.push("/student-test")}
                  >
                    Пройти тест
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Courses Section */}
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-8">Ваши курсы</h2>

          {courses.length === 0 ? (
            <Card className="bg-white border border-[#E5E7EB]">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg text-[#5589a7] font-bold mb-2">
                  У вас пока нет доступных курсов
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                  Получите ссылку на курс от автора, чтобы начать обучение
                </p>
                <Button
                  className="bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                  onClick={() => router.push("/")}
                >
                  Вернуться на главную
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((courseAccess) => (
                <Card
                  key={courseAccess.course_id}
                  className="bg-white border border-[#E5E7EB] h-full"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-[#5589a7] font-bold mb-2 leading-tight">
                          {courseAccess.courses.title || "Без названия"}
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-600 leading-relaxed">
                          {courseAccess.courses.description || "Описание курса не добавлено"}
                        </CardDescription>
                      </div>
                      <Badge
                        className={
                          courseAccess.courses.is_published
                            ? "bg-[#FDF8F3] text-slate-900 border border-[#E5E7EB]"
                            : "bg-[#FDF8F3] text-slate-900 border border-[#E5E7EB]"
                        }
                      >
                        {courseAccess.courses.is_published ? "Доступен" : "В разработке"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 mb-6">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Добавлен:</span>{" "}
                        {new Date(courseAccess.first_accessed_at).toLocaleDateString("ru-RU")}
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Последний доступ:</span>{" "}
                        {new Date(courseAccess.last_accessed_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {courseAccess.courses.is_published ? (
                        <>
                          {courseAccessInfo[courseAccess.course_id]?.hasAccess ? (
                            <>
                              <button
                                className="w-full bg-[#659AB8] text-white px-6 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                                onClick={() => handleStartLearning(courseAccess.course_id)}
                              >
                                Начать обучение
                              </button>
                              <button
                                className="w-full bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                                onClick={() => router.push(`/course/${courseAccess.course_id}/pricing`)}
                              >
                                Выбрать тариф
                              </button>
                              <button
                                className="w-full bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                                onClick={() => handleOpenNotes(courseAccess.course_id)}
                              >
                                Заметки
                              </button>
                            </>
                          ) : (
                            <button
                              className="w-full bg-[#659AB8] text-white px-6 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                              onClick={() => router.push(`/course/${courseAccess.course_id}/pricing`)}
                            >
                              Выбрать тариф
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          disabled
                          className="w-full bg-[#FDF8F3] text-slate-600 px-6 py-3 border border-[#E5E7EB] rounded-lg font-semibold cursor-not-allowed"
                        >
                          Курс в разработке
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        {student && selectedCourseForNotes && (
          <StudentNotesManager
            studentId={student.id}
            courseId={selectedCourseForNotes}
            isOpen={notesOpen}
            onClose={handleCloseNotes}
          />
        )}
      </div>
    </div>
  )
}
