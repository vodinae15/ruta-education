"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { HandIcon, CheckIcon } from "@/components/ui/icons"

interface ChecklistProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

export function Checklist({ data, description, onInteraction }: ChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const handleToggle = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setCheckedItems(newChecked)
    onInteraction?.('checklist_item_toggle', { itemId, checked: newChecked.has(itemId), allChecked: newChecked })
  }

  const items = data?.items || data || []
  const allChecked = items.length > 0 && checkedItems.size === items.length

  return (
    <Card className="bg-white border-2 border-purple-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-purple-700">
            <HandIcon className="w-5 h-5" />
            <span className="font-semibold">Чек-лист</span>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 italic">{description}</p>
          )}

          {data?.title && (
            <h4 className="text-lg font-semibold text-gray-900">{data.title}</h4>
          )}

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="space-y-3">
              {items.map((item: any, index: number) => {
                const itemId = item.id || item.item || `item-${index}`
                const itemText = item.text || item.item || item.label || item
                const isChecked = checkedItems.has(itemId)

                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors cursor-pointer"
                    onClick={() => handleToggle(itemId)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(itemId)}
                      className="border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                    />
                    <span className={`flex-1 text-sm ${isChecked ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                      {itemText}
                    </span>
                    {isChecked && (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                )
              })}
            </div>

            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-sm text-gray-600">
                  Выполнено: {checkedItems.size} из {items.length}
                </p>
                {allChecked && (
                  <p className="text-sm text-green-600 font-semibold mt-2">
                    ✅ Все задачи выполнены!
                  </p>
                )}
              </div>
            )}

            {items.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Нет задач в чек-листе
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

