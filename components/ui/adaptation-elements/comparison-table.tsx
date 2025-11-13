"use client"

import { Card, CardContent } from "@/components/ui/card"

interface ComparisonTableProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

export function ComparisonTable({ data, description, onInteraction }: ComparisonTableProps) {
  // Если данные - это таблица с колонками
  if (data?.columns && data?.rows) {
    return (
      <Card className="bg-white border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold">Сравнительная таблица</span>
            </div>
            
            {description && (
              <p className="text-sm text-gray-600 italic">{description}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-blue-50">
                    {data.columns.map((column: string, index: number) => (
                      <th
                        key={index}
                        className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows
                    .filter((row: any) => row !== null && row !== undefined)
                    .map((row: any, rowIndex: number) => {
                      // Проверяем, является ли row массивом
                      if (Array.isArray(row)) {
                        return (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell: any, cellIndex: number) => (
                        <td
                          key={cellIndex}
                          className="border border-gray-300 px-4 py-2 text-gray-700"
                        >
                                {cell ?? ''}
                        </td>
                      ))}
                    </tr>
                        )
                      }
                      
                      // Если row - это объект, преобразуем его в массив значений
                      if (typeof row === 'object' && row !== null) {
                        const rowValues = data.columns.map((col: string) => row[col] ?? '')
                        return (
                          <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {rowValues.map((cell: any, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="border border-gray-300 px-4 py-2 text-gray-700"
                              >
                                {cell ?? ''}
                              </td>
                            ))}
                          </tr>
                        )
                      }
                      
                      // Fallback для других типов
                      return null
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Если данные - это пары понятий
  if (data?.pairs || Array.isArray(data)) {
    const pairs = data?.pairs || data
    return (
      <Card className="bg-white border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold">Сравнительная таблица</span>
            </div>
            
            {description && (
              <p className="text-sm text-gray-600 italic">{description}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                      Понятие
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                      Определение
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair: any, index: number) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-4 py-2 text-gray-700 font-medium">
                        {pair.left || pair.concept || pair.term}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        {pair.right || pair.definition || pair.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Fallback для других форматов
  return (
    <Card className="bg-white border-2 border-blue-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold">Сравнительная таблица</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {description || JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

