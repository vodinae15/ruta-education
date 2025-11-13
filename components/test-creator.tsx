"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusIcon, TrashIcon } from "@/components/ui/icons"

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

interface TestCreatorProps {
  initialData?: TestData
  onChange: (data: TestData) => void
}

export function TestCreator({ initialData, onChange }: TestCreatorProps) {
  const [testData, setTestData] = useState<TestData>(
    initialData || {
      question: "",
      answers: [
        { id: "1", text: "", correct: false },
        { id: "2", text: "", correct: false },
      ],
      multipleChoice: false,
      attempts: 3,
      showCorrectAnswers: true,
    },
  )

  const updateTestData = (updates: Partial<TestData>) => {
    const newData = { ...testData, ...updates }
    setTestData(newData)
    onChange(newData)
  }

  const addAnswer = () => {
    const newAnswer: TestAnswer = {
      id: Date.now().toString(),
      text: "",
      correct: false,
    }
    updateTestData({
      answers: [...testData.answers, newAnswer],
    })
  }

  const removeAnswer = (answerId: string) => {
    if (testData.answers.length <= 2) return // Минимум 2 варианта
    updateTestData({
      answers: testData.answers.filter((answer) => answer.id !== answerId),
    })
  }

  const updateAnswer = (answerId: string, text: string) => {
    updateTestData({
      answers: testData.answers.map((answer) => (answer.id === answerId ? { ...answer, text } : answer)),
    })
  }

  const toggleCorrectAnswer = (answerId: string) => {
    updateTestData({
      answers: testData.answers.map((answer) => {
        if (answer.id === answerId) {
          return { ...answer, correct: !answer.correct }
        }
        // Если не множественный выбор, убираем correct у других ответов
        if (!testData.multipleChoice && answer.correct) {
          return { ...answer, correct: false }
        }
        return answer
      }),
    })
  }

  return (
    <div className="space-y-6">
      {/* Вопрос */}
      <div className="space-y-2">
        <Label htmlFor="question">Вопрос теста</Label>
        <Textarea
          id="question"
          value={testData.question}
          onChange={(e) => updateTestData({ question: e.target.value })}
          placeholder="Введите вопрос для теста"
          rows={3}
        />
      </div>

      {/* Настройки теста */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Настройки теста</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="multipleChoice"
              checked={testData.multipleChoice}
              onCheckedChange={(checked) => updateTestData({ multipleChoice: !!checked })}
            />
            <Label htmlFor="multipleChoice" className="text-sm">
              Несколько правильных ответов
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showCorrectAnswers"
              checked={testData.showCorrectAnswers}
              onCheckedChange={(checked) => updateTestData({ showCorrectAnswers: !!checked })}
            />
            <Label htmlFor="showCorrectAnswers" className="text-sm">
              Показывать правильные ответы после прохождения
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attempts">Количество попыток</Label>
            <Input
              id="attempts"
              type="number"
              min="1"
              max="10"
              value={testData.attempts}
              onChange={(e) => updateTestData({ attempts: Number.parseInt(e.target.value) || 1 })}
              className="w-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Варианты ответов */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Варианты ответов</Label>
          <Button type="button" variant="outline" size="sm" onClick={addAnswer} className="h-8 bg-transparent">
            <PlusIcon className="w-4 h-4 mr-1" />
            Добавить вариант
          </Button>
        </div>

        <div className="space-y-3">
          {testData.answers.map((answer, index) => (
            <div key={answer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                {testData.multipleChoice ? (
                  <Checkbox checked={answer.correct} onCheckedChange={() => toggleCorrectAnswer(answer.id)} />
                ) : (
                  <RadioGroup
                    value={answer.correct ? answer.id : ""}
                    onValueChange={() => toggleCorrectAnswer(answer.id)}
                  >
                    <RadioGroupItem value={answer.id} />
                  </RadioGroup>
                )}
                <Label className="text-sm text-gray-600">{answer.correct ? "Правильный" : "Неправильный"}</Label>
              </div>

              <Input
                value={answer.text}
                onChange={(e) => updateAnswer(answer.id, e.target.value)}
                placeholder={`Вариант ответа ${index + 1}`}
                className="flex-1"
              />

              {testData.answers.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAnswer(answer.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Предварительный просмотр */}
      {testData.question && testData.answers.some((a) => a.text) && (
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">Предварительный просмотр</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="font-medium">{testData.question}</p>
              <div className="space-y-2">
                {testData.answers
                  .filter((answer) => answer.text)
                  .map((answer, index) => (
                    <div key={answer.id} className="flex items-center space-x-2">
                      <div className="w-4 h-4 border rounded flex items-center justify-center text-xs">{index + 1}</div>
                      <span className="text-sm">{answer.text}</span>
                      {answer.correct && <span className="text-xs text-green-600 font-medium">✓</span>}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
