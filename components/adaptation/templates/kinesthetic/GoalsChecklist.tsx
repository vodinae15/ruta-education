"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { CheckCircle2, Circle, Target } from "lucide-react"

interface Goal {
  id: string
  text: string
  subgoals?: SubGoal[]
}

interface SubGoal {
  id: string
  text: string
  completed: boolean
}

interface GoalsChecklistProps {
  isEmpty?: boolean
  goals?: Goal[]
}

function ChecklistItem({
  text,
  completed,
  onToggle,
  isEmpty,
  isSubgoal = false,
}: {
  text: string
  completed: boolean
  onToggle: () => void
  isEmpty: boolean
  isSubgoal?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors duration-200 ${
        isSubgoal ? "ml-8" : ""
      } ${completed ? "bg-[#E8F4FA]" : "bg-white hover:bg-[#F8FAFB]"}`}
    >
      <button
        onClick={onToggle}
        disabled={isEmpty}
        className="flex-shrink-0 mt-0.5"
      >
        {completed ? (
          <CheckCircle2 className="w-6 h-6 text-[#659AB8]" />
        ) : (
          <Circle className="w-6 h-6 text-slate-300" />
        )}
      </button>
      <p
        className={`flex-1 text-sm ${
          completed ? "text-slate-500 line-through" : "text-slate-900"
        } ${isEmpty ? "text-slate-400" : ""}`}
      >
        {text}
      </p>
    </div>
  )
}

export function GoalsChecklist({ isEmpty = true, goals }: GoalsChecklistProps) {
  const defaultGoals: Goal[] = [
    {
      id: "goal-1",
      text: "Цель 1: Понять основные концепции",
      subgoals: [
        { id: "sub-1-1", text: "Изучить определение понятия", completed: false },
        { id: "sub-1-2", text: "Разобрать примеры применения", completed: false },
      ],
    },
    {
      id: "goal-2",
      text: "Цель 2: Применить знания на практике",
      subgoals: [
        { id: "sub-2-1", text: "Выполнить упражнение 1", completed: false },
        { id: "sub-2-2", text: "Выполнить упражнение 2", completed: false },
        { id: "sub-2-3", text: "Проанализировать результаты", completed: false },
      ],
    },
    {
      id: "goal-3",
      text: "Цель 3: Закрепить материал",
      subgoals: [
        { id: "sub-3-1", text: "Создать собственный пример", completed: false },
        { id: "sub-3-2", text: "Обсудить с коллегами", completed: false },
      ],
    },
  ]

  const [goalsState, setGoalsState] = useState<Goal[]>(
    goals && goals.length > 0 ? goals : defaultGoals
  )

  const toggleSubgoal = (goalId: string, subgoalId: string) => {
    setGoalsState((prevGoals) =>
      prevGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              subgoals: goal.subgoals?.map((sub) =>
                sub.id === subgoalId ? { ...sub, completed: !sub.completed } : sub
              ),
            }
          : goal
      )
    )
  }

  const calculateProgress = () => {
    const totalSubgoals = goalsState.reduce(
      (acc, goal) => acc + (goal.subgoals?.length || 0),
      0
    )
    const completedSubgoals = goalsState.reduce(
      (acc, goal) =>
        acc + (goal.subgoals?.filter((sub) => sub.completed).length || 0),
      0
    )
    return totalSubgoals > 0 ? Math.round((completedSubgoals / totalSubgoals) * 100) : 0
  }

  return (
    <BlockWrapper
      blockNumber={1}
      title="Цели и план действий"
      intro="Практико-ориентированные цели обучения с чек-листом"
      isEmpty={false}
    >
      <div className="space-y-6">
        {/* Прогресс */}
        <div className="bg-[#E8F4FA] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#659AB8]" />
              <span className="font-semibold text-slate-900">Ваш прогресс</span>
            </div>
            <span className="text-sm font-medium text-[#5589a7]">
              {calculateProgress()}%
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-3">
            <div
              className="bg-[#659AB8] h-3 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>

        {/* Цели и подцели */}
        <div className="space-y-4">
          {goalsState.map((goal) => (
            <div key={goal.id} className="border border-[#E5E7EB] rounded-lg p-4">
              {/* Главная цель */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#659AB8] rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h4 className={`font-semibold ${isEmpty ? "text-slate-400" : "text-slate-900"}`}>
                  {goal.text}
                </h4>
              </div>

              {/* Подцели */}
              <div className="space-y-2">
                {goal.subgoals?.map((subgoal) => (
                  <ChecklistItem
                    key={subgoal.id}
                    text={subgoal.text}
                    completed={subgoal.completed}
                    onToggle={() => toggleSubgoal(goal.id, subgoal.id)}
                    isEmpty={isEmpty}
                    isSubgoal
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {isEmpty && (
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Шаблон: структура целей с интерактивным чек-листом для отслеживания прогресса
            </p>
          </div>
        )}
      </div>
    </BlockWrapper>
  )
}
