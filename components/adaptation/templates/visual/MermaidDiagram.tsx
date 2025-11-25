"use client"

import React, { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface MermaidDiagramProps {
  isEmpty?: boolean
  mermaidCode?: string
  introText?: string
  mainText?: string
  isEditing?: boolean
  onMermaidCodeChange?: (code: string) => void
  onMainTextChange?: (text: string) => void
}

// Инициализируем Mermaid с нашими цветами
mermaid.initialize({
  startOnLoad: true,
  theme: "base",
  themeVariables: {
    primaryColor: "#E8F4FA",
    primaryTextColor: "#111827",
    primaryBorderColor: "#659AB8",
    lineColor: "#659AB8",
    secondaryColor: "#F8FAFB",
    tertiaryColor: "#FFFFFF",
    fontSize: "14px",
    fontFamily: "inherit",
  },
})

// Пример mermaid кода по умолчанию
const defaultMermaidCode = `graph TD
    A[Химические реакции] --> B[Типы реакций]
    A --> C[Скорость реакции]
    A --> D[Энергия реакции]
    B --> E[Соединение]
    B --> F[Разложение]
    C --> G[Катализаторы]
    D --> H[Экзотермические]
    D --> I[Эндотермические]

    style A fill:#659AB8,stroke:#5589a7,stroke-width:2px,color:#fff
    style B fill:#E8F4FA,stroke:#659AB8,stroke-width:2px,color:#111827
    style C fill:#E8F4FA,stroke:#659AB8,stroke-width:2px,color:#111827
    style D fill:#E8F4FA,stroke:#659AB8,stroke-width:2px,color:#111827
    style E fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style F fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style G fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style H fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style I fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827`

export function MermaidDiagram({ isEmpty = true, mermaidCode, introText, mainText, isEditing = false, onMermaidCodeChange, onMainTextChange }: MermaidDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [diagramId] = useState(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`)
  const [localMermaidCode, setLocalMermaidCode] = useState(mermaidCode || defaultMermaidCode)

  useEffect(() => {
    const renderDiagram = async () => {
      if (mermaidRef.current && !isEditing) {
        try {
          // Очищаем предыдущее содержимое
          mermaidRef.current.removeAttribute("data-processed")

          const displayCode = mermaidCode || defaultMermaidCode

          // Рендерим диаграмму
          const { svg } = await mermaid.render(diagramId, displayCode)
          mermaidRef.current.innerHTML = svg
        } catch (error) {
          console.error("Mermaid render error:", error)
          mermaidRef.current.innerHTML = "<p class='text-red-500 text-sm'>Ошибка рендеринга диаграммы</p>"
        }
      }
    }

    renderDiagram()
  }, [isEmpty, mermaidCode, diagramId, isEditing])

  const handleMermaidCodeChange = (code: string) => {
    setLocalMermaidCode(code)
    onMermaidCodeChange?.(code)
  }

  return (
    <BlockWrapper
      blockNumber={1}
      title="Визуальная структура темы"
      intro="Схема взаимосвязей между концепциями"
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      {/* Текст от автора */}
      {introText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{introText}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div className="border-2 border-[#659AB8] rounded-lg p-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Код Mermaid диаграммы</h4>
              <p className="text-xs text-slate-500">
                Синтаксис: graph TD, A[текст] --&gt; B[текст].
                Стили: style A fill:#659AB8,stroke:#5589a7,color:#fff
              </p>
            </div>
            <textarea
              value={localMermaidCode}
              onChange={(e) => handleMermaidCodeChange(e.target.value)}
              className="w-full min-h-[300px] px-3 py-2 border border-[#659AB8] rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#659AB8]"
              placeholder="graph TD&#10;    A[Начало] --> B[Конец]"
            />
            <div className="mt-2 text-xs text-slate-500">
              <strong>Подсказки:</strong><br />
              • graph TD или graph LR (направление)<br />
              • A[Текст узла] или A((Круглый))<br />
              • A --&gt; B (стрелка), A --- B (линия)<br />
              • style A fill:#659AB8,stroke:#5589a7,color:#fff
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#F8FAFB] rounded-lg border border-[#E5E7EB] p-4 max-h-64 overflow-auto">
          <div ref={mermaidRef} className="mermaid-diagram flex justify-center items-center min-h-[200px]">
            {/* Mermaid SVG будет вставлен сюда */}
          </div>
        </div>
      )}

      {isEmpty && !isEditing && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: схема Mermaid (генерируется AI). Максимум 8-9 узлов, 3 уровня вложенности
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
