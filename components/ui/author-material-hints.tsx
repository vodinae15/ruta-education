"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LightbulbIcon,
  EarIcon,
  EyeIcon,
  HandIcon
} from "@/components/ui/icons"
import { AdaptationType } from "@/lib/adaptation-logic"

interface AuthorMaterialHintsProps {
  adaptationType: AdaptationType
  missingMaterials: Array<{
    type: string
    message: string
    priority: 'low' | 'medium' | 'high'
  }>
  lessonId: string
  onNavigateToConstructor?: () => void
}

export function AuthorMaterialHints({
  adaptationType,
  missingMaterials,
  lessonId,
  onNavigateToConstructor
}: AuthorMaterialHintsProps) {
  if (missingMaterials.length === 0) {
    return null
  }

  const getAdaptationTypeIcon = (type: AdaptationType) => {
    switch (type) {
      case 'auditory':
        return <EarIcon className="w-5 h-5 text-[#5589a7]" />
      case 'visual':
        return <EyeIcon className="w-5 h-5 text-[#5589a7]" />
      case 'kinesthetic':
        return <HandIcon className="w-5 h-5 text-[#5589a7]" />
      default:
        return <LightbulbIcon className="w-5 h-5 text-[#5589a7]" />
    }
  }

  const getAdaptationTypeName = (type: AdaptationType) => {
    switch (type) {
      case 'auditory':
        return 'Аудиал'
      case 'visual':
        return 'Визуал'
      case 'kinesthetic':
        return 'Кинестетик'
      default:
        return 'Адаптация'
    }
  }

  return (
    <Card className="mb-4 border bg-[#FDF8F3]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {getAdaptationTypeIcon(adaptationType)}
          <CardTitle className="text-lg text-[#5589a7]">
            Рекомендации для режима «{getAdaptationTypeName(adaptationType)}»
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {missingMaterials.map((material, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#E5E7EB]"
            >
              <LightbulbIcon className="w-5 h-5 flex-shrink-0 text-[#5589a7] mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900">{material.message}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                  material.priority === 'high'
                    ? 'bg-[#659AB8] text-white'
                    : 'bg-[#E8F4FA] text-[#5589a7]'
                }`}>
                  {material.priority === 'high' ? 'Важно' :
                   material.priority === 'medium' ? 'Желательно' : 'Опционально'}
                </span>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-[#E5E7EB]">
            Эти подсказки носят рекомендательный характер и не блокируют публикацию курса
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
