"use client"

import React, { useState } from "react"
import { BlockWrapper } from "./BlockWrapper"
import { Card } from "@/components/ui/card"
import { Check, X, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TestQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number // индекс правильного ответа (0-3)
  explanation: string
}

interface TestBlockProps {
  isEmpty?: boolean
  mainText?: string
  questions?: TestQuestion[]
  isEditing?: boolean
  onQuestionsChange?: (questions: TestQuestion[]) => void
}

export function TestBlock({ isEmpty = true, mainText, questions = [], isEditing = false, onQuestionsChange }: TestBlockProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null))
  const [showResults, setShowResults] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const hasQuestions = questions && questions.length > 0
  const totalQuestions = questions.length
  const currentQ = questions[currentQuestion]

  const handleAnswerSelect = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = optionIndex
    setSelectedAnswers(newAnswers)
    setShowExplanation(true)
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowExplanation(false)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setShowExplanation(selectedAnswers[currentQuestion - 1] !== null)
    }
  }

  const handleFinish = () => {
    setShowResults(true)
  }

  const handleRetry = () => {
    setSelectedAnswers(new Array(questions.length).fill(null))
    setCurrentQuestion(0)
    setShowResults(false)
    setShowExplanation(false)
  }

  const calculateResults = () => {
    let correct = 0
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correct++
      }
    })
    return {
      correct,
      total: totalQuestions,
      percentage: Math.round((correct / totalQuestions) * 100)
    }
  }

  const isCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    return questions[questionIndex]?.correctAnswer === optionIndex
  }

  const isSelectedAnswer = (optionIndex: number) => {
    return selectedAnswers[currentQuestion] === optionIndex
  }

  if (showResults) {
    const results = calculateResults()
    return (
      <BlockWrapper
        blockNumber={5}
        title="Итоговое задание"
        intro="Результаты теста"
        isEmpty={false}
        mainText={mainText}
      >
        <div className="max-w-3xl mx-auto">
          <Card className="border p-8 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              results.percentage >= 70 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-4xl font-bold ${
                results.percentage >= 70 ? 'text-green-600' : 'text-red-600'
              }`}>
                {results.percentage}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {results.percentage >= 70 ? 'Поздравляем! Тест пройден!' : 'Тест не пройден'}
            </h3>
            <p className="text-lg text-slate-600 mb-6">
              Правильных ответов: {results.correct} из {results.total}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8] hover:text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Пройти заново
              </Button>
            </div>
          </Card>

          {/* Детализация ответов */}
          <div className="mt-8 space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Детальные результаты:</h4>
            {questions.map((q, qIndex) => {
              const isCorrect = selectedAnswers[qIndex] === q.correctAnswer
              return (
                <Card key={q.id} className={`p-4 border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <X className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 mb-2">{q.question}</p>
                      <p className="text-sm text-slate-600">
                        Ваш ответ: <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                          {q.options[selectedAnswers[qIndex] || 0]}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-700">
                          Правильный ответ: {q.options[q.correctAnswer]}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 mt-2 italic">{q.explanation}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </BlockWrapper>
    )
  }

  return (
    <BlockWrapper
      blockNumber={5}
      title="Итоговое задание"
      intro="Проверьте свои знания"
      isEmpty={isEmpty || !hasQuestions}
      mainText={mainText}
    >
      {hasQuestions && currentQ && (
        <div className="max-w-3xl mx-auto">
          {/* Прогресс */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">
                Вопрос {currentQuestion + 1} из {totalQuestions}
              </span>
              <span className="text-sm text-slate-600">
                {Math.round(((currentQuestion + 1) / totalQuestions) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div
                className="bg-[#659AB8] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Карточка вопроса */}
          <Card className="border p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">
              {currentQ.question}
            </h3>

            {/* Варианты ответа */}
            <div className="space-y-3">
              {currentQ.options.map((option, optionIndex) => {
                const isSelected = isSelectedAnswer(optionIndex)
                const isCorrect = isCorrectAnswer(currentQuestion, optionIndex)
                const showCorrectness = showExplanation

                return (
                  <button
                    key={optionIndex}
                    onClick={() => !showExplanation && handleAnswerSelect(optionIndex)}
                    disabled={showExplanation}
                    className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                      showCorrectness
                        ? isCorrect
                          ? "border-green-500 bg-green-50"
                          : isSelected
                          ? "border-red-500 bg-red-50"
                          : "border-[#E5E7EB]"
                        : isSelected
                        ? "border-[#659AB8] bg-[#E8F4FA] shadow-md"
                        : "border-[#E5E7EB] hover:border-[#659AB8] hover:bg-[#F8FAFB]"
                    } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        showCorrectness
                          ? isCorrect
                            ? "text-green-700"
                            : isSelected
                            ? "text-red-700"
                            : "text-slate-600"
                          : isSelected
                          ? "text-[#659AB8]"
                          : "text-slate-900"
                      }`}>
                        {option}
                      </span>
                      {showCorrectness && isCorrect && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {showCorrectness && isSelected && !isCorrect && (
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {!showCorrectness && isSelected && (
                        <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Объяснение */}
            {showExplanation && currentQ.explanation && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">💡 Объяснение:</p>
                <p className="text-sm text-blue-800">{currentQ.explanation}</p>
              </div>
            )}
          </Card>

          {/* Навигация */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              className="border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8] hover:text-white"
              disabled={currentQuestion === 0}
              onClick={handlePrevious}
            >
              Назад
            </Button>
            {currentQuestion === totalQuestions - 1 ? (
              <Button
                onClick={handleFinish}
                disabled={selectedAnswers.some(a => a === null)}
                className="bg-[#659AB8] hover:bg-[#5589a7] text-white"
              >
                Завершить тест
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={selectedAnswers[currentQuestion] === null}
                className="bg-[#659AB8] hover:bg-[#5589a7] text-white"
              >
                Далее
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
