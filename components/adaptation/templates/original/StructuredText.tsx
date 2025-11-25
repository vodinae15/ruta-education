import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface TextSection {
  id: string
  title: string
  content: string
}

interface StructuredTextProps {
  isEmpty?: boolean
  sections?: TextSection[]
  mainText?: string
}

export function StructuredText({ isEmpty = true, sections, mainText }: StructuredTextProps) {
  const defaultSections: TextSection[] = [
    { id: "1", title: "Первый раздел", content: "Абзац с описанием первой концепции..." },
    { id: "2", title: "Второй раздел", content: "Абзац с описанием второй концепции..." },
    { id: "3", title: "Третий раздел", content: "Абзац с описанием третьей концепции..." },
  ]

  const displaySections = sections && sections.length > 0 ? sections : defaultSections

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Структурированное изложение основных концепций"
      isEmpty={false}
      mainText={mainText}
    >
      <div className="space-y-4">
        {displaySections.map((section, index) => (
          <div key={section.id}>
            <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-xs">
                {index + 1}
              </span>
              {section.title}
            </h3>
            <div className="pl-7">
              <p className={`text-sm ${isEmpty ? "text-slate-400" : "text-slate-600"}`}>
                {section.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </BlockWrapper>
  )
}
