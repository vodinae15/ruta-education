import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Zap, Lightbulb, AlertCircle } from "lucide-react"

interface PracticalSection {
  id: string
  title: string
  content: string
}

interface PracticalTextProps {
  isEmpty?: boolean
  sections?: PracticalSection[]
  mainText?: string
}

export function PracticalText({ isEmpty = true, sections, mainText }: PracticalTextProps) {
  const defaultSections: PracticalSection[] = [
    { id: "1", title: "Практическое применение", content: "Попробуйте провести простой эксперимент: смешайте соду и уксус." },
  ]

  const displaySections = sections && sections.length > 0 ? sections : defaultSections

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Практико-ориентированное изложение с акцентом на действия"
      isEmpty={false}
      mainText={mainText}
    >
      <div className="space-y-4">
        {displaySections.map((section) => (
          <div key={section.id} className="bg-[#E8F4FA] border-l-4 border-[#659AB8] rounded-r-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                  {section.title}
                </h4>
                <p className={`text-sm ${isEmpty ? "text-slate-400" : "text-slate-600"}`}>
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BlockWrapper>
  )
}
