"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { CheckCircle2, Circle, Target, Trash2, Plus } from "lucide-react"

interface Goal {
  id: string
  goal: string
  completed: boolean
}

interface GoalsChecklistProps {
  isEmpty?: boolean
  goals?: Goal[]
  introText?: string
  mainText?: string
  isEditing?: boolean
  onGoalsChange?: (goals: Goal[]) => void
  onMainTextChange?: (text: string) => void
}

export function GoalsChecklist({ isEmpty = true, goals, introText, mainText, isEditing = false, onGoalsChange, onMainTextChange }: GoalsChecklistProps) {
  const defaultGoals: Goal[] = [
    { id: "1", goal: "Понять механизм химических реакций", completed: false },
    { id: "2", goal: "Научиться определять типы реакций", completed: false },
    { id: "3", goal: "Применять знания на практике", completed: false },
  ]

  const [goalsState, setGoalsState] = useState<Goal[]>(
    goals && goals.length > 0 ? goals : defaultGoals
  )

  const toggleGoal = (goalId: string) => {
    setGoalsState((prevGoals) =>
      prevGoals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
      )
    )
  }

  const handleGoalChange = (id: string, value: string) => {
    const updated = goalsState.map(g => g.id === id ? { ...g, goal: value } : g)
    setGoalsState(updated)
    onGoalsChange?.(updated)
  }

  const handleAddGoal = () => {
    const newGoal: Goal = { id: `goal-${Date.now()}`, goal: "", completed: false }
    const updated = [...goalsState, newGoal]
    setGoalsState(updated)
    onGoalsChange?.(updated)
  }

  const handleRemoveGoal = (id: string) => {
    const updated = goalsState.filter(g => g.id !== id)
    setGoalsState(updated)
    onGoalsChange?.(updated)
  }

  const calculateProgress = () => {
    const completed = goalsState.filter((g) => g.completed).length
    return goalsState.length > 0 ? Math.round((completed / goalsState.length) * 100) : 0
  }

  return (
    <BlockWrapper
      blockNumber={1}
      title="Цели обучения"
      intro="Отметьте цели по мере их достижения"
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      <div className="space-y-4">
        {/* Текст от автора */}
        {introText && (
          <div className="p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
            <p className="text-sm text-slate-700 leading-relaxed">{introText}</p>
          </div>
        )}

        {/* Прогресс */}
        <div className="bg-[#E8F4FA] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#659AB8]" />
              <span className="text-sm font-semibold text-slate-900">Прогресс</span>
            </div>
            <span className="text-sm font-medium text-[#5589a7]">
              {calculateProgress()}%
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2">
            <div
              className="bg-[#659AB8] h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>

        {/* Список целей */}
        {isEditing ? (
          <div className="space-y-3">
            {goalsState.map((goal, index) => (
              <div key={goal.id} className="flex items-center gap-2 border-2 border-[#659AB8] rounded-lg p-3">
                <span className="text-sm font-semibold text-slate-900 flex-shrink-0">#{index + 1}</span>
                <input
                  type="text"
                  value={goal.goal}
                  onChange={(e) => handleGoalChange(goal.id, e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7]"
                  placeholder="Введите цель обучения"
                />
                {goalsState.length > 1 && (
                  <button
                    onClick={() => handleRemoveGoal(goal.id)}
                    className="text-red-600 hover:text-red-700 p-1 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddGoal}
              className="w-full py-3 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить цель
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {goalsState.map((goal) => (
              <div
                key={goal.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors duration-200 cursor-pointer ${
                  goal.completed ? "bg-[#E8F4FA]" : "bg-white hover:bg-[#F8FAFB] border border-[#E5E7EB]"
                }`}
                onClick={() => !isEmpty && toggleGoal(goal.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    !isEmpty && toggleGoal(goal.id)
                  }}
                  disabled={isEmpty}
                  className="flex-shrink-0 mt-0.5"
                >
                  {goal.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#659AB8]" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </button>
                <p
                  className={`flex-1 text-sm ${
                    goal.completed ? "text-slate-500 line-through" : "text-slate-900"
                  } ${isEmpty ? "text-slate-400" : ""}`}
                >
                  {goal.goal}
                </p>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="text-center mt-3">
            <p className="text-sm text-slate-400">
              Шаблон: интерактивный чек-лист с целями обучения
            </p>
          </div>
        )}
      </div>
    </BlockWrapper>
  )
}
