"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  LightbulbIcon,
  EarIcon,
  EyeIcon,
  HandIcon,
  XIcon
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

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-slate-100 text-slate-800 border-slate-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getAdaptationTypeIcon = (type: AdaptationType) => {
    switch (type) {
      case 'auditory':
        return <EarIcon className="w-5 h-5" />
      case 'visual':
        return <EyeIcon className="w-5 h-5" />
      case 'kinesthetic':
        return <HandIcon className="w-5 h-5" />
      default:
        return <LightbulbIcon className="w-5 h-5" />
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
    <Card className="mb-4 border-2 border-slate-300 bg-slate-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getAdaptationTypeIcon(adaptationType)}
            <CardTitle className="text-lg">
              Рекомендации для режима "{getAdaptationTypeName(adaptationType)}"
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {missingMaterials.map((material, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getPriorityColor(material.priority)}`}
            >
              <div className="flex items-center gap-3">
                <LightbulbIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{material.message}</span>
                <Badge 
                  variant="outline" 
                  className={`ml-2 ${getPriorityColor(material.priority)}`}
                >
                  {material.priority === 'high' ? 'Важно' : 
                   material.priority === 'medium' ? 'Желательно' : 'Опционально'}
                </Badge>
              </div>
            </div>
          ))}
          <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-slate-200">
            💡 Эти подсказки носят рекомендательный характер и не блокируют публикацию курса
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

