"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { BookOpenIcon, LightbulbIcon, TargetIcon, UsersIcon } from "@/components/ui/icons"
import { StudentTypeResult } from "@/lib/student-test-logic"
import { PageHeader } from "@/components/ui/page-header"

interface StudentTestResultsProps {
  result?: StudentTypeResult
  onRetakeTest?: () => void
}

function StudentTestResultsContent({ result, onRetakeTest }: StudentTestResultsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [studentResult, setStudentResult] = useState<StudentTypeResult | null>(result || null)
  const [loading, setLoading] = useState(!result)
  const [studentEmail, setStudentEmail] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return // Ждем загрузки авторизации

    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    if (!result) {
      loadStudentResult()
    }
  }, [user, authLoading, result, router])

  const loadStudentResult = async () => {
    try {
      setLoading(true)
      const email = user?.email || localStorage.getItem("studentEmail")
      setStudentEmail(email)

      // Сначала проверяем localStorage на наличие результатов теста
      const savedResult = localStorage.getItem("student_test_result")
      if (savedResult) {
        try {
          const result = JSON.parse(savedResult)
          setStudentResult(result)
          return
        } catch (err) {
          console.error("Error parsing saved result:", err)
        }
      }

      if (!email) {
        // Создаем демо-результат для показа интерфейса
        setStudentResult({
          type: "visual-analytical",
          title: "Визуал-Аналитик",
          description: "Вы лучше всего усваиваете информацию через визуальные материалы и предпочитаете структурированный, аналитический подход к обучению.",
          perception: "visual-analytical",
          recommendations: {
            format: [
              "Схемы, диаграммы и инфографика",
              "Структурированные конспекты и mind-карты",
              "Пошаговые инструкции с визуальными примерами",
              "Таблицы сравнения и классификации",
            ],
            communication: [
              "Четкие, конкретные формулировки",
              "Логическая последовательность изложения",
              "Детальная обратная связь с примерами",
              "Возможность задать уточняющие вопросы",
            ],
            adaptation: [
              "Дополнительные визуальные материалы",
              "Возможность делать заметки и выделения",
              "Структурированные домашние задания",
              "Четкие критерии оценки результатов",
            ],
          },
          personalTips: [
            "Создавайте собственные схемы и конспекты во время изучения",
            "Используйте цветовое кодирование для разных типов информации",
            "Просите преподавателя предоставить дополнительные визуальные материалы",
            "Разбивайте сложные темы на логические блоки",
            "Ведите структурированный дневник обучения",
          ],
        })
        return
      }

      const supabase = createClient()
      
      // Загружаем данные студента
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("email", email)
        .single()

      if (studentError) {
        console.warn("Ошибка загрузки данных студента:", studentError)
        return
      }

      if (studentData?.student_type) {
        // Если у студента есть тип, создаем результат на его основе
        const typeMap: Record<string, StudentTypeResult> = {
          "Визуал/Аналитик": {
            type: "visual-analytical",
            title: "Визуал-Аналитик",
            description: "Вы лучше всего усваиваете информацию через визуальные материалы и предпочитаете структурированный, аналитический подход к обучению.",
            perception: "visual-analytical",
            recommendations: {
              format: [
                "Схемы, диаграммы и инфографика",
                "Структурированные конспекты и mind-карты",
                "Пошаговые инструкции с визуальными примерами",
                "Таблицы сравнения и классификации",
              ],
              communication: [
                "Четкие, конкретные формулировки",
                "Логическая последовательность изложения",
                "Детальная обратная связь с примерами",
                "Возможность задать уточняющие вопросы",
              ],
              adaptation: [
                "Дополнительные визуальные материалы",
                "Возможность делать заметки и выделения",
                "Структурированные домашние задания",
                "Четкие критерии оценки результатов",
              ],
            },
            personalTips: [
              "Создавайте собственные схемы и конспекты во время изучения",
              "Используйте цветовое кодирование для разных типов информации",
              "Просите преподавателя предоставить дополнительные визуальные материалы",
              "Разбивайте сложные темы на логические блоки",
              "Ведите структурированный дневник обучения",
            ],
          },
          "Аудиал/Эмпат": {
            type: "auditory-empathetic",
            title: "Аудиал-Эмпат",
            description: "Вы лучше всего воспринимаете информацию на слух и цените эмоциональную поддержку и понимание в процессе обучения.",
            perception: "auditory-empathetic",
            recommendations: {
              format: [
                "Аудиолекции и подкасты",
                "Групповые обсуждения и дискуссии",
                "Интерактивные вебинары",
                "Музыкальное сопровождение при изучении",
              ],
              communication: [
                "Теплый, поддерживающий тон общения",
                "Регулярная обратная связь и поощрение",
                "Возможность обсудить трудности",
                "Эмоциональная вовлеченность преподавателя",
              ],
              adaptation: [
                "Возможность работы в группах",
                "Гибкий график и понимание личных обстоятельств",
                "Мотивирующие сообщения и поддержка",
                "Акцент на прогрессе, а не на ошибках",
              ],
            },
            personalTips: [
              "Слушайте материалы курса во время прогулок или поездок",
              "Обсуждайте изученное с друзьями или коллегами",
              "Записывайте голосовые заметки с размышлениями",
              "Не стесняйтесь просить поддержку при затруднениях",
              "Создавайте эмоциональные связи с изучаемым материалом",
            ],
          },
          "Кинестетик/Практик": {
            type: "kinesthetic-practical",
            title: "Кинестетик-Практик",
            description: "Вы лучше всего учитесь через практическое применение и цените конкретные, применимые знания и навыки.",
            perception: "kinesthetic-practical",
            recommendations: {
              format: [
                "Практические задания и проекты",
                "Симуляции и интерактивные упражнения",
                "Реальные кейсы и примеры",
                "Пошаговые практические руководства",
              ],
              communication: [
                "Краткие, конкретные инструкции",
                "Фокус на практическом применении",
                "Быстрая обратная связь по результатам",
                "Примеры из реальной практики",
              ],
              adaptation: [
                "Больше практических заданий",
                "Возможность экспериментировать",
                "Связь теории с практическими задачами",
                "Измеримые результаты обучения",
              ],
            },
            personalTips: [
              "Сразу применяйте полученные знания на практике",
              "Создавайте собственные проекты на основе изученного",
              "Экспериментируйте с разными подходами",
              "Ведите дневник практических результатов",
              "Не бойтесь делать ошибки - учитесь на них",
            ],
          },
        }

        const mappedResult = typeMap[studentData.student_type] || typeMap["Визуал/Аналитик"]
        setStudentResult(mappedResult)
      }
    } catch (err) {
      console.error("Ошибка загрузки результатов теста:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleRetakeTest = () => {
    if (onRetakeTest) {
      onRetakeTest()
    } else {
      // Перенаправляем на страницу теста
      router.push("/student-test")
    }
  }

  const handleGoToCourses = () => {
    const courseId = searchParams.get("courseId")
    if (courseId) {
      router.push(`/course/${courseId}/learn`)
    } else {
      router.push("/student-dashboard")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3FAFE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!studentResult) {
    return (
      <div className="min-h-screen bg-[#F3FAFE] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-[#6B7280] mb-4">Результаты теста не найдены</p>
            <Button onClick={() => router.push("/student-dashboard")}>
              Вернуться к дашборду
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <PageHeader
        title="Результаты теста"
        description="Ваш тип восприятия информации определен"
      />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Main Result Card */}
        <Card className="border-0 bg-gradient-to-br from-[#659AB8]/5 to-[#CDE6F9]/20">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <Badge className="bg-[#659AB8] text-white px-6 py-3 text-xl font-semibold mb-4">
                  {studentResult.title}
                </Badge>
                <p className="text-lg text-[#111827] leading-relaxed">{studentResult.description}</p>
              </div>

              {/* Strength highlight as a prominent side element */}
              <div className="lg:w-80">
                <div className="bg-gradient-to-br from-[#FEFDF2] to-[#FEFDF2]/80 border-2 border-[#FEFDF2] p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#659AB8] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">★</span>
                    </div>
                    <h3 className="font-bold text-[#659AB8] text-lg">Ваша суперсила</h3>
                  </div>
                  <p className="text-[#111827] font-semibold text-lg leading-tight">
                    {studentResult.type === "visual-analytical" 
                      ? "Умение структурировать информацию"
                      : studentResult.type === "auditory-empathetic"
                      ? "Умение воспринимать на слух"
                      : "Умение применять на практике"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Section */}
        <div className="space-y-6">

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Format Recommendations */}
            <Card className="border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#659AB8] font-bold">По форматам обучения</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentResult.recommendations.format.map((tip, index) => (
                  <div key={index} className="flex items-start bg-[#CDE6F9]/30 p-4 rounded-lg">
                    <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-sm text-[#111827] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Communication Recommendations */}
            <Card className="border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#659AB8] font-bold">По стилю коммуникации</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentResult.recommendations.communication.map((tip, index) => (
                  <div key={index} className="flex items-start bg-[#CDE6F9]/30 p-4 rounded-lg">
                    <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-sm text-[#111827] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Adaptation Recommendations */}
            <Card className="border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#659AB8] font-bold">По адаптации курса</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentResult.recommendations.adaptation.map((tip, index) => (
                  <div key={index} className="flex items-start bg-[#CDE6F9]/30 p-4 rounded-lg">
                    <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-sm text-[#111827] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Personal Tips */}
          <Card className="border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-[#659AB8] font-bold">Ваши персональные подсказки</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {studentResult.personalTips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start p-4 bg-gradient-to-r from-[#659AB8]/5 to-[#CDE6F9]/20 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-sm text-[#111827] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-[#659AB8] font-bold">Что делать дальше</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleGoToCourses}
                className="flex items-center gap-2 h-12 px-6 flex-1"
              >
                Перейти к курсам
              </Button>
              <Button
                variant="secondary"
                onClick={handleRetakeTest}
                className="flex items-center gap-2 h-12 px-6"
              >
                Пройти тест заново
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="border-0">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-[#659AB8] mb-3">
                Курс будет адаптирован под ваш стиль обучения
              </h3>
              <p className="text-[#6B7280] leading-relaxed">
                На основе вашего типа восприятия мы подберем оптимальные форматы подачи материала, 
                стиль коммуникации и методы обратной связи для максимально эффективного обучения.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function StudentTestResults({ result, onRetakeTest }: StudentTestResultsProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F3FAFE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <StudentTestResultsContent result={result} onRetakeTest={onRetakeTest} />
    </Suspense>
  )
}
