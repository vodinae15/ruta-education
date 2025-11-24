import React, { useState } from "react"
import { BlockWrapper } from "./BlockWrapper"
import { Card } from "@/components/ui/card"

interface TestBlockProps {
  isEmpty?: boolean
}

export function TestBlock({ isEmpty = true }: TestBlockProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const totalQuestions = 10

  return (
    <BlockWrapper
      blockNumber={5}
      title="Итоговое задание"
      intro="Проверьте свои знания. У вас есть одна попытка."
      isEmpty={isEmpty}
    >
      {!isEmpty && (
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
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Текст вопроса будет здесь
            </h3>

            {/* Варианты ответа */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((option) => (
                <button
                  key={option}
                  className="w-full text-left p-4 border-2 border-[#E5E7EB] rounded-lg hover:border-[#659AB8] transition-colors duration-200"
                >
                  <span className="font-medium text-slate-900">
                    Вариант ответа {option}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Навигация */}
          <div className="flex justify-between">
            <button
              className="px-6 py-2 text-[#659AB8] border-2 border-[#659AB8] rounded-lg font-semibold hover:bg-[#659AB8] hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            >
              Назад
            </button>
            <button
              className="px-6 py-2 bg-[#659AB8] text-white border-2 border-[#659AB8] rounded-lg font-semibold hover:bg-[#5589a7] hover:border-[#5589a7] transition-colors duration-200"
              onClick={() => {
                if (currentQuestion < totalQuestions - 1) {
                  setCurrentQuestion(currentQuestion + 1)
                } else {
                  alert("Тест завершен!")
                }
              }}
            >
              {currentQuestion === totalQuestions - 1 ? "Завершить" : "Далее"}
            </button>
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
