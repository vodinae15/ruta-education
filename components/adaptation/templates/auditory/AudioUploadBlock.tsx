"use client"

import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Music, Upload, X } from "lucide-react"
import { AudioUploadV2 } from "@/components/ui/audio-upload-v2"

interface AudioUploadBlockProps {
  isEmpty?: boolean
  audioUrl?: string
  introText?: string
  mainText?: string
  isEditing?: boolean
  onAudioUrlChange?: (audioUrl: string) => void
  onMainTextChange?: (text: string) => void
  courseId?: string
  lessonId?: string
}

export function AudioUploadBlock({
  isEmpty = true,
  audioUrl,
  introText,
  mainText,
  isEditing = false,
  onAudioUrlChange,
  onMainTextChange,
  courseId = "",
  lessonId = "",
}: AudioUploadBlockProps) {
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [localAudioUrl, setLocalAudioUrl] = useState(audioUrl || "")

  const handleAudioUpload = (fileId: string, fileUrl: string, fileName: string) => {
    setLocalAudioUrl(fileUrl)
    onAudioUrlChange?.(fileUrl)
  }

  return (
    <BlockWrapper
      blockNumber={1}
      title="Обзор темы"
      intro="Аудио-обзор темы для студентов"
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      <div className="space-y-6">
        {/* Текст от автора */}
        {introText && (
          <div className="p-4 bg-white border-l-4 border-[#659AB8] rounded-r-lg">
            <p className="text-sm text-slate-700 leading-relaxed">{introText}</p>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Рекомендации для автора */}
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
              </div>
            </div>

            {/* Компонент загрузки аудио */}
            <AudioUploadV2
              onAudioUpload={handleAudioUpload}
              courseId={courseId}
              lessonId={lessonId}
              blockId="audio-upload-block"
              initialAudioUrl={localAudioUrl}
            />
          </div>
        ) : (
          <>
            {/* Превью аудио */}
            {(localAudioUrl || audioUrl) ? (
              <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Аудио-обзор темы</p>
                    <p className="text-xs text-slate-600">Готово к прослушиванию</p>
                  </div>
                </div>
                <audio controls className="w-full" src={localAudioUrl || audioUrl}>
                  Ваш браузер не поддерживает аудио элемент.
                </audio>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-12 text-center bg-[#F8FAFB]">
                <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Аудио ещё не загружено
                </h3>
                <p className="text-sm text-slate-600">
                  Автор может загрузить аудио-обзор темы в режиме редактирования
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </BlockWrapper>
  )
}
