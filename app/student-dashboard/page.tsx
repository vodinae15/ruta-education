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
import { PageHeader } from "@/components/ui/page-header"

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
  const [isClient, setIsClient] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [selectedCourseForNotes, setSelectedCourseForNotes] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [courseAccessInfo, setCourseAccessInfo] = useState<Record<string, CourseAccessInfo>>({})
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const loadStudentData = async () => {
      try {
        const supabase = createClient()

        // Получаем текущего пользователя из Supabase Auth
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
          router.push("/auth")
          return
        }

        setUser(currentUser)

        // Проверяем, что это студент (не преподаватель)
        // Если user_type не установлен, считаем студентом по умолчанию
        if (currentUser.user_metadata?.user_type === "teacher") {
          // Если это преподаватель, перенаправляем на его дашборд
          router.push("/dashboard")
          return
        }

        // Ищем или создаем запись студента
        let { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("email", currentUser.email)
          .maybeSingle()

        if (studentError) {
          console.error("Error loading student:", studentError)
          // Если не можем загрузить, создаем временную структуру
          studentData = {
            id: currentUser.id,
            email: currentUser.email!,
            user_id: currentUser.id,
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
              email: currentUser.email!,
              user_id: currentUser.id 
            })
            .select()
            .single()

          if (createError) {
            console.error("Error creating student:", createError)
            // Если не можем создать запись, создаем временную структуру
            studentData = {
              id: currentUser.id,
              email: currentUser.email!,
              user_id: currentUser.id,
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
          const studentEmail = (studentData.email || currentUser.email || '').trim().toLowerCase()
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
  }, [router, isClient])

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


  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
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
        <Card className="w-full max-w-md bg-white border-2 rounded-lg ">
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/auth")} className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white">
              Вернуться к входу
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
        title="Личный кабинет ученика"
        description="Добро пожаловать в Ruta.Education! Здесь вы можете проходить обучение по доступным курсам"
        breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Личный кабинет" }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Student Profile Section */}
        <div className="mb-8 sm:mb-10 lg:mb-12">
          <Card className="bg-white border-2 rounded-lg ">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-16 h-16 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold text-[#5589a7] mb-2">
                    {student?.email}
                  </h2>
                  <p className="text-slate-600 mb-4">Ученик Ruta.Education</p>
                  
                  {student?.test_results && student.test_results.test_version === "3.0" ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <Button 
                        onClick={() => router.push("/student-test")}
                        variant="secondary"
                        className="border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/5 w-fit"
                      >
                        Пройти тест повторно
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-light-blue/30 border border-[#659AB8]/20 rounded-lg">
                      <p className="text-[#111827] mb-3">
                        <span className="font-semibold">Пройдите тест, чтобы настроить профиль</span>
                      </p>
                      <Button 
                        className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
                        onClick={() => router.push("/student-test")}
                      >
                        Пройти тест
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Section */}
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-[#5589a7] mb-6 sm:mb-8">Ваши курсы</h2>

          {courses.length === 0 ? (
            <Card className="bg-white border-2 rounded-lg ">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-light-blue rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpenIcon className="w-10 h-10 text-[#5589a7]" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-[#5589a7] mb-3">
                  У вас пока нет доступных курсов
                </h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Получите ссылку на курс от автора, чтобы начать обучение
                </p>
                <Button 
                  variant="secondary" 
                  className="border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/5"
                  onClick={() => router.push("/")}
                >
                  Вернуться на главную
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {courses.map((courseAccess) => (
                <Card 
                  key={courseAccess.course_id} 
                  className="bg-white border-2 hover:border-[#659AB8]/20 transition-colors rounded-lg "
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-[#5589a7] mb-2 leading-tight">
                          {courseAccess.courses.title || "Без названия"}
                        </CardTitle>
                        <CardDescription className="text-slate-600 leading-relaxed">
                          {courseAccess.courses.description || "Описание курса не добавлено"}
                        </CardDescription>
                      </div>
                      <Badge
                        className={
                          courseAccess.courses.is_published
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
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

                    {/* Статус доступа */}
                    {courseAccessInfo[courseAccess.course_id] && (
                      <div className="mb-4 p-3 rounded-lg border-2">
                        {courseAccessInfo[courseAccess.course_id].accessStatus === "granted" ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <PlayIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Доступ открыт</span>
                          </div>
                        ) : courseAccessInfo[courseAccess.course_id].accessStatus === "pending" ? (
                          <div className="flex items-center gap-2 text-blue-700">
                            <ClockIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {courseAccessInfo[courseAccess.course_id].accessMessage}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-700">
                            <LockIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Нет доступа</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {courseAccess.courses.is_published ? (
                        <>
                          {courseAccessInfo[courseAccess.course_id]?.hasAccess ? (
                            <>
                              <Button
                                className="w-full bg-[#659AB8] hover:bg-[#659AB8]/90 text-white flex items-center gap-2 h-12"
                                onClick={() => handleStartLearning(courseAccess.course_id)}
                              >
                                <PlayIcon className="w-4 h-4" />
                                Начать обучение
                              </Button>
                              <Button
                                variant="secondary"
                                className="w-full border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/5 flex items-center gap-2 h-10"
                                onClick={() => router.push(`/course/${courseAccess.course_id}/pricing`)}
                              >
                                <ArrowRightIcon className="w-4 h-4" />
                                Выбрать тариф
                              </Button>
                              <Button
                                variant="secondary"
                                className="w-full border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/5 flex items-center gap-2 h-10"
                                onClick={() => handleOpenNotes(courseAccess.course_id)}
                              >
                                <MessageCircleIcon className="w-4 h-4" />
                                Заметки
                              </Button>
                            </>
                          ) : (
                            <Button
                              className="w-full bg-[#659AB8] hover:bg-[#659AB8]/90 text-white flex items-center gap-2 h-12"
                              onClick={() => router.push(`/course/${courseAccess.course_id}/pricing`)}
                            >
                              <ArrowRightIcon className="w-4 h-4" />
                              Выбрать тариф
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button 
                          variant="secondary" 
                          disabled 
                          className="w-full h-12 border-slate-200 text-slate-400"
                        >
                          Курс в разработке
                        </Button>
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
