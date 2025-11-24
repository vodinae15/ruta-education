import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface TableRow {
  id: string
  concept: string
  definition: string
  features: string
  example: string
}

interface ComparisonTableProps {
  isEmpty?: boolean
  rows?: TableRow[]
}

export function ComparisonTable({ isEmpty = true, rows }: ComparisonTableProps) {
  const defaultRows: TableRow[] = Array.from({ length: 4 }, (_, i) => ({
    id: `row-${i}`,
    concept: "",
    definition: "",
    features: "",
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
      {/* Десктопная версия - таблица */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#E8F4FA]">
              <th className="border border-[#E5E7EB] px-4 py-3 text-left text-sm font-semibold text-[#5589a7]">
                Понятие
              </th>
              <th className="border border-[#E5E7EB] px-4 py-3 text-left text-sm font-semibold text-[#5589a7]">
                Определение
              </th>
              <th className="border border-[#E5E7EB] px-4 py-3 text-left text-sm font-semibold text-[#5589a7]">
                Ключевые признаки
              </th>
              <th className="border border-[#E5E7EB] px-4 py-3 text-left text-sm font-semibold text-[#5589a7]">
                Пример
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => (
              <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-[#F8FAFB]"}>
                <td className="border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600">
                  {isEmpty ? <span className="text-slate-400">Понятие {index + 1}</span> : row.concept}
                </td>
                <td className="border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600">
                  {isEmpty ? (
                    <span className="text-slate-400">Определение...</span>
                  ) : (
                    row.definition
                  )}
                </td>
                <td className="border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600">
                  {isEmpty ? (
                    <span className="text-slate-400">Признаки...</span>
                  ) : (
                    row.features
                  )}
                </td>
                <td className="border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600">
                  {isEmpty ? <span className="text-slate-400">Пример...</span> : row.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобильная версия - карточки */}
      <div className="lg:hidden space-y-4">
        {displayRows.map((row, index) => (
          <div key={row.id} className="bg-white border border-[#E5E7EB] rounded-lg p-4">
            <div className="mb-3">
              <span className="text-xs font-semibold text-[#5589a7] uppercase">Понятие</span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Понятие {index + 1}</span> : row.concept}
              </p>
            </div>
            <div className="mb-3">
              <span className="text-xs font-semibold text-[#5589a7] uppercase">Определение</span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Определение...</span> : row.definition}
              </p>
            </div>
            <div className="mb-3">
              <span className="text-xs font-semibold text-[#5589a7] uppercase">
                Ключевые признаки
              </span>
              <p className="text-sm text-slate-600 mt-1">
                {isEmpty ? <span className="text-slate-400">Признаки...</span> : row.features}
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
