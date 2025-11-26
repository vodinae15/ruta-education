"use client"

import React, { useState, useRef } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Play, Pause, Volume2, Trash2, Plus } from "lucide-react"
import { AudioUploadV2 } from "@/components/ui/audio-upload-v2"

interface AudioCardData {
  id: string
  term: string
  audioUrl: string
  audioFileId?: string
  duration?: number
}

interface AudioCardsProps {
  isEmpty?: boolean
  cards?: AudioCardData[]
  audioCards?: AudioCardData[] // Альтернативное имя для совместимости
  contentText?: string
  mainText?: string
  isEditing?: boolean
  onCardsChange?: (cards: AudioCardData[]) => void
  onAudioCardsChange?: (cards: AudioCardData[]) => void // Альтернативное имя для совместимости
  onMainTextChange?: (text: string) => void
  courseId?: string
  lessonId?: string
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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handlePlayPause = () => {
    if (!audioUrl || isEmpty) return

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (audioRef.current.duration) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
      }
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  return (
    <div className="bg-white border border-[#659AB8] rounded-lg p-4">
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
            onClick={handlePlayPause}
            className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center hover:bg-[#5589a7] transition-colors duration-200"
            disabled={isEmpty || !audioUrl}
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
                {formatTime(currentTime)}
              </span>
              <span className="text-xs text-slate-600">
                {duration > 0 ? formatTime(duration) : "0:00"}
              </span>
            </div>
          </div>
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false)
              setProgress(0)
              setCurrentTime(0)
            }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="hidden"
          />
        )}

        {isEmpty && !audioUrl && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            Аудио-объяснение термина
          </p>
        )}
      </div>
    </div>
  )
}

export function AudioCards({
  isEmpty = true,
  cards,
  audioCards,
  contentText,
  mainText,
  isEditing = false,
  onCardsChange,
  onAudioCardsChange,
  onMainTextChange,
  courseId = "",
  lessonId = ""
}: AudioCardsProps) {
  const defaultCards: AudioCardData[] = Array.from({ length: 6 }, (_, i) => ({
    id: `audio-card-${i}`,
    term: "",
    audioUrl: "",
    duration: 0,
  }))

  // Поддержка обоих имен пропсов
  const initialCards = cards || audioCards
  const handleCardsChange = onCardsChange || onAudioCardsChange

  const displayCards = initialCards && initialCards.length > 0 ? initialCards : defaultCards
  const [localCards, setLocalCards] = useState<AudioCardData[]>(displayCards)

  const handleCardChange = (id: string, field: keyof AudioCardData, value: string | number) => {
    const updated = localCards.map(card =>
      card.id === id ? { ...card, [field]: value } : card
    )
    setLocalCards(updated)
    handleCardsChange?.(updated)
  }

  const handleAudioUpload = (cardId: string, fileId: string, fileUrl: string, fileName: string) => {
    const updated = localCards.map(card =>
      card.id === cardId ? { ...card, audioUrl: fileUrl, audioFileId: fileId } : card
    )
    setLocalCards(updated)
    handleCardsChange?.(updated)
  }

  const handleAddCard = () => {
    const newCard: AudioCardData = {
      id: `audio-card-${Date.now()}`,
      term: "",
      audioUrl: "",
      duration: 0
    }
    const updated = [...localCards, newCard]
    setLocalCards(updated)
    handleCardsChange?.(updated)
  }

  const handleRemoveCard = (id: string) => {
    const updated = localCards.filter(card => card.id !== id)
    setLocalCards(updated)
    handleCardsChange?.(updated)
  }

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Аудио-объяснения ключевых терминов и концепций"
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      {/* Текст от автора */}
      {contentText && (
        <div className="mb-6 p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed">{contentText}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          {localCards.map((card, index) => (
            <div key={card.id} className="border-2 border-[#659AB8] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Аудио-карточка {index + 1}</h4>
                {localCards.length > 1 && (
                  <button
                    onClick={() => handleRemoveCard(card.id)}
                    className="text-[#659AB8] hover:text-[#5589a7] p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Термин или концепция
                  </label>
                  <input
                    type="text"
                    value={card.term}
                    onChange={(e) => handleCardChange(card.id, 'term', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7]"
                    placeholder="Введите термин"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Аудиофайл
                  </label>
                  {card.audioUrl ? (
                    <div className="space-y-2">
                      <audio controls className="w-full" src={card.audioUrl}>
                        Ваш браузер не поддерживает аудио.
                      </audio>
                      <button
                        onClick={() => handleCardChange(card.id, 'audioUrl', '')}
                        className="text-sm text-[#659AB8] hover:text-[#5589a7] flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Удалить аудио
                      </button>
                    </div>
                  ) : (
                    <AudioUploadV2
                      onAudioUpload={(fileId, fileUrl, fileName) => handleAudioUpload(card.id, fileId, fileUrl, fileName)}
                      courseId={courseId}
                      lessonId={lessonId}
                      blockId="audio-cards"
                      elementId={card.id}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddCard}
            className="w-full py-3 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить аудио-карточку
          </button>
        </div>
      ) : (
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
      )}

      {isEmpty && !isEditing && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: 6 аудио-карточек с терминами и их аудио-объяснениями
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
