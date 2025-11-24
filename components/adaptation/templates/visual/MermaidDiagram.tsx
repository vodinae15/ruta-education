"use client"

import React, { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface MermaidDiagramProps {
  isEmpty?: boolean
  mermaidCode?: string
  introText?: string
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

export function MermaidDiagram({ isEmpty = true, mermaidCode, introText }: MermaidDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [diagramId] = useState(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    const renderDiagram = async () => {
      if (mermaidRef.current) {
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
  }, [isEmpty, mermaidCode, diagramId])

  return (
    <BlockWrapper
      blockNumber={1}
      title="Визуальная структура темы"
      intro="Схема взаимосвязей между концепциями"
      isEmpty={false}
    >
      {/* Текст от автора */}
      {introText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{introText}</p>
        </div>
      )}

      <div className="bg-[#F8FAFB] rounded-lg border border-[#E5E7EB] p-4 max-h-64 overflow-auto">
        <div ref={mermaidRef} className="mermaid-diagram flex justify-center items-center min-h-[200px]">
          {/* Mermaid SVG будет вставлен сюда */}
        </div>
      </div>

      {isEmpty && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: схема Mermaid (генерируется AI). Максимум 8-9 узлов, 3 уровня вложенности
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
