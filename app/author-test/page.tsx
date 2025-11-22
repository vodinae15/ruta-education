"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "@/components/ui/icons"
import {
  authorTestQuestions,
  determineAuthorType,
  type TestAnswers,
  type AuthorTypeResult,
} from "@/lib/author-test-logic"
import { AuthorTestResults } from "@/components/author-test-results"

export default function AuthorTestPage() {
  const { user, loading } = useAuth()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<TestAnswers>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingProfile, setExistingProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return

      try {
        const { data: profile, error } = await supabase
          .from("author_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== "PGRST116") {
          throw error
        }

        setExistingProfile(profile)
      } catch (err) {
        console.error("Error checking existing profile:", err)
      } finally {
        setProfileLoading(false)
      }
    }

    if (user) {
      checkExistingProfile()
    }
  }, [user, supabase])

  if (loading || profileLoading) {
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

  if (!loading && !user) {
    router.push("/auth")
    return null
  }

  const handleSubmit = async () => {
    if (!canProceed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const completeAnswers = answers as TestAnswers
      const authorTypeResult = determineAuthorType(completeAnswers)

      console.log("[v0] User ID:", user.id)
      console.log("[v0] Complete answers:", completeAnswers)
      console.log("[v0] Author type result:", authorTypeResult)

      const profileData = {
        user_id: user.id,
        author_type: authorTypeResult.title,
        communication_style: completeAnswers.communicationStyle,
        motivation: completeAnswers.motivation,
        barrier: completeAnswers.barrier,
        test_results: {
          answers: completeAnswers,
          result: authorTypeResult,
          completed_at: new Date().toISOString(),
          test_version: "2.0",
        },
      }

      console.log("[v0] Profile data to save:", profileData)

      let savedProfile
      if (existingProfile) {
        console.log("[v0] Updating existing profile...")
        const { data, error: updateError } = await supabase
          .from("author_profiles")
          .update({
            ...profileData,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select()
          .single()

        console.log("[v0] Update result:", { data, error: updateError })
        if (updateError) throw updateError
        savedProfile = data
      } else {
        console.log("[v0] Inserting new profile...")
        const { data, error: insertError } = await supabase
          .from("author_profiles")
          .insert([profileData])
          .select()
          .single()

        console.log("[v0] Insert result:", { data, error: insertError })
        if (insertError) throw insertError
        savedProfile = data
      }

      console.log("[v0] Updating local state with saved profile:", savedProfile)
      setExistingProfile(savedProfile)

      setAnswers({})
      setCurrentQuestion(0)

      console.log("[v0] Profile saved successfully, showing results...")
    } catch (err) {
      console.error("[v0] Error saving test results:", err)
      setError(err instanceof Error ? err.message : "Произошла ошибка при сохранении результатов")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetakeTest = () => {
    console.log("[v0] Retaking test, clearing state...")
    setExistingProfile(null)
    setAnswers({})
    setCurrentQuestion(0)
    setError(null)
  }

  const progress = ((currentQuestion + 1) / authorTestQuestions.length) * 100
  const isLastQuestion = currentQuestion === authorTestQuestions.length - 1
  const currentQuestionId = authorTestQuestions[currentQuestion].id as keyof TestAnswers
  const canProceed = answers[currentQuestionId]

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionId]: value,
    }))
    setError(null)
  }

  const handleNext = () => {
    if (currentQuestion < authorTestQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  if (existingProfile && Object.keys(answers).length === 0) {
    // Пересоздаем authorTypeResult из сохраненных ответов, чтобы получить актуальные данные включая superpower
    const savedAnswers = existingProfile.test_results?.answers as TestAnswers
    const authorTypeResult = savedAnswers ? determineAuthorType(savedAnswers) : (existingProfile.test_results?.result as AuthorTypeResult)

    return (
      <div className="min-h-screen bg-cream">
        <MainNavigation user={user} />
        <PageHeader
          title={`Ваш тип автора: ${existingProfile.author_type}`}
          description="Результаты теста определения стиля преподавания"
          breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Тест автора" }]}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          {authorTypeResult ? (
            <>
              <AuthorTestResults authorTypeResult={authorTypeResult} />
              <div className="max-w-4xl mx-auto mt-8">
                <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-primary mb-3">Хотите пройти тест заново?</h3>
                      <p className="text-[#6B7280] mb-6">
                        Ваши взгляды могли измениться. Пройдите тест повторно, чтобы получить актуальные рекомендации.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
                          Перейти в личный кабинет
                        </Button>
                        <Button onClick={handleRetakeTest} variant="secondary" className="flex items-center gap-2">
                          Пройти тест заново
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="max-w-4xl mx-auto">
              <Card className="bg-white border-2 rounded-lg shadow-ruta-sm mb-8">
                <CardHeader>
                  <CardTitle className="text-xl lg:text-2xl text-primary font-bold leading-relaxed">
                    Ваш тип автора: {existingProfile.author_type}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <p className="text-[#111827]">
                      Вы уже проходили тест определения типа автора. Ваш результат сохранен в профиле.
                    </p>
                    <div className="flex gap-4">
                      <Button onClick={() => router.push("/dashboard")}>Перейти в личный кабинет</Button>
                      <Button onClick={handleRetakeTest} variant="secondary">
                        Пройти тест заново
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      <PageHeader
        title="Определим ваш стиль преподавания"
        description="Ответьте на 5 вопросов, чтобы мы подобрали идеальный конструктор курсов"
        breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Тест автора" }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-primary">
                Вопрос {currentQuestion + 1} из {authorTestQuestions.length}
              </span>
              <span className="text-lg font-semibold text-primary">{Math.round(progress)}% завершено</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Question Card */}
          <Card className="mb-8 bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl lg:text-2xl text-primary font-bold leading-relaxed">
                <span dangerouslySetInnerHTML={{ __html: authorTestQuestions[currentQuestion].question }} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RadioGroup
                value={answers[currentQuestionId] || ""}
                onValueChange={handleAnswerChange}
                className="space-y-2"
              >
                {authorTestQuestions[currentQuestion].options.map((option) => (
                  <div key={option.id} className="flex items-start space-x-4 p-2 rounded-lg hover:bg-light-blue/20 transition-colors">
                    <RadioGroupItem
                      value={option.value}
                      id={option.id}
                      className="mt-1 border-primary text-primary"
                    />
                    <Label
                      htmlFor={option.id}
                      className="text-lg leading-relaxed cursor-pointer flex-1 text-[#111827]"
                    >
                      <span dangerouslySetInnerHTML={{ __html: option.text }} />
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm" dangerouslySetInnerHTML={{ __html: error }} />
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
                    <CheckIcon className="w-5 h-5" />
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
            <p className="text-sm text-[#6B7280]">
              {!canProceed && "Выберите один из вариантов ответа для продолжения"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
