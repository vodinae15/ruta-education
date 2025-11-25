"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Trash2, Plus } from "lucide-react"

interface FlipCardData {
  id: string
  front: string
  back: string
}

interface FlipCardsProps {
  isEmpty?: boolean
  cards?: FlipCardData[]
  introText?: string
  mainText?: string
  isEditing?: boolean
  onCardsChange?: (cards: FlipCardData[]) => void
  onMainTextChange?: (text: string) => void
}

function FlipCard({ front, back, isEmpty }: { front: string; back: string; isEmpty: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      className="relative h-24 cursor-pointer perspective-1000"
      onClick={() => !isEmpty && setIsFlipped(!isFlipped)}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Лицевая сторона */}
        <div
          className="absolute w-full h-full backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-full h-full bg-[#E8F4FA] border-2 border-[#659AB8] rounded-lg p-3 flex items-center justify-center">
            <p className="text-center text-sm font-semibold text-slate-900">
              {isEmpty ? "Термин" : front}
            </p>
          </div>
        </div>

        {/* Обратная сторона */}
        <div
          className="absolute w-full h-full backface-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="w-full h-full bg-[#659AB8] rounded-lg p-3 flex items-center justify-center">
            <p className="text-center text-xs text-white">
              {isEmpty ? "Объяснение термина появится здесь" : back}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FlipCards({ isEmpty = true, cards, introText, mainText, isEditing = false, onCardsChange, onMainTextChange }: FlipCardsProps) {
  const defaultCards: FlipCardData[] = Array.from({ length: 6 }, (_, i) => ({
    id: `card-${i}`,
    front: "",
    back: "",
  }))

  const displayCards = cards && cards.length > 0 ? cards : defaultCards
  const [localCards, setLocalCards] = useState<FlipCardData[]>(displayCards)

  const handleCardChange = (id: string, field: 'front' | 'back', value: string) => {
    const updated = localCards.map(card =>
      card.id === id ? { ...card, [field]: value } : card
    )
    setLocalCards(updated)
    onCardsChange?.(updated)
  }

  const handleAddCard = () => {
    const newCard: FlipCardData = {
      id: `card-${Date.now()}`,
      front: "",
      back: ""
    }
    const updated = [...localCards, newCard]
    setLocalCards(updated)
    onCardsChange?.(updated)
  }

  const handleRemoveCard = (id: string) => {
    const updated = localCards.filter(card => card.id !== id)
    setLocalCards(updated)
    onCardsChange?.(updated)
  }

  return (
    <BlockWrapper
      blockNumber={1}
      title="Обзор темы"
      intro={isEmpty ? "Нажмите на карточку, чтобы перевернуть её" : undefined}
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      {/* Текст от автора */}
      {introText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{introText}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          {localCards.map((card, index) => (
            <div key={card.id} className="border-2 border-[#659AB8] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Карточка {index + 1}</h4>
                {localCards.length > 1 && (
                  <button
                    onClick={() => handleRemoveCard(card.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Лицевая сторона (термин/вопрос)
                  </label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => handleCardChange(card.id, 'front', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#659AB8]"
                    placeholder="Введите термин или вопрос"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Обратная сторона (объяснение)
                  </label>
                  <textarea
                    value={card.back}
                    onChange={(e) => handleCardChange(card.id, 'back', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#659AB8] min-h-[80px]"
                    placeholder="Введите объяснение или ответ"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddCard}
            className="w-full py-3 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить карточку
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCards.map((card) => (
            <FlipCard
              key={card.id}
              front={card.front}
              back={card.back}
              isEmpty={isEmpty}
            />
          ))}
        </div>
      )}

      {isEmpty && !isEditing && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: 6 интерактивных флип-карточек. Нажмите на карточку, чтобы увидеть объяснение.
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
