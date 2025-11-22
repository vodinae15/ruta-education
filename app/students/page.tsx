"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import { CourseSelector } from "@/components/ui/course-selector"
import { StudentStatisticsTable } from "@/components/ui/student-statistics-table"
import { UserIcon, MailIcon } from "@/components/ui/icons"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/components/ui/use-toast"

interface Course {
  id: string
  title: string
}

interface StudentStatistics {
  studentId: string
  email: string
  registrationDate: string
  progress: number
  timeSpent: number
  timeSpentFormatted: string
  lastActivity: string
  completedLessons: number
  totalLessons: number
  studentType: string | null
}

export default function StudentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [email, setEmail] = useState("")
  const [addingStudent, setAddingStudent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка курсов и статистики
  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      router.push("/auth")
      return
    }

    if (user.user_metadata?.user_type !== "teacher") {
      router.push("/student-dashboard")
      return
    }

    loadData()
  }, [user, authLoading, router])

  // Загрузка статистики при изменении выбранного курса
  useEffect(() => {
    if (user && !authLoading && !loading) {
      loadStudents()
    }
  }, [selectedCourseId, user, authLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Загружаем статистику (API вернет и курсы, и учеников)
      const url = selectedCourseId 
        ? `/api/student-statistics?courseId=${selectedCourseId}`
        : `/api/student-statistics`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error("Не удалось загрузить данные")
      }

      const data = await response.json()
      
      // Устанавливаем курсы
      if (data.courses) {
        setCourses(data.courses)
      }
      
      // Устанавливаем учеников
      if (data.students) {
        setStudents(data.students)
      }
    } catch (err) {
      console.error("Error loading data:", err)
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке данных")
    } finally {
      setLoading(false)
      setLoadingStudents(false)
    }
  }

  const loadStudents = async () => {
    try {
      setLoadingStudents(true)
      setError(null)
      
      const url = selectedCourseId 
        ? `/api/student-statistics?courseId=${selectedCourseId}`
        : `/api/student-statistics`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error("Не удалось загрузить статистику")
      }

      const data = await response.json()
      
      if (data.students) {
        setStudents(data.students)
      }
    } catch (err) {
      console.error("Error loading students:", err)
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке статистики")
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleAddStudent = async () => {
    if (!email.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите email ученика",
        variant: "destructive",
      })
      return
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Ошибка",
        description: "Введите корректный email адрес",
        variant: "destructive",
      })
      return
    }

    if (!selectedCourseId) {
      toast({
        title: "Ошибка",
        description: "Выберите курс для добавления ученика",
        variant: "destructive",
      })
      return
    }

    if (!user?.email) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive",
      })
      return
    }

    setAddingStudent(true)
    try {
      const response = await fetch("/api/course-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          email: email.trim(),
          userEmail: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось предоставить доступ")
      }

      toast({
        title: "Доступ предоставлен",
        description: data.message || `Ученик ${email} получил доступ к курсу`,
      })

      setEmail("")
      await loadStudents()
    } catch (err) {
      console.error("Error adding student:", err)
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось предоставить доступ",
        variant: "destructive",
      })
    } finally {
      setAddingStudent(false)
    }
  }

  const handleRevokeAccess = async (studentId: string, studentEmail: string) => {
    if (!selectedCourseId) {
      toast({
        title: "Ошибка",
        description: "Выберите курс для удаления доступа",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Вы уверены, что хотите удалить доступ ученику ${studentEmail}?`)) {
      return
    }

    try {
      const response = await fetch("/api/course-access", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          studentId: studentId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось отозвать доступ")
      }

      toast({
        title: "Доступ отозван",
        description: `Ученик ${studentEmail} больше не имеет доступа к курсу`,
      })

      await loadStudents()
    } catch (err) {
      console.error("Error revoking access:", err)
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось отозвать доступ",
        variant: "destructive",
      })
    }
  }

  const handleCourseChange = (courseId: string | null) => {
    setSelectedCourseId(courseId)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
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
        title="Управление учениками"
        description="Отслеживайте прогресс учеников и управляйте доступом к курсам"
        actions={
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-white text-[#659AB8] px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
          >
            В дашборд
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <Button variant="text" onClick={loadData} className="mt-2 text-red-600">
              Попробовать снова
            </Button>
          </div>
        )}

        <div className="space-y-8">
          {/* Выбор курса и добавление ученика */}
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-xl text-[#5589a7] font-bold">
                Управление доступом
              </CardTitle>
              <CardDescription>
                Выберите курс для управления доступом учеников
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Выбор курса */}
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-4 block">
                  Выберите курс
                </Label>
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#659AB8]"></div>
                    <span>Загрузка курсов...</span>
                  </div>
                ) : (
                  <CourseSelector
                    courses={courses}
                    selectedCourseId={selectedCourseId}
                    onCourseChange={handleCourseChange}
                  />
                )}
              </div>

              {/* Форма добавления ученика */}
              {selectedCourseId && (
                <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="space-y-2">
                    <Label htmlFor="student-email" className="text-sm font-medium text-[#111827]">
                      Добавить ученика к выбранному курсу
                    </Label>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="student-email"
                            type="email"
                            placeholder="student@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            onKeyPress={(e) => e.key === "Enter" && handleAddStudent()}
                            disabled={addingStudent}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddStudent}
                        disabled={addingStudent || !email.trim()}
                        className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingStudent ? "Добавление..." : "Добавить"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!selectedCourseId && (
                <div className="p-4 bg-light-blue rounded-lg">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Выберите курс, чтобы добавить учеников или просмотреть статистику по конкретному курсу.
                    Или оставьте «Все курсы» для просмотра всех ваших учеников.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Таблица статистики */}
          <StudentStatisticsTable
            students={students}
            courseId={selectedCourseId}
            onRevokeAccess={handleRevokeAccess}
            loading={loadingStudents}
          />
        </div>
      </div>
    </div>
  )
}

