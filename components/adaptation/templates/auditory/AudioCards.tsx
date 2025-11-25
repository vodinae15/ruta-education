"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Play, Pause, Volume2 } from "lucide-react"

interface AudioCardData {
  id: string
  term: string
  audioUrl: string
  duration?: number
}

interface AudioCardsProps {
  isEmpty?: boolean
  cards?: AudioCardData[]
  contentText?: string
  mainText?: string
}

function AudioCard({
  term,
  audioUrl,
  isEmpty,
}: {
  term: string
  audioUrl: string
  isEmpty: boolean
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:border-[#659AB8] transition-colors duration-200">
      {/* Термин */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#E8F4FA] rounded-full flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-[#659AB8]" />
        </div>
        <h4 className="font-semibold text-slate-900">
          {isEmpty ? "Термин или концепция" : term}
        </h4>
      </div>

      {/* Аудио плеер */}
      <div className="bg-[#F8FAFB] rounded-lg p-3">
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center hover:bg-[#5589a7] transition-colors duration-200"
            disabled={isEmpty}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          {/* Прогресс бар */}
          <div className="flex-1">
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div
                className="bg-[#659AB8] h-2 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-600">
                {isEmpty ? "0:00" : "0:00"}
              </span>
              <span className="text-xs text-slate-600">
                {isEmpty ? "0:00" : "2:30"}
              </span>
            </div>
          </div>
        </div>

        {isEmpty && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            Аудио-объяснение термина
          </p>
        )}
      </div>
    </div>
  )
}

export function AudioCards({ isEmpty = true, cards, contentText, mainText }: AudioCardsProps) {
  const defaultCards: AudioCardData[] = Array.from({ length: 6 }, (_, i) => ({
    id: `audio-card-${i}`,
    term: "",
    audioUrl: "",
    duration: 0,
  }))

  const displayCards = cards && cards.length > 0 ? cards : defaultCards

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Аудио-объяснения ключевых терминов и концепций"
      isEmpty={false}
      mainText={mainText}
    >
      {/* Текст от автора */}
      {contentText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{contentText}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayCards.map((card) => (
          <AudioCard
            key={card.id}
            term={card.term}
            audioUrl={card.audioUrl}
            isEmpty={isEmpty}
          />
        ))}
      </div>

      {isEmpty && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: 6 аудио-карточек с терминами и их аудио-объяснениями
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
