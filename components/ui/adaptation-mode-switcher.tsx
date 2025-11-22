"use client"

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
}> = [
  {
    id: 'visual',
    name: 'Визуал',
    description: 'Схемы, диаграммы, структурированная информация',
    icon: <EyeIcon className="w-4 h-4" />
  },
  {
    id: 'auditory',
    name: 'Аудиал',
    description: 'Истории, диалоги, эмоциональные примеры',
    icon: <EarIcon className="w-4 h-4" />
  },
  {
    id: 'kinesthetic',
    name: 'Кинестетик',
    description: 'Практика, действия, интерактивные элементы',
    icon: <HandIcon className="w-4 h-4" />
  },
  {
    id: 'original',
    name: 'Оригинал',
    description: 'Оригинальный контент автора',
    icon: <BookOpenIcon className="w-4 h-4" />
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
  const modesToShow = MODES.filter(mode => availableModes.includes(mode.id))

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
      <button
        key={mode.id}
        onClick={() => onModeChange(mode.id)}
        className={cn(
          "px-6 py-3 rounded-md font-medium transition-colors duration-200 flex items-center gap-2",
          isActive
            ? "bg-white text-[#5589a7]"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        {mode.icon}
        <span>{mode.name}</span>
      </button>
    )

    if (showTooltips) {
      return (
        <Tooltip key={mode.id}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold mb-1">{mode.name}</p>
            <p className="text-xs text-slate-600">{mode.description}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return buttonContent
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("bg-light-gray rounded-lg p-1 flex flex-wrap", className)}>
        {modesToShow.map((mode) => {
          const isActive = currentMode === mode.id
          const isRecommended = recommendedMode === mode.id && currentMode !== mode.id
          return renderButton(mode, isActive, isRecommended)
        })}
      </div>
    </TooltipProvider>
  )
}
