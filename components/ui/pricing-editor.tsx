"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, MessageCircleIcon, StarIcon } from "@/components/ui/icons"
import { Checkbox } from "@/components/ui/checkbox"

interface Pricing {
  id: string
  name: string
  price: number
  description: string
  has_feedback: boolean
  bonus_content?: string | null
  is_default: boolean
  order_index: number
}

interface PricingEditorProps {
  pricing: Pricing
  onUpdate: (pricingId: string, updates: Partial<Pricing>) => Promise<void>
  isUpdating: boolean
}

export function PricingEditor({ pricing, onUpdate, isUpdating }: PricingEditorProps) {
  const [name, setName] = useState(pricing.name)
  const [price, setPrice] = useState(pricing.price.toString())
  const [description, setDescription] = useState(pricing.description || "")
  const [bonusContent, setBonusContent] = useState(pricing.bonus_content || "")
  const [hasFeedback, setHasFeedback] = useState(pricing.has_feedback)

  const isFree = pricing.is_default && pricing.price === 0
  const isFirstTier = pricing.order_index === 0

  // Синхронизируем состояние при изменении pricing
  useEffect(() => {
    setName(pricing.name)
    setPrice(pricing.price.toString())
    setDescription(pricing.description || "")
    setBonusContent(pricing.bonus_content || "")
    setHasFeedback(pricing.has_feedback)
  }, [pricing])

  const handleSave = async () => {
    const updates: Partial<Pricing> = {
      name: name.trim(),
      price: parseFloat(price) || 0,
      description: description.trim(),
      has_feedback: hasFeedback,
    }

    // Бонусный контент только для премиум тарифа (order_index === 2)
    if (pricing.order_index === 2) {
      updates.bonus_content = bonusContent.trim() || null
    }

    await onUpdate(pricing.id, updates)
  }

  const getIcon = () => {
    if (isFirstTier) {
      return <CheckCircleIcon className="w-5 h-5" />
    } else if (pricing.order_index === 1) {
      return <MessageCircleIcon className="w-5 h-5" />
    } else {
      return <StarIcon className="w-5 h-5" />
    }
  }

  const getCardStyle = () => {
    return "border-2 border-[#CDE6F9] bg-[#F3FAFE]"
  }

  return (
    <Card className={`${getCardStyle()} transition-all duration-200`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#CDE6F9] text-[#659AB8]">
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-[#1E293B]">{pricing.name}</CardTitle>
              {pricing.has_feedback && (
                <Badge className="mt-1 bg-green-100 text-green-800 border-green-200 text-xs">
                  С обратной связью
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`name-${pricing.id}`} className="text-sm font-medium text-slate-700">
            Название тарифа
          </Label>
          <Input
            id={`name-${pricing.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название тарифа"
            className="mt-1"
            disabled={isUpdating}
          />
        </div>

        <div>
          <Label htmlFor={`price-${pricing.id}`} className="text-sm font-medium text-slate-700">
            Цена (₽)
          </Label>
          <Input
            id={`price-${pricing.id}`}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="mt-1"
            disabled={isFree || isUpdating}
          />
          {isFree && (
            <p className="text-xs text-slate-500 mt-1">Бесплатный тариф (цена не изменяется)</p>
          )}
        </div>

        <div>
          <Label htmlFor={`description-${pricing.id}`} className="text-sm font-medium text-slate-700">
            Описание
          </Label>
          <Textarea
            id={`description-${pricing.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание тарифа"
            className="mt-1"
            rows={3}
            disabled={isUpdating}
          />
        </div>

        {/* Чекбокс для обратной связи (недоступен для бесплатного тарифа) */}
        {!isFirstTier && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`feedback-${pricing.id}`}
              checked={hasFeedback}
              onCheckedChange={(checked) => setHasFeedback(checked as boolean)}
              disabled={isUpdating}
            />
            <Label
              htmlFor={`feedback-${pricing.id}`}
              className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <MessageCircleIcon className="w-4 h-4 text-[#5589a7]" />
              Обратная связь от автора
            </Label>
          </div>
        )}

        {pricing.order_index === 2 && (
          <div>
            <Label htmlFor={`bonus-${pricing.id}`} className="text-sm font-medium text-slate-700">
              Бонусный контент (для премиум тарифа)
            </Label>
            <Textarea
              id={`bonus-${pricing.id}`}
              value={bonusContent}
              onChange={(e) => setBonusContent(e.target.value)}
              placeholder="Опишите дополнительные материалы или бонусы"
              className="mt-1"
              rows={2}
              disabled={isUpdating}
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isUpdating || !name.trim()}
          className="w-full bg-[#659AB8] hover:bg-[#5a8ba8] text-white"
        >
          {isUpdating ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </CardContent>
    </Card>
  )
}

