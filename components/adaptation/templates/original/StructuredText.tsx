import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface StructuredTextProps {
  isEmpty?: boolean
  content?: string
}

export function StructuredText({ isEmpty = true, content }: StructuredTextProps) {
  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Структурированное изложение основных концепций"
      isEmpty={isEmpty}
    >
      {!isEmpty && content ? (
        <div className="prose max-w-none">
          <div className="space-y-6 text-slate-600">
            {content}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Пример структуры */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm">
                1
              </span>
              Первый раздел
            </h3>
            <div className="pl-8 space-y-2">
              <p className="text-slate-400">Абзац с описанием первой концепции...</p>
              <p className="text-slate-400">Дополнительные детали и примеры...</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm">
                2
              </span>
              Второй раздел
            </h3>
            <div className="pl-8 space-y-2">
              <p className="text-slate-400">Абзац с описанием второй концепции...</p>
              <p className="text-slate-400">Дополнительные детали и примеры...</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm">
                3
              </span>
              Третий раздел
            </h3>
            <div className="pl-8 space-y-2">
              <p className="text-slate-400">Абзац с описанием третьей концепции...</p>
              <p className="text-slate-400">Дополнительные детали и примеры...</p>
            </div>
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
