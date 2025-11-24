"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Music, Upload, X } from "lucide-react"

interface AudioUploadBlockProps {
  isEmpty?: boolean
  audioUrl?: string
  onReplaceWithText?: () => void
}

export function AudioUploadBlock({
  isEmpty = true,
  audioUrl,
  onReplaceWithText,
}: AudioUploadBlockProps) {
  const [showRecommendations, setShowRecommendations] = useState(true)

  return (
    <BlockWrapper
      blockNumber={1}
      title="Обзор темы (Аудио)"
      intro="Запишите или загрузите аудио-обзор темы для студентов"
      isEmpty={false}
    >
      <div className="space-y-6">
        {/* Рекомендации для автора */}
        {isEmpty && showRecommendations && (
          <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Music className="w-5 h-5 text-[#659AB8] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Рекомендации для записи аудио:
                </h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Оптимальная длительность: 3-5 минут</li>
                  <li>Говорите четко и размеренно</li>
                  <li>Кратко опишите ключевые концепции темы</li>
                  <li>Используйте примеры для лучшего понимания</li>
                  <li>Запишите в тихом помещении без фоновых шумов</li>
                </ul>
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Зона загрузки */}
        {isEmpty && !audioUrl && (
          <div className="border-2 border-dashed border-[#659AB8] rounded-lg p-12 text-center bg-[#F8FAFB]">
            <div className="w-16 h-16 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Загрузите аудио-файл
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Поддерживаются форматы: MP3, WAV, OGG (максимум 50 МБ)
            </p>
            <button className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]">
              Выбрать файл
            </button>
          </div>
        )}

        {/* Превью аудио */}
        {audioUrl && (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#659AB8] rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Аудио-обзор темы</p>
                <p className="text-sm text-slate-600">Готово к прослушиванию</p>
              </div>
            </div>
            <audio controls className="w-full" src={audioUrl}>
              Ваш браузер не поддерживает аудио элемент.
            </audio>
          </div>
        )}

        {/* Опция замены на текст */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-[#E5E7EB]">
          <button
            onClick={onReplaceWithText}
            className="text-sm text-[#659AB8] hover:text-[#5589a7] font-medium transition-colors duration-200"
          >
            Заменить аудио на текстовый блок
          </button>
        </div>
      </div>
    </BlockWrapper>
  )
}
