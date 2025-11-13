"use client"

import { Button } from "@/components/ui/button"
import { EyeIcon, EarIcon, HandIcon, BookOpenIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type AdaptationMode = 'visual' | 'auditory' | 'kinesthetic' | 'original'

interface AdaptationModeSwitcherProps {
  currentMode: AdaptationMode
  onModeChange: (mode: AdaptationMode) => void
  availableModes?: AdaptationMode[]
  studentType?: string
  className?: string
  showTooltips?: boolean
}

const MODES: Array<{
  id: AdaptationMode
  name: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}> = [
  {
    id: 'visual',
    name: 'Визуал',
    description: 'Схемы, диаграммы, структурированная информация',
    icon: <EyeIcon className="w-5 h-5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500'
  },
  {
    id: 'auditory',
    name: 'Аудиал',
    description: 'Истории, диалоги, эмоциональные примеры',
    icon: <EarIcon className="w-5 h-5" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500'
  },
  {
    id: 'kinesthetic',
    name: 'Кинестетик',
    description: 'Практика, действия, интерактивные элементы',
    icon: <HandIcon className="w-5 h-5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500'
  },
  {
    id: 'original',
    name: 'Оригинал',
    description: 'Оригинальный контент автора',
    icon: <BookOpenIcon className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-500'
  }
]

export function AdaptationModeSwitcher({
  currentMode,
  onModeChange,
  availableModes = ['visual', 'auditory', 'kinesthetic', 'original'],
  studentType,
  className,
  showTooltips = true
}: AdaptationModeSwitcherProps) {
  // Фильтруем режимы по доступным
  const modesToShow = MODES.filter(mode => availableModes.includes(mode.id))

  // Определяем рекомендуемый режим на основе режима представления материала
  const getRecommendedMode = (): AdaptationMode | null => {
    if (!studentType) return null
    
    if (studentType.includes('visual')) return 'visual'
    if (studentType.includes('auditory')) return 'auditory'
    if (studentType.includes('kinesthetic')) return 'kinesthetic'
    
    return null
  }

  const recommendedMode = getRecommendedMode()

  const renderButton = (mode: typeof MODES[0], isActive: boolean, isRecommended: boolean) => {
    const buttonContent = (
      <Button
        key={mode.id}
        variant={isActive ? "primary" : "secondary"}
        onClick={() => onModeChange(mode.id)}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
          isActive
            ? `${mode.bgColor} ${mode.color} border-2 ${mode.borderColor} font-semibold`
            : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300",
          isRecommended && !isActive && "ring-2 ring-yellow-400 ring-offset-2"
        )}
      >
        {mode.icon}
        <span>{mode.name}</span>
        {isRecommended && !isActive && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
        )}
      </Button>
    )

    if (showTooltips) {
      return (
        <Tooltip key={mode.id}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold mb-1">{mode.name}</p>
            <p className="text-xs text-gray-600">{mode.description}</p>
            {isRecommended && !isActive && (
              <p className="text-xs text-yellow-600 mt-1">💡 Рекомендуется для вашего режима представления материала</p>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return buttonContent
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {modesToShow.map((mode) => {
          const isActive = currentMode === mode.id
          const isRecommended = recommendedMode === mode.id && currentMode !== mode.id
          return renderButton(mode, isActive, isRecommended)
        })}
      </div>
    </TooltipProvider>
  )
}

