"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface FlipCardData {
  id: string
  front: string
  back: string
}

interface FlipCardsProps {
  isEmpty?: boolean
  cards?: FlipCardData[]
}

function FlipCard({ front, back, isEmpty }: { front: string; back: string; isEmpty: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      className="relative h-32 cursor-pointer perspective-1000"
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
          <div className="w-full h-full bg-[#E8F4FA] border-2 border-[#659AB8] rounded-lg p-4 flex items-center justify-center">
            <p className="text-center text-base font-semibold text-slate-900">
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
          <div className="w-full h-full bg-[#659AB8] rounded-lg p-4 flex items-center justify-center">
            <p className="text-center text-sm text-white">
              {isEmpty ? "Объяснение термина появится здесь" : back}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FlipCards({ isEmpty = true, cards }: FlipCardsProps) {
  const defaultCards: FlipCardData[] = Array.from({ length: 6 }, (_, i) => ({
    id: `card-${i}`,
    front: "",
    back: "",
  }))

  const displayCards = cards && cards.length > 0 ? cards : defaultCards

  return (
    <BlockWrapper
      blockNumber={1}
      title="Обзор темы"
      intro={isEmpty ? "Нажмите на карточку, чтобы перевернуть её" : undefined}
      isEmpty={false}
    >
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

      {isEmpty && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: 6 интерактивных флип-карточек. Нажмите на карточку, чтобы увидеть объяснение.
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
