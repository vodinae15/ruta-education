import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Trash2, Plus } from "lucide-react"

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
  mainText?: string
  isEditing?: boolean
  onRowsChange?: (rows: TableRow[]) => void
  onMainTextChange?: (text: string) => void
}

export function ComparisonTable({ isEmpty = true, rows, contentText, mainText, isEditing = false, onRowsChange, onMainTextChange }: ComparisonTableProps) {
  const defaultRows: TableRow[] = Array.from({ length: 4 }, (_, i) => ({
    id: `row-${i}`,
    concept: "",
    definition: "",
    signs: "",
    example: "",
  }))

  const displayRows = rows && rows.length > 0 ? rows : defaultRows
  const [localRows, setLocalRows] = useState<TableRow[]>(displayRows)

  const handleRowChange = (id: string, field: keyof TableRow, value: string) => {
    const updated = localRows.map(r => r.id === id ? { ...r, [field]: value } : r)
    setLocalRows(updated)
    onRowsChange?.(updated)
  }

  const handleAddRow = () => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      concept: "",
      definition: "",
      signs: "",
      example: ""
    }
    const updated = [...localRows, newRow]
    setLocalRows(updated)
    onRowsChange?.(updated)
  }

  const handleRemoveRow = (id: string) => {
    const updated = localRows.filter(r => r.id !== id)
    setLocalRows(updated)
    onRowsChange?.(updated)
  }

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Сравнительная таблица ключевых понятий"
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      {/* Текст от автора */}
      {contentText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{contentText}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          {localRows.map((row, index) => (
            <div key={row.id} className="border-2 border-[#659AB8] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Строка {index + 1}</h4>
                {localRows.length > 1 && (
                  <button
                    onClick={() => handleRemoveRow(row.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Понятие</label>
                  <input
                    type="text"
                    value={row.concept}
                    onChange={(e) => handleRowChange(row.id, 'concept', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7]"
                    placeholder="Введите понятие"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Определение</label>
                  <textarea
                    value={row.definition}
                    onChange={(e) => handleRowChange(row.id, 'definition', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7] min-h-[60px]"
                    placeholder="Введите определение"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ключевые признаки</label>
                  <textarea
                    value={row.signs}
                    onChange={(e) => handleRowChange(row.id, 'signs', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7] min-h-[60px]"
                    placeholder="Введите ключевые признаки"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Пример</label>
                  <textarea
                    value={row.example}
                    onChange={(e) => handleRowChange(row.id, 'example', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7] min-h-[60px]"
                    placeholder="Введите пример"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddRow}
            className="w-full py-3 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить строку
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}

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
