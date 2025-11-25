"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { PlayIcon, PauseIcon, UploadIcon, TrashIcon, VideoIcon, XIcon, LinkIcon } from "./icons"

interface VideoUploadProps {
  onVideoUpload: (fileId: string, fileUrl: string, fileName: string, source?: string) => void
  courseId: string
  lessonId?: string
  blockId?: string
  elementId?: string
  initialVideoUrl?: string
  initialFileId?: string
  initialFileName?: string
  initialSource?: string
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
  initialFileName,
  initialSource,
  className = "",
}: VideoUploadProps) {
  const [uploadMode, setUploadMode] = useState<"file" | "url">(initialSource === "url" ? "url" : "file")
  const [isUploading, setIsUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null)
  const [fileId, setFileId] = useState<string | null>(initialFileId || null)
  const [fileName, setFileName] = useState<string>(initialFileName || "")
  const [urlInput, setUrlInput] = useState<string>(initialSource === "url" ? initialVideoUrl || "" : "")
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Определяем тип видео по URL
  const getVideoType = (url: string): "youtube" | "vimeo" | "direct" => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
    if (url.includes("vimeo.com")) return "vimeo"
    return "direct"
  }

  // Извлекаем ID из YouTube URL
  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Извлекаем ID из Vimeo URL
  const getVimeoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/)
    return match ? match[1] : null
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем что курс сохранен
    if (!courseId) {
      setError("Сначала сохраните курс, чтобы загружать файлы")
      return
    }

    if (!file.type.startsWith("video/")) {
      setError("Пожалуйста, выберите видео файл")
      return
    }

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

      onVideoUpload(data.file.id, data.file.url, data.file.fileName, "file")
    } catch (err: any) {
      console.error("Video upload error:", err)
      setError(err.message || "Ошибка при загрузке видео")
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1500)
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setError("Введите ссылку на видео")
      return
    }

    // Простая валидация URL
    try {
      new URL(urlInput)
    } catch {
      setError("Неверный формат ссылки")
      return
    }

    const videoType = getVideoType(urlInput)
    let displayName = "Видео по ссылке"

    if (videoType === "youtube") {
      displayName = "YouTube видео"
    } else if (videoType === "vimeo") {
      displayName = "Vimeo видео"
    }

    setVideoUrl(urlInput)
    setFileId("url")
    setFileName(displayName)
    setError(null)

    onVideoUpload("url", urlInput, displayName, "url")
  }

  const handleDelete = async () => {
    // Если это загруженный файл - удаляем из Storage
    if (fileId && fileId !== "url") {
      try {
        const response = await fetch(`/api/upload?fileId=${fileId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Ошибка удаления видео")
        }
      } catch (err) {
        console.error("Delete error:", err)
        setError("Ошибка при удалении видео")
        return
      }
    }

    // Очищаем состояние
    setVideoUrl(null)
    setFileId(null)
    setFileName("")
    setUrlInput("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    onVideoUpload("", "", "", uploadMode)
  }

  const handleReplace = () => {
    if (uploadMode === "file") {
      fileInputRef.current?.click()
    } else {
      setVideoUrl(null)
      setFileId(null)
      setFileName("")
    }
  }

  const renderVideoPreview = () => {
    if (!videoUrl) return null

    const videoType = getVideoType(videoUrl)

    if (videoType === "youtube") {
      const videoId = getYouTubeId(videoUrl)
      if (videoId) {
        return (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      }
    }

    if (videoType === "vimeo") {
      const videoId = getVimeoId(videoUrl)
      if (videoId) {
        return (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://player.vimeo.com/video/${videoId}`}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      }
    }

    // Direct video or uploaded file
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full rounded-lg"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Переключатель режимов */}
          {!videoUrl && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setUploadMode("file")}
                className={`flex-1 py-2 px-4 rounded-md transition-all ${
                  uploadMode === "file"
                    ? "bg-white text-[#659AB8] font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <UploadIcon className="w-4 h-4 inline mr-2" />
                Загрузить файл
              </button>
              <button
                onClick={() => setUploadMode("url")}
                className={`flex-1 py-2 px-4 rounded-md transition-all ${
                  uploadMode === "url"
                    ? "bg-white text-[#659AB8] font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <LinkIcon className="w-4 h-4 inline mr-2" />
                По ссылке
              </button>
            </div>
          )}

          {/* Режим загрузки файла */}
          {uploadMode === "file" && !videoUrl && (
            <>
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={isUploading}
                >
                  <UploadIcon className="w-4 h-4" />
                  {isUploading ? "Загрузка..." : "Выбрать видео"}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <p className="font-medium mb-1">Требования:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Форматы: MP4, MOV, AVI, WebM</li>
                  <li>Максимальный размер: 200MB</li>
                </ul>
              </div>
            </>
          )}

          {/* Режим ссылки */}
          {uploadMode === "url" && !videoUrl && (
            <>
              <div className="space-y-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#659AB8]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUrlSubmit()
                  }}
                />
                <Button
                  onClick={handleUrlSubmit}
                  className="w-full bg-[#659AB8] hover:bg-[#557a94] text-white"
                >
                  Добавить видео
                </Button>
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <p className="font-medium mb-1">Поддерживаются:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>YouTube (youtube.com, youtu.be)</li>
                  <li>Vimeo (vimeo.com)</li>
                  <li>Прямые ссылки на видео (.mp4, .webm, .mov)</li>
                </ul>
              </div>
            </>
          )}

          {/* Прогресс загрузки */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Загрузка видео...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#659AB8] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <XIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Превью видео */}
          {videoUrl && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={handleReplace} variant="outline" size="sm" className="flex items-center gap-2">
                  {uploadMode === "file" ? <UploadIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
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

              <div className="rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50">
                {renderVideoPreview()}
              </div>

              {fileName && (
                <p className="text-xs text-slate-600 text-center truncate flex items-center justify-center gap-2">
                  <VideoIcon className="w-4 h-4" />
                  {fileName}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
