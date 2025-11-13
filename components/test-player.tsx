"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircleIcon, XCircleIcon, RefreshCwIcon } from "@/components/ui/icons"

interface TestAnswer {
  id: string
  text: string
  correct: boolean
}

interface TestData {
  question: string
  answers: TestAnswer[]
  multipleChoice: boolean
  attempts: number
  showCorrectAnswers: boolean
}

interface TestResult {
  selectedAnswers: string[]
  isCorrect: boolean
  attemptNumber: number
  timestamp: Date
}

interface TestPlayerProps {
  testData: TestData | any
  onComplete?: (result: TestResult) => void
  studentId?: string
}

// Функция валидации структуры теста
function validateTestData(data: any): { isValid: boolean; errors: string[]; normalizedData?: TestData } {
  const errors: string[] = []
  
  if (!data) {
    return { isValid: false, errors: ['Данные теста отсутствуют'] }
  }
  
  // Проверка обязательных полей
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length === 0) {
    errors.push('Отсутствует или некорректно поле "question"')
  }
  
  if (!data.answers || !Array.isArray(data.answers) || data.answers.length === 0) {
    errors.push('Отсутствует или некорректно поле "answers" (должен быть массив с минимум 1 элементом)')
  } else {
    // Проверка структуры ответов
    data.answers.forEach((answer: any, index: number) => {
      if (!answer.id || typeof answer.id !== 'string') {
        errors.push(`Ответ ${index + 1}: отсутствует или некорректно поле "id"`)
      }
      if (!answer.text || typeof answer.text !== 'string' || answer.text.trim().length === 0) {
        errors.push(`Ответ ${index + 1}: отсутствует или некорректно поле "text"`)
      }
      if (typeof answer.correct !== 'boolean') {
        errors.push(`Ответ ${index + 1}: отсутствует или некорректно поле "correct" (должно быть boolean)`)
      }
    })
    
    // Проверка наличия хотя бы одного правильного ответа
    const hasCorrectAnswer = data.answers.some((answer: any) => answer.correct === true)
    if (!hasCorrectAnswer) {
      errors.push('Должен быть хотя бы один правильный ответ')
    }
  }
  
  // Проверка опциональных полей с установкой значений по умолчанию
  const normalizedData: TestData = {
    question: data.question || 'Вопрос не указан',
    answers: data.answers || [],
    multipleChoice: typeof data.multipleChoice === 'boolean' ? data.multipleChoice : false,
    attempts: typeof data.attempts === 'number' && data.attempts > 0 ? data.attempts : 3,
    showCorrectAnswers: typeof data.showCorrectAnswers === 'boolean' ? data.showCorrectAnswers : true
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalizedData: errors.length === 0 ? normalizedData : undefined
  }
}

