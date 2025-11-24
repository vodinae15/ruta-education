"use client"

import React, { useState } from "react"
import { FlipCards } from "@/components/adaptation/templates/original/FlipCards"
import { StructuredText } from "@/components/adaptation/templates/original/StructuredText"
import { MermaidDiagram } from "@/components/adaptation/templates/visual/MermaidDiagram"
import { ComparisonTable } from "@/components/adaptation/templates/visual/ComparisonTable"
import { AudioUploadBlock } from "@/components/adaptation/templates/auditory/AudioUploadBlock"
import { AudioCards } from "@/components/adaptation/templates/auditory/AudioCards"
import { GoalsChecklist } from "@/components/adaptation/templates/kinesthetic/GoalsChecklist"
import { PracticalText } from "@/components/adaptation/templates/kinesthetic/PracticalText"
import { PracticeBlock } from "@/components/adaptation/blocks/PracticeBlock"
import { AttachmentsBlock } from "@/components/adaptation/blocks/AttachmentsBlock"
import { TestBlock } from "@/components/adaptation/blocks/TestBlock"

type AdaptationType = "original" | "visual" | "auditory" | "kinesthetic"

export default function AdaptationPreviewPage() {
  const [selectedType, setSelectedType] = useState<AdaptationType>("original")

  const adaptationTypes = [
    {
      id: "original" as const,
      name: "Оригинальный",
      description: "Флип-карточки + структурированный текст",
    },
    {
      id: "visual" as const,
      name: "Визуальный",
      description: "Mermaid-схема + таблицы сравнения",
    },
    {
      id: "auditory" as const,
      name: "Аудиальный",
      description: "Аудио-обзор + аудио-карточки",
    },
    {
      id: "kinesthetic" as const,
      name: "Кинестетический",
      description: "Цели с чек-листом + практический текст",
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Заголовок */}
      <div className="bg-white border-b border-[#E5E7EB] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            Шаблоны <span className="text-[#5589a7]">адаптации курсов</span>
          </h1>
          <p className="text-lg text-slate-600">
            Выберите тип адаптации, чтобы увидеть структуру шаблона
          </p>
        </div>
      </div>

      {/* Выбор типа адаптации */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {adaptationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`text-left p-6 rounded-lg border-2 transition-all duration-200 ${
                selectedType === type.id
                  ? "border-[#659AB8] bg-[#E8F4FA]"
                  : "border-[#E5E7EB] bg-white hover:border-[#659AB8]"
              }`}
            >
              <h3 className="font-semibold text-slate-900 mb-2">{type.name}</h3>
              <p className="text-sm text-slate-600">{type.description}</p>
            </button>
          ))}
        </div>

        {/* Информационная плашка */}
        <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-4 mb-8">
          <p className="text-sm text-slate-600">
            <strong>Примечание:</strong> Это пустые шаблоны. После генерации AI заполнит их
            содержимым на основе вашего урока. Вы сможете редактировать любой текст, но не
            изменять структуру блоков.
          </p>
        </div>

        {/* Структура из 5 блоков */}
        <div className="space-y-8">
          {/* Блок 1 - зависит от типа */}
          {selectedType === "original" && <FlipCards isEmpty={true} />}
          {selectedType === "visual" && <MermaidDiagram isEmpty={true} />}
          {selectedType === "auditory" && <AudioUploadBlock isEmpty={true} />}
          {selectedType === "kinesthetic" && <GoalsChecklist isEmpty={true} />}

          {/* Блок 2 - зависит от типа */}
          {selectedType === "original" && <StructuredText isEmpty={true} />}
          {selectedType === "visual" && <ComparisonTable isEmpty={true} />}
          {selectedType === "auditory" && <AudioCards isEmpty={true} />}
          {selectedType === "kinesthetic" && <PracticalText isEmpty={true} />}

          {/* Блок 3 - Практика (одинаковый для всех) */}
          <PracticeBlock isEmpty={true} />

          {/* Блок 4 - Вложения (одинаковый для всех) */}
          <AttachmentsBlock isEmpty={true} />

          {/* Блок 5 - Тест (одинаковый для всех) */}
          <TestBlock isEmpty={true} />
        </div>

        {/* Итоговая информация */}
        <div className="mt-8 bg-white border border-[#E5E7EB] rounded-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Структура адаптации "{adaptationTypes.find((t) => t.id === selectedType)?.name}"
          </h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <strong>Обзор темы:</strong>{" "}
                {selectedType === "original" && "6 интерактивных флип-карточек"}
                {selectedType === "visual" && "Визуальная диаграмма с узлами и связями"}
                {selectedType === "auditory" && "Аудио-обзор темы (3-5 минут)"}
                {selectedType === "kinesthetic" && "Структура целей с интерактивным чек-листом"}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <strong>Основы темы:</strong>{" "}
                {selectedType === "original" && "Структурированный текст с разделами"}
                {selectedType === "visual" &&
                  "Таблица сравнения (4 колонки: Понятие, Определение, Признаки, Пример)"}
                {selectedType === "auditory" && "6 аудио-карточек с терминами"}
                {selectedType === "kinesthetic" && "Практико-ориентированный текст с примерами"}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <strong>Практическое закрепление:</strong> Практические задания (одинаковые для
                всех типов)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <div>
                <strong>Углубленное изучение:</strong> Все медиа-вложения из оригинального урока
                (видео, аудио, документы, изображения)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">5</span>
              </div>
              <div>
                <strong>Итоговое задание:</strong> Тест из 10 вопросов (одна попытка)
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка возврата */}
        <div className="mt-8 text-center">
          <a
            href="/course-constructor"
            className="inline-block bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
          >
            Вернуться к конструктору
          </a>
        </div>
      </div>
    </div>
  )
}
