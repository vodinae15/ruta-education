"use client"

import React, { useEffect, useRef } from "react"
import mermaid from "mermaid"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface MermaidDiagramProps {
  isEmpty?: boolean
  mermaidCode?: string
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

export function MermaidDiagram({ isEmpty = true, mermaidCode }: MermaidDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEmpty && mermaidCode && mermaidRef.current) {
      mermaidRef.current.removeAttribute("data-processed")
      mermaid.contentLoaded()
    }
  }, [isEmpty, mermaidCode])

  // Пример mermaid кода для пустого состояния
  const defaultMermaidCode = `graph TD
    A[Центральная тема] --> B[Подтема 1]
    A --> C[Подтема 2]
    A --> D[Подтема 3]
    B --> E[Детали 1]
    B --> F[Детали 2]
    C --> G[Детали 3]
    D --> H[Детали 4]

    style A fill:#659AB8,stroke:#5589a7,stroke-width:2px,color:#fff
    style B fill:#E8F4FA,stroke:#659AB8,stroke-width:2px,color:#111827
    style C fill:#E8F4FA,stroke:#659AB8,stroke-width:2px,color:#111827
    style D fill:#E8F4FA,stroke:#659AB8,stroke-width:2px,color:#111827
    style E fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style F fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style G fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827
    style H fill:#F8FAFB,stroke:#659AB8,stroke-width:1px,color:#111827`

  const displayCode = mermaidCode || defaultMermaidCode

  return (
    <BlockWrapper
      blockNumber={1}
      title="Визуальная структура темы"
      intro="Схема взаимосвязей между концепциями"
      isEmpty={false}
    >
      <div className="bg-[#F8FAFB] rounded-lg border border-[#E5E7EB] p-6 max-h-96 overflow-auto">
        {isEmpty ? (
          <div
            ref={mermaidRef}
            className="mermaid text-center"
            style={{ opacity: 0.6 }}
          >
            {displayCode}
          </div>
        ) : (
          <div ref={mermaidRef} className="mermaid text-center">
            {displayCode}
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: схема Mermaid (генерируется AI). Максимум 7-8 узлов, 3 уровня вложенности
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
