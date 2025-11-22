"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { PlayIcon, PauseIcon, UploadIcon, TrashIcon, VideoIcon, XIcon } from "./icons"

interface VideoUploadProps {
  onVideoUpload: (fileId: string, fileUrl: string, fileName: string) => void
  courseId: string
  lessonId?: string
  blockId?: string
  elementId?: string
  initialVideoUrl?: string
  initialFileId?: string
  className?: string
}

export function VideoUploadV2({
  onVideoUpload,
  courseId,
  lessonId,
  blockId,
  elementId,
  initialVideoUrl,
  initialFileId,
  className = "",
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null)
  const [fileId, setFileId] = useState<string | null>(initialFileId || null)
  const [fileName, setFileName] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      setError("Пожалуйста, выберите видео файл")
      return
    }

    // Проверяем размер (макс 200MB)
    const maxSize = 200 * 1024 * 1024
    if (file.size > maxSize) {
      setError("Размер видео не должен превышать 200MB")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileType", "video")
      formData.append("courseId", courseId)
      if (lessonId) formData.append("lessonId", lessonId)
      if (blockId) formData.append("blockId", blockId)
      if (elementId) formData.append("elementId", elementId)

      // Симулируем прогресс
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 300)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Ошибка загрузки видео")
      }

      const data = await response.json()

      setVideoUrl(data.file.url)
      setFileId(data.file.id)
      setFileName(data.file.fileName)
      setUploadProgress(100)

      onVideoUpload(data.file.id, data.file.url, data.file.fileName)
    } catch (err: any) {
      console.error("Video upload error:", err)
      setError(err.message || "Ошибка при загрузке видео")
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1500)
    }
  }

  const playVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleDelete = async () => {
    if (!fileId) return

    try {
      const response = await fetch(`/api/upload?fileId=${fileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Ошибка удаления видео")
      }

      setVideoUrl(null)
      setFileId(null)
      setFileName("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      onVideoUpload("", "", "")
    } catch (err) {
      console.error("Delete error:", err)
      setError("Ошибка при удалении видео")
    }
  }

  const handleReplace = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Кнопки управления */}
          {!videoUrl ? (
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isUploading}
              >
                <UploadIcon className="w-4 h-4" />
                {isUploading ? "Загрузка..." : "Загрузить видео"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleReplace} variant="outline" size="sm" className="flex items-center gap-2">
                <UploadIcon className="w-4 h-4" />
                Заменить
              </Button>
              <Button
                onClick={handleDelete}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <TrashIcon className="w-4 h-4" />
                Удалить
              </Button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />

          {/* Прогресс загрузки */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Загрузка видео...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">Пожалуйста, не закрывайте страницу во время загрузки</p>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <XIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Предпросмотр видео */}
          {videoUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Button onClick={playVideo} variant="outline" size="sm" className="flex items-center gap-2">
                  {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                  {isPlaying ? "Пауза" : "Воспроизвести"}
                </Button>
                {fileName && (
                  <span className="text-sm text-slate-600 truncate flex items-center gap-2">
                    <VideoIcon className="w-4 h-4" />
                    {fileName}
                  </span>
                )}
              </div>

              <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="w-full max-h-96 object-contain"
                  controls
                  preload="metadata"
                />
              </div>
            </div>
          )}

          {/* Инструкции */}
          {!videoUrl && !isUploading && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <p className="font-medium mb-1">Требования к видео:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Форматы: MP4, AVI, MOV, WMV, WebM</li>
                <li>Максимальный размер: 200MB</li>
                <li>Рекомендуемое разрешение: 720p (1280x720) или выше</li>
                <li>Рекомендуемый формат: MP4 (H.264)</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
