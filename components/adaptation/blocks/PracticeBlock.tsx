"use client"

import React, { useState } from "react"
import { BlockWrapper } from "./BlockWrapper"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface PracticeTask {
  id: string
  instruction: string
  hint?: string
}

interface PracticeBlockProps {
  isEmpty?: boolean
  mainText?: string
  tasks?: PracticeTask[]
}

export function PracticeBlock({ isEmpty = true, mainText, tasks = [] }: PracticeBlockProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNotes = async () => {
    setIsSaving(true)
    try {
      // TODO: Здесь будет API call для сохранения заметок
      await new Promise(resolve => setTimeout(resolve, 500)) // Имитация сохранения
      console.log("Notes saved:", notes)
      // Можно добавить toast уведомление об успешном сохранении
    } catch (error) {
      console.error("Failed to save notes:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasTasks = tasks && tasks.length > 0

  return (
    <BlockWrapper
      blockNumber={3}
      title="Практическое закрепление"
      intro="Примените полученные знания на практике"
      isEmpty={isEmpty && !hasTasks}
      mainText={mainText}
    >
      {hasTasks && (
        <div className="space-y-6">
          {/* Практические задания */}
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <div
                key={task.id || index}
                className="border-l-4 border-[#659AB8] pl-4 py-2"
              >
                <h3 className="font-semibold text-slate-900 mb-2">
                  Задание {index + 1}
                </h3>
                <p className="text-slate-700 leading-relaxed mb-2">
                  {task.instruction}
                </p>
                {task.hint && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-900">
                      <span className="font-semibold">💡 Подсказка:</span> {task.hint}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Кнопка заметок */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Button
              onClick={() => setShowNotes(!showNotes)}
              variant="outline"
              className="w-full border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8] hover:text-white transition-colors"
            >
              {showNotes ? "Скрыть заметки" : "📝 Записать заметки"}
            </Button>

            {showNotes && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Ваши заметки по практическим заданиям:
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Запишите свои мысли, решения и наблюдения по практическим заданиям..."
                  className="min-h-[150px] border-slate-300 focus:border-[#659AB8] focus:ring-[#659AB8]"
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSaving || !notes.trim()}
                  className="bg-[#659AB8] hover:bg-[#5589a7] text-white"
                >
                  {isSaving ? "Сохранение..." : "Сохранить заметки"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
