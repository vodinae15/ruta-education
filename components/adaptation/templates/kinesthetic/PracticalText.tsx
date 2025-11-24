import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Zap, Lightbulb, AlertCircle } from "lucide-react"

interface PracticalTextProps {
  isEmpty?: boolean
  content?: string
}

export function PracticalText({ isEmpty = true, content }: PracticalTextProps) {
  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Практико-ориентированное изложение с акцентом на действия"
      isEmpty={isEmpty}
    >
      {!isEmpty && content ? (
        <div className="prose max-w-none">
          <div className="space-y-6 text-slate-600">{content}</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Блок действий */}
          <div className="bg-[#E8F4FA] border-l-4 border-[#659AB8] rounded-r-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Что нужно сделать:
                </h4>
                <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                  <li>Первое практическое действие или шаг</li>
                  <li>Второе практическое действие или шаг</li>
                  <li>Третье практическое действие или шаг</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Текстовый блок */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Концепция 1: Практический подход
              </h3>
              <p className="text-slate-400 mb-3">
                Описание концепции с акцентом на практическое применение...
              </p>
              <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-[#659AB8] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400">
                    <strong>Пример применения:</strong> Конкретный пример использования в реальной ситуации
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Концепция 2: Практический подход
              </h3>
              <p className="text-slate-400 mb-3">
                Описание концепции с акцентом на практическое применение...
              </p>
              <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-[#659AB8] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400">
                    <strong>Пример применения:</strong> Конкретный пример использования в реальной ситуации
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Важное замечание */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#659AB8] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Важно помнить:</h4>
                <p className="text-sm text-slate-400">
                  Ключевой момент или предостережение при практическом применении...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
