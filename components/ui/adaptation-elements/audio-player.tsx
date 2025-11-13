"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VolumeIcon, PlayIcon, PauseIcon } from "@/components/ui/icons"

interface AudioPlayerProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

export function AudioPlayer({ data, description, onInteraction }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Если есть URL аудио-файла
  if (data?.src || data?.url) {
    return (
      <Card className="bg-white border-2 border-green-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <VolumeIcon className="w-5 h-5" />
              <span className="font-semibold">Аудио-контент</span>
            </div>
            <audio
              src={data.src || data.url}
              controls
              className="w-full"
              onPlay={() => {
                setIsPlaying(true)
                onInteraction?.('audio_play', { src: data.src || data.url })
              }}
              onPause={() => {
                setIsPlaying(false)
                onInteraction?.('audio_pause', { src: data.src || data.url })
              }}
              onTimeUpdate={(e) => {
                const audio = e.currentTarget
                setCurrentTime(audio.currentTime)
                setDuration(audio.duration)
              }}
              onLoadedMetadata={(e) => {
                const audio = e.currentTarget
                setDuration(audio.duration)
              }}
            />
            {description && (
              <p className="text-sm text-gray-600 italic">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Если есть только текст для озвучивания
  return (
    <Card className="bg-white border-2 border-green-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <VolumeIcon className="w-5 h-5" />
            <span className="font-semibold">Аудио-контент</span>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-gray-700 whitespace-pre-wrap">{data?.text || description}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="italic">💡 Совет: Используйте функцию озвучивания браузера или TTS для прослушивания текста</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

