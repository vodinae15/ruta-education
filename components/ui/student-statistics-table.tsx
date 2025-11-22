"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserIcon, MessageCircleIcon, TrashIcon, ClockIcon, CalendarIcon, TrendingUpIcon } from "@/components/ui/icons"
import { StudentNotesManager } from "./student-notes-manager"
import { cn } from "@/lib/utils"

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

interface StudentStatisticsTableProps {
  students: StudentStatistics[]
  courseId: string | null
  onRevokeAccess: (studentId: string, email: string) => void
  loading?: boolean
}

export function StudentStatisticsTable({ 
  students, 
  courseId, 
  onRevokeAccess,
  loading = false 
}: StudentStatisticsTableProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500"
    if (progress >= 50) return "bg-yellow-500"
    if (progress > 0) return "bg-blue-500"
    return "bg-slate-300"
  }

  // Функция для получения отображаемого режима представления материала из test_results
  const getStudentTypeDisplay = (studentType: string | null): string | null => {
    if (!studentType) return null
    
    // Если это новый формат (уже приходит в формате "Рефлексивный / Развёрнутая ОС")
    if (studentType.includes(" / ")) {
      return studentType
    }
    
    // Если это старый формат VAK, возвращаем как есть (для обратной совместимости)
    return studentType
  }

  const handleOpenNotes = (studentId: string) => {
    console.log("📝 [Notes] Открытие заметок:", { studentId, courseId })
    if (!courseId) {
      console.warn("⚠️ [Notes] Курс не выбран, заметки не открыты")
      // Не открываем заметки, если курс не выбран
      return
    }
    setSelectedStudentId(studentId)
    setNotesOpen(true)
    console.log("✅ [Notes] Окно заметок открыто")
  }

  const handleCloseNotes = () => {
    setNotesOpen(false)
    setSelectedStudentId(null)
  }

  if (loading) {
    return (
      <Card className="border">
        <CardContent className="p-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 mx-auto" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) {
    return (
      <Card className="border">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {courseId ? "Нет учеников в этом курсе" : "У вас пока нет учеников"}
          </h3>
          <p className="text-sm text-slate-600">
            {courseId
              ? "Добавьте учеников к этому курсу, чтобы увидеть их статистику"
              : "Добавьте учеников к своим курсам, чтобы отслеживать их прогресс"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-xl text-[#5589a7] font-bold">
            {courseId ? `Ученики курса (${students.length})` : `Все ученики (${students.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-light-gray border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Ученик</th>
                  {courseId && (
                    <>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Дата регистрации</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Прогресс</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Время изучения</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Последняя активность</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Действия</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-light-blue/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{student.email}</p>
                          {getStudentTypeDisplay(student.studentType) && (
                            <Badge variant="info" className="mt-1 text-xs">
                              {getStudentTypeDisplay(student.studentType)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    {courseId && (
                      <>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(student.registrationDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 min-w-[200px]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Прогресс</span>
                          <span className="font-semibold text-slate-900">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} className="h-2" />
                        <div className="text-xs text-slate-500">
                          {student.completedLessons} из {student.totalLessons} уроков
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-medium">{student.timeSpentFormatted}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        <span>{formatDateTime(student.lastActivity)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => handleOpenNotes(student.studentId)}
                          className="text-[#5589a7] hover:bg-[#659AB8]/10 hover:text-[#5589a7] transition-colors"
                          title="Заметки"
                        >
                          <MessageCircleIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => onRevokeAccess(student.studentId, student.email)}
                          className="text-slate-600 hover:bg-[#659AB8]/10 hover:text-[#5589a7] transition-colors"
                          title="Удалить доступ"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно заметок */}
      {notesOpen && selectedStudentId && courseId && (
        <StudentNotesManager
          studentId={selectedStudentId}
          courseId={courseId}
          isOpen={notesOpen}
          onClose={handleCloseNotes}
        />
      )}
    </>
  )
}

