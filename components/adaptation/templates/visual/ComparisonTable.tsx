import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface TableRow {
  id: string
  concept: string
  definition: string
  signs: string
  example: string
}

interface ComparisonTableProps {
  isEmpty?: boolean
  rows?: TableRow[]
  contentText?: string
}

export function ComparisonTable({ isEmpty = true, rows, contentText }: ComparisonTableProps) {
  const defaultRows: TableRow[] = Array.from({ length: 4 }, (_, i) => ({
    id: `row-${i}`,
    concept: "",
    definition: "",
    signs: "",
    example: "",
  }))

  const displayRows = rows && rows.length > 0 ? rows : defaultRows

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Сравнительная таблица ключевых понятий"
      isEmpty={false}
    >
      {/* Текст от автора */}
      {contentText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{contentText}</p>
        </div>
      )}

      {/* Десктопная версия - таблица */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#E8F4FA]">
              <th className="border border-[#E5E7EB] px-3 py-2 text-left text-sm font-semibold text-[#5589a7]">
                Понятие
              </th>
              <th className="border border-[#E5E7EB] px-3 py-2 text-left text-sm font-semibold text-[#5589a7]">
                Определение
              </th>
              <th className="border border-[#E5E7EB] px-3 py-2 text-left text-sm font-semibold text-[#5589a7]">
                Ключевые признаки
              </th>
              <th className="border border-[#E5E7EB] px-3 py-2 text-left text-sm font-semibold text-[#5589a7]">
                Пример
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => (
              <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-[#F8FAFB]"}>
                <td className="border border-[#E5E7EB] px-3 py-2 text-sm text-slate-600">
                  {isEmpty ? <span className="text-slate-400">Понятие {index + 1}</span> : row.concept}
                </td>
                <td className="border border-[#E5E7EB] px-3 py-2 text-sm text-slate-600">
                  {isEmpty ? (
                    <span className="text-slate-400">Определение...</span>
                  ) : (
                    row.definition
                  )}
                </td>
                <td className="border border-[#E5E7EB] px-3 py-2 text-sm text-slate-600">
                  {isEmpty ? (
                    <span className="text-slate-400">Признаки...</span>
                  ) : (
                    row.signs
                  )}
                </td>
                <td className="border border-[#E5E7EB] px-3 py-2 text-sm text-slate-600">
                  {isEmpty ? <span className="text-slate-400">Пример...</span> : row.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобильная версия - карточки */}
      <div className="lg:hidden space-y-3">
        {displayRows.map((row, index) => (
          <div key={row.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3">
            <div className="mb-2">
              <span className="text-xs font-semibold text-[#5589a7] uppercase">Понятие</span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Понятие {index + 1}</span> : row.concept}
              </p>
            </div>
            <div className="mb-2">
              <span className="text-xs font-semibold text-[#5589a7] uppercase">Определение</span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Определение...</span> : row.definition}
              </p>
            </div>
            <div className="mb-2">
              <span className="text-xs font-semibold text-[#5589a7] uppercase">
                Ключевые признаки
              </span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Признаки...</span> : row.signs}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#5589a7] uppercase">Пример</span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Пример...</span> : row.example}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isEmpty && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: таблица сравнения с 4 колонками (адаптируется под мобильные устройства)
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
