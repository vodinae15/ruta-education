"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { CheckCircle2, Circle, Target } from "lucide-react"

interface Goal {
  id: string
  goal: string
  completed: boolean
}

interface GoalsChecklistProps {
  isEmpty?: boolean
  goals?: Goal[]
}

export function GoalsChecklist({ isEmpty = true, goals }: GoalsChecklistProps) {
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
    >
      <div className="space-y-4">
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
