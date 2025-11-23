"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircleIcon, MessageCircleIcon, StarIcon } from "@/components/ui/icons"

interface PricingCardProps {
  pricing: {
    id: string
    name: string
    price: number
    description: string
    has_feedback: boolean
    bonus_content?: string | null
    is_default: boolean
    order_index: number
  }
  isPurchased: boolean
  isFreeAccess: boolean
  onPurchase: (pricingId: string) => void
  isPurchasing: boolean
}

export function PricingCard({ pricing, isPurchased, isFreeAccess, onPurchase, isPurchasing }: PricingCardProps) {
  const isFree = pricing.price === 0 && pricing.is_default
  const isFirstTier = pricing.order_index === 0

  // Определяем иконку для тарифа
  const getIcon = () => {
    if (isFirstTier) {
      return <CheckCircleIcon className="w-7 h-7 text-white" />
    } else if (pricing.order_index === 1) {
      return <MessageCircleIcon className="w-7 h-7 text-white" />
    } else {
      return <StarIcon className="w-7 h-7 text-white" />
    }
  }

  return (
    <Card className="text-center border h-full flex flex-col">
      <CardHeader className="pb-4">
        {/* Иконка */}
        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          {getIcon()}
        </div>

        {/* Название тарифа */}
        <CardTitle className="text-lg text-[#5589a7]">{pricing.name}</CardTitle>

        {/* Цена - фиксированная высота для выравнивания */}
        <div className="h-12 flex items-center justify-center mt-2">
          {isFree ? (
            <div className="text-3xl font-bold text-[#5589a7]">Бесплатно</div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-[#5589a7]">{pricing.price}</span>
              <span className="text-sm text-slate-600 ml-1">₽</span>
            </div>
          )}
        </div>

        {/* Плашка обратной связи - фиксированная высота */}
        <div className="h-8 flex items-center justify-center">
          {pricing.has_feedback && (
            <span className="bg-[#FDF8F3] text-sm text-slate-600 px-3 py-1 rounded border border-[#E5E7EB]">
              С обратной связью
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="text-sm text-slate-600 text-center flex-1 flex flex-col">
        {/* Описание - фиксированная высота */}
        <div className="h-16 mb-4">
          <p>{pricing.description}</p>
        </div>

        {/* Бонусный контент - фиксированная высота */}
        <div className="h-20 mb-4">
          {pricing.bonus_content && (
            <div className="p-3 bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg text-left">
              <p className="text-xs font-medium text-slate-900">Бонус:</p>
              <p className="text-xs text-slate-600">{pricing.bonus_content}</p>
            </div>
          )}
        </div>

        {/* Кнопка - всегда внизу */}
        <div className="mt-auto">
          {isFirstTier ? (
            isFreeAccess ? (
              <button
                className="w-full bg-[#FDF8F3] text-slate-600 px-6 py-3 border border-[#E5E7EB] rounded-lg text-sm font-semibold"
                disabled
              >
                У вас уже есть доступ
              </button>
            ) : (
              <button
                onClick={() => onPurchase(pricing.id)}
                disabled={isPurchasing}
                className="w-full bg-[#659AB8] text-white px-6 py-3 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50"
              >
                {isPurchasing ? "Обработка..." : "Получить бесплатно"}
              </button>
            )
          ) : (
            isPurchased ? (
              <button
                className="w-full bg-[#FDF8F3] text-slate-600 px-6 py-3 border border-[#E5E7EB] rounded-lg text-sm font-semibold"
                disabled
              >
                Куплено
              </button>
            ) : (
              <button
                onClick={() => onPurchase(pricing.id)}
                disabled={isPurchasing}
                className="w-full bg-[#659AB8] text-white px-6 py-3 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7] disabled:opacity-50"
              >
                {isPurchasing ? "Обработка..." : "Купить"}
              </button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
