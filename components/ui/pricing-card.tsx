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
      return <CheckCircleIcon className="w-6 h-6" />
    } else if (pricing.order_index === 1) {
      return <MessageCircleIcon className="w-6 h-6" />
    } else {
      return <StarIcon className="w-6 h-6" />
    }
  }

  // Определяем цвет для тарифа (все тарифы одинаковые)
  const getCardStyle = () => {
    return "border-2 border-[#CDE6F9] bg-[#F3FAFE]"
  }

  return (
    <Card className={`${getCardStyle()} transition-all duration-200`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#CDE6F9] text-[#659AB8]">
            {getIcon()}
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-[#1E293B]">{pricing.name}</CardTitle>
        <div className="mt-4">
          {isFree ? (
            <div className="text-3xl font-bold text-[#659AB8]">Бесплатно</div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-[#1E293B]">{pricing.price}</span>
              <span className="text-lg text-slate-600 ml-1">₽</span>
            </div>
          )}
        </div>
        {pricing.has_feedback && (
          <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
            С обратной связью
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-center text-base text-slate-700 min-h-[60px]">
          {pricing.description}
        </CardDescription>

        {pricing.bonus_content && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900 font-medium">Бонус:</p>
            <p className="text-sm text-yellow-800">{pricing.bonus_content}</p>
          </div>
        )}

        <div className="pt-4">
          {isFirstTier ? (
            // Бесплатный тариф
            isFreeAccess ? (
              <Button
                variant="secondary"
                className="w-full bg-green-50 text-green-800 border-green-200 hover:bg-green-100"
                disabled
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                У вас уже есть доступ
              </Button>
            ) : (
              <Button
                onClick={() => onPurchase(pricing.id)}
                disabled={isPurchasing}
                className="w-full bg-[#659AB8] hover:bg-[#5a8ba8] text-white"
              >
                {isPurchasing ? "Обработка..." : "Получить бесплатно"}
              </Button>
            )
          ) : (
            // Платные тарифы
            isPurchased ? (
              <Button
                variant="secondary"
                className="w-full bg-green-50 text-green-800 border-green-200 hover:bg-green-100"
                disabled
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Куплено
              </Button>
            ) : (
              <Button
                onClick={() => onPurchase(pricing.id)}
                disabled={isPurchasing}
                className="w-full bg-[#659AB8] hover:bg-[#5a8ba8] text-white"
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