export function TestPlayer({ testData, onComplete, studentId }: TestPlayerProps) {
  // Валидация данных теста
  const validation = validateTestData(testData)
  
  // Если данные невалидны, показываем ошибку
  if (!validation.isValid || !validation.normalizedData) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-800">Ошибка загрузки теста</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-red-700 font-medium">Обнаружены ошибки в структуре теста:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-4 italic">
              Пожалуйста, обратитесь к автору курса для исправления теста.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Используем нормализованные данные
  const validTestData = validation.normalizedData
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [currentAttempt, setCurrentAttempt] = useState(1)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAnswerChange = (answerId: string, checked: boolean) => {
    if (hasSubmitted) return

    if (validTestData.multipleChoice) {
      setSelectedAnswers((prev) => (checked ? [...prev, answerId] : prev.filter((id) => id !== answerId)))
    } else {
      setSelectedAnswers(checked ? [answerId] : [])
    }
  }

  const checkAnswers = () => {
    const correctAnswerIds = validTestData.answers.filter((answer) => answer.correct).map((answer) => answer.id)

    const isCorrect =
      selectedAnswers.length === correctAnswerIds.length && selectedAnswers.every((id) => correctAnswerIds.includes(id))

    return isCorrect
  }

  const handleSubmit = async () => {
    if (selectedAnswers.length === 0) return

    setIsLoading(true)

    const isCorrect = checkAnswers()
    const result: TestResult = {
      selectedAnswers,
      isCorrect,
      attemptNumber: currentAttempt,
      timestamp: new Date(),
    }

    setTestResult(result)
    setHasSubmitted(true)

    // Call onComplete callback if provided
    if (onComplete) {
      onComplete(result)
    }

    setIsLoading(false)
  }

  const handleRetry = () => {
    if (currentAttempt >= validTestData.attempts) return

    setSelectedAnswers([])
    setHasSubmitted(false)
    setTestResult(null)
    setCurrentAttempt((prev) => prev + 1)
  }

  const canRetry = currentAttempt < validTestData.attempts && testResult && !testResult.isCorrect

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#659AB8]">Тест</CardTitle>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Попытка {currentAttempt} из {validTestData.attempts}
          </span>
          {validTestData.multipleChoice && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Можно выбрать несколько ответов</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-slate-900 leading-relaxed">{validTestData.question}</h3>

          {/* Answers */}
          <div className="space-y-3">
            {validTestData.answers.map((answer, index) => {
              const isSelected = selectedAnswers.includes(answer.id)
              const showResult = hasSubmitted && validTestData.showCorrectAnswers
              const isCorrectAnswer = answer.correct
              const isWrongSelection = hasSubmitted && isSelected && !answer.correct

              return (
                <div
                  key={answer.id}
                  className={`p-4 border rounded-lg transition-all ${
                    hasSubmitted
                      ? showResult && isCorrectAnswer
                        ? "border-green-500 bg-green-50"
                        : isWrongSelection
                          ? "border-red-500 bg-red-50"
                          : "border-slate-200 bg-slate-50"
                      : isSelected
                        ? "border-[#659AB8] bg-[#659AB8]/5"
                        : "border-slate-200 hover:border-slate-300 cursor-pointer"
                  }`}
                  onClick={() => !hasSubmitted && handleAnswerChange(answer.id, !isSelected)}
                >
                  <div className="flex items-center space-x-3">
                    {testData.multipleChoice ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleAnswerChange(answer.id, !!checked)}
                        disabled={hasSubmitted}
                      />
                    ) : (
                      <RadioGroup
                        value={isSelected ? answer.id : ""}
                        onValueChange={() => handleAnswerChange(answer.id, true)}
                        disabled={hasSubmitted}
                      >
                        <RadioGroupItem value={answer.id} />
                      </RadioGroup>
                    )}

                    <Label className="flex-1 cursor-pointer text-sm">{answer.text}</Label>

                    {/* Result indicators */}
                    {showResult && (
                      <div className="flex items-center">
                        {isCorrectAnswer && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                        {isWrongSelection && <XCircleIcon className="w-5 h-5 text-red-600" />}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Result */}
        {hasSubmitted && testResult && (
          <div
            className={`p-4 rounded-lg border-2 ${
              testResult.isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {testResult.isCorrect ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
              <span className={`font-semibold ${testResult.isCorrect ? "text-green-800" : "text-red-800"}`}>
                {testResult.isCorrect ? "Правильно!" : "Неправильно"}
              </span>
            </div>

            {!testResult.isCorrect && (
              <p className="text-sm text-red-700 mb-3">
                {validTestData.showCorrectAnswers
                  ? "Правильные ответы отмечены зеленым цветом."
                  : "Попробуйте еще раз или перейдите к следующему материалу."}
              </p>
            )}

            {testResult.isCorrect && (
              <p className="text-sm text-green-700">Отличная работа! Вы можете продолжить обучение.</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-slate-600">
            {hasSubmitted && !testResult?.isCorrect && canRetry && (
              <span>Осталось попыток: {validTestData.attempts - currentAttempt}</span>
            )}
          </div>

          <div className="flex gap-3">
            {!hasSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswers.length === 0 || isLoading}
                className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
              >
                {isLoading ? "Проверка..." : "Ответить"}
              </Button>
            ) : (
              <>
                {canRetry && (
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8]/5 bg-transparent"
                  >
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    Попробовать еще раз
                  </Button>
                )}

                {(testResult?.isCorrect || !canRetry) && (
                  <Button
                    onClick={() => {
                      // This would typically navigate to the next section
                      console.log("Continue to next section")
                    }}
                    className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
                  >
                    Продолжить
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Attempts exhausted message */}
        {hasSubmitted && !testResult?.isCorrect && !canRetry && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Попытки исчерпаны. Вы можете продолжить изучение материала или вернуться к тесту позже.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
