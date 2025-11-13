"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon } from "@/components/ui/icons"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import {
  studentTestQuestions,
  determineStudentType,
  type StudentTestAnswers,
  type StudentTypeResult,
} from "@/lib/student-test-logic"

export default function StudentTestPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<StudentTestAnswers>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [studentTypeResult, setStudentTypeResult] = useState<StudentTypeResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return // Ждем загрузки авторизации

    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    const checkStudentData = async () => {
      try {

        // Проверяем, есть ли уже результаты теста у студента
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("email", user.email)
          .maybeSingle()

        if (studentError) {
          console.error("Error loading student data:", studentError)
          // Продолжаем без предварительных данных
        } else if (studentData?.test_results && studentData.test_results.test_version === "3.0") {
          // Если тест уже пройден (новая версия), показываем обобщённое сообщение
          try {
            const result = determineStudentType(studentData.test_results.answers as StudentTestAnswers)
            setStudentTypeResult(result)
            setShowResults(true)
          } catch (error) {
            console.error("Error determining student type:", error)
            // Продолжаем без предварительных данных
          }
        }
      } catch (err) {
        console.error("Error checking student data:", err)
        // Не перенаправляем на auth, так как пользователь уже авторизован
      } finally {
        setLoading(false)
      }
    }

    checkStudentData()
  }, [user, authLoading, router, supabase])

  const handleAnswerChange = (value: string) => {
    const currentQuestionId = studentTestQuestions[currentQuestion].id as keyof StudentTestAnswers
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionId]: value,
    }))
    setError(null)
  }

  const handleNext = () => {
    if (currentQuestion < studentTestQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    // Проверяем, что все 4 вопроса отвечены
    const allAnswersFilled = studentTestQuestions.every(
      (question) => answers[question.id as keyof StudentTestAnswers]
    )

    if (!allAnswersFilled) {
      setError("Пожалуйста, ответьте на все вопросы перед завершением теста")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const completeAnswers = answers as StudentTestAnswers
      
      // Дополнительная проверка типов
      if (!completeAnswers.q1 || !completeAnswers.q2 || !completeAnswers.q3 || !completeAnswers.q4) {
        throw new Error("Не все вопросы отвечены")
      }
      
      const result = determineStudentType(completeAnswers)

      console.log("[Student Test] Complete answers:", completeAnswers)
      console.log("[Student Test] Student type result:", result)

      const testResults = {
        answers: completeAnswers,
        cognitiveStyle: result.cognitiveStyle,
        feedbackPreference: result.feedbackPreference,
        authorHints: result.authorHints,
        completed_at: new Date().toISOString(),
        test_version: "3.0",
      }

      // Используем upsert для создания или обновления записи
      const { error: upsertError } = await supabase
        .from("students")
        .upsert({
          email: user.email,
          user_id: user.id,
          test_results: testResults,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'email'
        })

      if (upsertError) {
        console.error("Upsert error:", upsertError)
        throw upsertError
      }

      setStudentTypeResult(result)
      setShowResults(true)
      setAnswers({})
      setCurrentQuestion(0)

      console.log("[Student Test] Test completed successfully, showing results...")
    } catch (err) {
      console.error("[Student Test] Error saving test results:", err)
      setError(err instanceof Error ? err.message : "Произошла ошибка при сохранении результатов")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetakeTest = () => {
    console.log("[Student Test] Retaking test, clearing state...")
    setShowResults(false)
    setStudentTypeResult(null)
    setAnswers({})
    setCurrentQuestion(0)
    setError(null)
  }

  const progress = ((currentQuestion + 1) / studentTestQuestions.length) * 100
  const isLastQuestion = currentQuestion === studentTestQuestions.length - 1
  const currentQuestionId = studentTestQuestions[currentQuestion].id as keyof StudentTestAnswers
  const canProceed = answers[currentQuestionId]

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Необходима авторизация</p>
          <Button onClick={() => router.push("/auth")} className="mt-4">
            Войти
          </Button>
        </div>
      </div>
    )
  }

  if (showResults && studentTypeResult) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <PageHeader
          title="Профиль настроен"
          description="Тест завершён"
          breadcrumbs={[
            { label: "Главная", href: "/" }, 
            { label: "Личный кабинет", href: "/student-dashboard" }, 
            { label: "Тест ученика" }
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
              <CardContent className="p-8 sm:p-10">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-primary mb-6">
                    Профиль настроен
                  </h2>
                  <p className="text-lg text-slate-700 mb-8 leading-relaxed">
                    {studentTypeResult.generalMessage}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={() => router.push("/student-dashboard")} 
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white h-12 px-8"
                    >
                      В личный кабинет
                    </Button>
                    <Button 
                      onClick={handleRetakeTest} 
                      variant="secondary" 
                      className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5 h-12 px-8"
                    >
                      Пройти тест повторно
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      <PageHeader
        title="Определим ваш стиль обучения"
        description="Ответьте на 4 вопроса, чтобы мы адаптировали курсы под ваш стиль обучения"
        breadcrumbs={[
          { label: "Главная", href: "/" }, 
          { label: "Личный кабинет", href: "/student-dashboard" }, 
          { label: "Тест ученика" }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-primary">
                Вопрос {currentQuestion + 1} из {studentTestQuestions.length}
              </span>
              <span className="text-lg font-semibold text-primary">{Math.round(progress)}% завершено</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Question Card */}
          <Card className="mb-8 bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl lg:text-2xl text-primary font-bold leading-relaxed">
                {studentTestQuestions[currentQuestion].question}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RadioGroup
                value={answers[currentQuestionId] || ""}
                onValueChange={handleAnswerChange}
                className="space-y-2"
              >
                {studentTestQuestions[currentQuestion].options.map((option) => (
                  <div key={option.id} className="flex items-start space-x-4 p-2 rounded-lg hover:bg-light-blue/20 transition-colors">
                    <RadioGroupItem
                      value={option.value}
                      id={option.id}
                      className="mt-1 border-primary text-primary"
                    />
                    <Label
                      htmlFor={option.id}
                      className="text-lg leading-relaxed cursor-pointer flex-1 text-slate-700"
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 h-12 px-6 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Назад
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                className="flex items-center gap-2 h-12 px-6 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Завершить тест
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed} className="flex items-center gap-2 h-12 px-6 transition-colors">
                Далее
                <ArrowRightIcon className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              {!canProceed && "Выберите один из вариантов ответа для продолжения"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
