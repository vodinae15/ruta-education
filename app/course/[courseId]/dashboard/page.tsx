"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { UserIcon, BookOpenIcon, ArrowLeftIcon, CheckCircleIcon, TrendingUpIcon } from "@/components/ui/icons"

export default function StudentDashboard({ params }: { params: { courseId: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [studentSession, setStudentSession] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudentData()
  }, [params.courseId])

  const loadStudentData = async () => {
    try {
      setLoading(true)

      // Check localStorage for session
      const savedSession = localStorage.getItem(`student_session_${params.courseId}`)
      if (!savedSession) {
        router.push(`/course/${params.courseId}`)
        return
      }

      const session = JSON.parse(savedSession)
      if (!session.student_type) {
        router.push(`/course/${params.courseId}/student-test`)
        return
      }

      setStudentSession(session)

      // Load course data
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", params.courseId)
        .eq("status", "published")
        .single()

      if (courseError) throw courseError
      setCourse(courseData)
    } catch (err) {
      console.error("Error loading student data:", err)
      router.push(`/course/${params.courseId}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3FAFE]">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-32 w-full" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!course || !studentSession) {
    return null
  }

  const blocks = course.course_data?.blocks || []
  const completedModules = studentSession.progress?.completed_modules || []
  const currentModule = studentSession.progress?.current_module || 0
  const progress = blocks.length > 0 ? (completedModules.length / blocks.length) * 100 : 0

  return (
    <div className="min-h-screen bg-[#F3FAFE]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/course/${params.courseId}/learn`)}
                className="h-10 px-3"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />К курсу
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[#659AB8]">Личный кабинет</h1>
                <p className="text-sm text-[#6B7280]">{course.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Card */}
          <Card className="border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#659AB8] rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#659AB8]">Профиль ученика</h2>
                  <p className="text-sm text-[#6B7280]">{studentSession.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Тип восприятия</Label>
                  <Badge className="mt-1 bg-[#659AB8]/10 text-[#659AB8] border-[#659AB8]/20">
                    {studentSession.student_type}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Дата начала обучения</Label>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {new Date(studentSession.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    disabled
                    className="w-full h-10 text-sm opacity-50 cursor-not-allowed bg-transparent"
                  >
                    Пройти тест повторно
                  </Button>
                  <p className="text-xs text-slate-500 mt-2 text-center">Функция пока недоступна</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Card */}
          <Card className="border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUpIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#659AB8]">Прогресс обучения</h2>
                  <p className="text-sm text-[#6B7280]">Ваши достижения в курсе</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Общий прогресс</span>
                    <span className="text-sm text-[#6B7280]">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-[#659AB8]">{completedModules.length}</div>
                    <div className="text-xs text-[#6B7280]">Завершено модулей</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-[#659AB8]">{blocks.length}</div>
                    <div className="text-xs text-[#6B7280]">Всего модулей</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button onClick={() => router.push(`/course/${params.courseId}/learn`)} className="w-full h-10">
                    Продолжить обучение
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Courses Card */}
          <Card className="border-0 md:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpenIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#659AB8]">Мои курсы</h2>
                  <p className="text-sm text-[#6B7280]">Курсы, в которых вы участвуете</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Card className="bg-slate-50 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#659AB8] rounded-lg flex items-center justify-center">
                          <BookOpenIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">{course.title}</h3>
                          <p className="text-sm text-[#6B7280]">
                            {completedModules.length} из {blocks.length} модулей завершено
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${
                            progress === 100
                              ? "bg-green-100 text-green-800"
                              : progress > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-[#6B7280]"
                          }`}
                        >
                          {progress === 100 ? "Завершен" : progress > 0 ? "В процессе" : "Не начат"}
                        </Badge>
                        {progress === 100 && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Другие курсы пока недоступны</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
