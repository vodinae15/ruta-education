"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { PlayIcon, PauseIcon, UploadIcon, TrashIcon, VideoIcon } from "./icons"

interface VideoUploadProps {
  onVideoUpload: (videoFile: File) => void
  onTranscription?: (transcription: string) => void
  className?: string
}

export function VideoUpload({
  onVideoUpload,
  onTranscription,
  className = ""
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('video/')) {
      alert('Пожалуйста, выберите видео файл')
      return
    }

    // Проверяем размер файла (максимум 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      alert('Размер файла не должен превышать 100MB')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Создаем URL для предпросмотра
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      
      // Симулируем прогресс загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)
      
      // Вызываем callback для загрузки файла
      onVideoUpload(file)
      
      // Завершаем прогресс
      setTimeout(() => {
        setUploadProgress(100)
        clearInterval(progressInterval)
      }, 1000)
      
      // Автоматически запускаем транскрибацию, если нужно
      if (onTranscription) {
        await transcribeVideo(file)
      }
      
    } catch (error) {
      console.error('Ошибка загрузки видео:', error)
      alert('Ошибка при загрузке видео файла')
    } finally {
      setIsUploading(false)
    }
  }

  const transcribeVideo = async (videoFile: File) => {
    setIsTranscribing(true)
    
    try {
      // Здесь будет интеграция с AI API для транскрибации видео
      const formData = new FormData()
      formData.append('video', videoFile)
      
      // TODO: Заменить на реальный API вызов
      const response = await fetch('/api/transcribe-video', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const { transcription } = await response.json()
        onTranscription?.(transcription)
      } else {
        // Fallback: показываем сообщение о том, что нужно ввести текст вручную
        onTranscription?.('')
        alert('Автоматическая транскрибация видео временно недоступна. Пожалуйста, введите описание вручную.')
      }
      
    } catch (error) {
      console.error('Ошибка транскрибации видео:', error)
      onTranscription?.('')
      alert('Ошибка при транскрибации видео. Пожалуйста, введите описание вручную.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const playVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const clearVideo = () => {
    setVideoUrl(null)
    setIsPlaying(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Кнопки управления */}
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
              disabled={isUploading}
            >
              <UploadIcon className="w-4 h-4" />
              {isUploading ? 'Загрузка...' : 'Загрузить видео'}
            </Button>
            
            {videoUrl && (
              <Button
                onClick={clearVideo}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Очистить
              </Button>
            )}
          </div>

          {/* Скрытый input для загрузки файлов */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Прогресс загрузки */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Загрузка видео...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Предпросмотр видео */}
          {videoUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={playVideo}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                  {isPlaying ? 'Пауза' : 'Воспроизвести'}
                </Button>
                
                {isTranscribing && (
                  <span className="text-sm text-gray-500">
                    Транскрибация...
                  </span>
                )}
              </div>
              
              <video
                ref={videoRef}
                src={videoUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                className="w-full max-h-64 rounded-lg"
                controls
                preload="metadata"
              />
            </div>
          )}

          {/* Инструкции */}
          <div className="text-sm text-gray-600">
            <p>• Поддерживаемые форматы: MP4, AVI, MOV, WMV</p>
            <p>• Максимальный размер файла: 100MB</p>
            <p>• Рекомендуемое разрешение: 720p или выше</p>
            {onTranscription && (
              <p>• Видео будет автоматически транскрибировано в текст</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

