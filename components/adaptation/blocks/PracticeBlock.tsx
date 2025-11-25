import React from "react"
import { BlockWrapper } from "./BlockWrapper"

interface PracticeBlockProps {
  isEmpty?: boolean
  mainText?: string
}

export function PracticeBlock({ isEmpty = true, mainText }: PracticeBlockProps) {
  return (
    <BlockWrapper
      blockNumber={3}
      title="Практическое закрепление"
      intro="Примените полученные знания на практике"
      isEmpty={isEmpty}
      mainText={mainText}
    >
      {!isEmpty && (
        <div className="space-y-6">
          {/* Пример задания */}
          <div className="border-l-4 border-[#659AB8] pl-4">
            <h3 className="font-semibold text-slate-900 mb-2">Задание 1</h3>
            <p className="text-slate-600">Текст практического задания</p>
          </div>

          <div className="border-l-4 border-[#659AB8] pl-4">
            <h3 className="font-semibold text-slate-900 mb-2">Задание 2</h3>
            <p className="text-slate-600">Текст практического задания</p>
          </div>

          <div className="border-l-4 border-[#659AB8] pl-4">
            <h3 className="font-semibold text-slate-900 mb-2">Задание 3</h3>
            <p className="text-slate-600">Текст практического задания</p>
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
