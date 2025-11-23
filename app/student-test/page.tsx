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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Профиль настроен</h1>
            <p className="text-lg text-slate-600">Тест завершён</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border border-[#E5E7EB]">
              <CardContent className="p-8 sm:p-10">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-lg text-[#5589a7] font-bold mb-4">
                    Профиль настроен
                  </h2>
                  <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                    {studentTypeResult.generalMessage}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => router.push("/student-dashboard")}
                      className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
                    >
                      В личный кабинет
                    </button>
                    <button
                      onClick={handleRetakeTest}
                      className="bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
                    >
                      Пройти тест повторно
                    </button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Определим ваш стиль обучения</h1>
          <p className="text-lg text-slate-600">Ответьте на 4 вопроса, чтобы мы адаптировали курсы под ваш стиль</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-slate-600">
                Вопрос {currentQuestion + 1} из {studentTestQuestions.length}
              </span>
              <span className="text-sm font-medium text-[#5589a7]">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="mb-8 bg-white border border-[#E5E7EB]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-[#5589a7] font-bold leading-relaxed">
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
                  <div key={option.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-[#E8F4FA] transition-colors duration-200">
                    <RadioGroupItem
                      value={option.value}
                      id={option.id}
                      className="mt-1 border-[#659AB8] text-[#5589a7]"
                    />
                    <Label
                      htmlFor={option.id}
                      className="text-sm text-slate-600 leading-relaxed cursor-pointer flex-1"
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
            <div className="mb-8 p-3 bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg">
              <p className="text-sm text-slate-900">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className={`px-6 py-3 border-2 rounded-lg font-semibold transition-colors duration-200 ${
                currentQuestion === 0
                  ? "bg-[#FDF8F3] text-slate-400 border-[#E5E7EB] cursor-not-allowed"
                  : "bg-white text-[#659AB8] border-[#659AB8] hover:bg-[#659AB8] hover:text-white"
              }`}
            >
              Назад
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                className={`px-6 py-3 border-2 rounded-lg font-semibold transition-colors duration-200 ${
                  !canProceed || isSubmitting
                    ? "bg-[#FDF8F3] text-slate-400 border-[#E5E7EB] cursor-not-allowed"
                    : "bg-[#659AB8] text-white border-[#659AB8] hover:bg-[#5589a7] hover:border-[#5589a7]"
                }`}
              >
                {isSubmitting ? "Сохранение..." : "Завершить тест"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`px-6 py-3 border-2 rounded-lg font-semibold transition-colors duration-200 ${
                  !canProceed
                    ? "bg-[#FDF8F3] text-slate-400 border-[#E5E7EB] cursor-not-allowed"
                    : "bg-[#659AB8] text-white border-[#659AB8] hover:bg-[#5589a7] hover:border-[#5589a7]"
                }`}
              >
                Далее
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              {!canProceed && "Выберите один из вариантов ответа"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
