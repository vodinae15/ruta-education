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
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon } from "@/components/ui/icons"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import { StudentTestResults } from "@/components/student-test-results"
import {
  studentTestQuestions,
  determineStudentType,
  type StudentTestAnswers,
  type StudentTypeResult,
} from "@/lib/student-test-logic"


export default function StudentTestPage({ params }: { params: { courseId: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<StudentTestAnswers>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentSession, setStudentSession] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [studentTypeResult, setStudentTypeResult] = useState<StudentTypeResult | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Получаем текущего пользователя из Supabase Auth
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
          router.push("/auth")
          return
        }

        setUser(currentUser)

        // Check if student is authenticated
        const savedSession = localStorage.getItem(`student_session_${params.courseId}`)
        if (!savedSession) {
          router.push(`/course/${params.courseId}`)
          return
        }

        try {
          const session = JSON.parse(savedSession)
          setStudentSession(session)

          // If already has student type, show results
          if (session.student_type) {
            // Try to determine student type from saved results
            if (session.test_results) {
              const result = determineStudentType(session.test_results as StudentTestAnswers)
              setStudentTypeResult(result)
              setShowResults(true)
            } else {
              router.push(`/course/${params.courseId}/learn`)
            }
          }
        } catch (err) {
          router.push(`/course/${params.courseId}`)
        }
      } catch (err) {
        console.error("Error checking auth:", err)
        router.push("/auth")
      }
    }

    checkAuth()
  }, [params.courseId, router, supabase])

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
    if (!canProceed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const completeAnswers = answers as StudentTestAnswers
      const result = determineStudentType(completeAnswers)

      console.log("[Student Test] Complete answers:", completeAnswers)
      console.log("[Student Test] Student type result:", result)

      // Update student session with type and test results
      const { error: updateError } = await supabase
        .from("student_sessions")
        .update({
          student_type: result.type, // Используем result.type вместо result.title
          test_results: {
            answers: completeAnswers,
            result: result,
            completed_at: new Date().toISOString(),
            test_version: "2.0",
          },
        })
        .eq("id", studentSession.id)

      if (updateError) throw updateError

      // Update localStorage
      const updatedSession = {
        ...studentSession,
        student_type: result.type, // Используем result.type вместо result.title
        test_results: {
          answers: completeAnswers,
          result: result,
          completed_at: new Date().toISOString(),
          test_version: "2.0",
        },
      }
      localStorage.setItem(`student_session_${params.courseId}`, JSON.stringify(updatedSession))

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

  if (!studentSession || !user) {
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

  if (showResults && studentTypeResult) {
    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <PageHeader
          title={`Ваш режим представления материала: ${studentTypeResult.title}`}
          description="Результаты теста определения стиля обучения"
          breadcrumbs={[
            { label: "Главная", href: "/" }, 
            { label: "Курс", href: `/course/${params.courseId}` }, 
            { label: "Тест ученика" }
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <StudentTestResults studentTypeResult={studentTypeResult} />
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="bg-white border-2 rounded-lg ">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-[#5589a7] mb-3">Готовы начать обучение?</h3>
                  <p className="text-slate-600 mb-6">
                    Теперь курс будет адаптирован под ваш стиль обучения. Начните изучение материала.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={() => router.push(`/course/${params.courseId}/learn`)} 
                      className="flex items-center gap-2 bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
                    >
                      Начать обучение
                    </Button>
                    <Button 
                      onClick={handleRetakeTest} 
                      variant="secondary" 
                      className="flex items-center gap-2 border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/5"
                    >
                      Пройти тест заново
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
        description="Ответьте на 7 вопросов, чтобы мы адаптировали курс под ваш режим представления материала"
        breadcrumbs={[
          { label: "Главная", href: "/" }, 
          { label: "Курс", href: `/course/${params.courseId}` }, 
          { label: "Тест ученика" }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-[#5589a7]">
                Вопрос {currentQuestion + 1} из {studentTestQuestions.length}
              </span>
              <span className="text-lg font-semibold text-[#5589a7]">{Math.round(progress)}% завершено</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Question Card */}
          <Card className="mb-8 bg-white border-2 hover:border-[#659AB8]/20 transition-colors rounded-lg ">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl lg:text-2xl text-[#5589a7] font-bold leading-relaxed">
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
                      className="mt-1 border-[#659AB8] text-[#5589a7]"
                    />
                    <Label
                      htmlFor={option.id}
                      className="text-lg leading-relaxed cursor-pointer flex-1 text-[#111827]"
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

