"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
      return <CheckCircleIcon className="w-5 h-5" />
    } else if (pricing.order_index === 1) {
      return <MessageCircleIcon className="w-5 h-5" />
    } else {
      return <StarIcon className="w-5 h-5" />
    }
  }

  // Все карточки одинакового стиля - белый фон с тонкой границей
  const getCardStyle = () => {
    return "bg-white border border-[#E5E7EB] hover:border-[#659AB8] hover:shadow-md"
  }

  return (
    <Card className={`${getCardStyle()} transition-all duration-200`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#E8F4FA] text-[#659AB8]">
            {getIcon()}
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-[#1E293B]">{pricing.name}</CardTitle>
        <div className="mt-4">
          {isFree ? (
            <div className="text-3xl font-bold text-[#659AB8]">Бесплатно</div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-[#1E293B]">{pricing.price}</span>
              <span className="text-lg text-[#64748B] ml-1">₽</span>
            </div>
          )}
        </div>
        {pricing.has_feedback && (
          <Badge className="mt-2 bg-[#E8F4FA] text-[#659AB8] border border-[#659AB8]/30">
            С обратной связью
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-center text-base text-[#64748B] min-h-[60px]">
          {pricing.description}
        </CardDescription>

        {pricing.bonus_content && (
          <div className="p-3 bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg">
            <p className="text-sm text-[#1E293B] font-medium">Бонус:</p>
            <p className="text-sm text-[#64748B]">{pricing.bonus_content}</p>
          </div>
        )}

        <div className="pt-4">
          {isFirstTier ? (
            // Бесплатный тариф
            isFreeAccess ? (
              <Button
                variant="secondary"
                className="w-full bg-[#E8F4FA] text-[#659AB8] border border-[#659AB8]/30 hover:bg-[#E8F4FA]"
                disabled
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                У вас уже есть доступ
              </Button>
            ) : (
              <Button
                onClick={() => onPurchase(pricing.id)}
                disabled={isPurchasing}
                className="w-full bg-[#659AB8] hover:bg-[#5589a7] text-white"
              >
                {isPurchasing ? "Обработка..." : "Получить бесплатно"}
              </Button>
            )
          ) : (
            // Платные тарифы
            isPurchased ? (
              <Button
                variant="secondary"
                className="w-full bg-[#E8F4FA] text-[#659AB8] border border-[#659AB8]/30 hover:bg-[#E8F4FA]"
                disabled
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Куплено
              </Button>
            ) : (
              <Button
                onClick={() => onPurchase(pricing.id)}
                disabled={isPurchasing}
                className="w-full bg-[#659AB8] hover:bg-[#5589a7] text-white"
              >
                {isPurchasing ? "Обработка..." : "Тестовая оплата"}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
