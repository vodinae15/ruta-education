"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { UploadIcon, TrashIcon, ImageIcon, XIcon } from "./icons"

interface ImageUploadProps {
  onImageUpload: (fileId: string, fileUrl: string, fileName: string) => void
  courseId: string
  lessonId?: string
  blockId?: string
  elementId?: string
  initialImageUrl?: string
  initialFileId?: string
  className?: string
}

export function ImageUpload({
  onImageUpload,
  courseId,
  lessonId,
  blockId,
  elementId,
  initialImageUrl,
  initialFileId,
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null)
  const [fileId, setFileId] = useState<string | null>(initialFileId || null)
  const [fileName, setFileName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith("image/")) {
      setError("Пожалуйста, выберите изображение")
      return
    }

    // Проверяем размер (макс 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError("Размер изображения не должен превышать 10MB")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Создаем FormData
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileType", "image")
      formData.append("courseId", courseId)
      if (lessonId) formData.append("lessonId", lessonId)
      if (blockId) formData.append("blockId", blockId)
      if (elementId) formData.append("elementId", elementId)

      // Симулируем прогресс (реальный прогресс можно реализовать через XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Отправляем на сервер
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Ошибка загрузки изображения")
      }

      const data = await response.json()

      // Устанавливаем данные
      setImageUrl(data.file.url)
      setFileId(data.file.id)
      setFileName(data.file.fileName)
      setUploadProgress(100)

      // Вызываем callback
      onImageUpload(data.file.id, data.file.url, data.file.fileName)
    } catch (err: any) {
      console.error("Image upload error:", err)
      setError(err.message || "Ошибка при загрузке изображения")
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleDelete = async () => {
    if (!fileId) return

    try {
      const response = await fetch(`/api/upload?fileId=${fileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Ошибка удаления изображения")
      }

      // Очищаем состояние
      setImageUrl(null)
      setFileId(null)
      setFileName("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Уведомляем родителя об удалении
      onImageUpload("", "", "")
    } catch (err) {
      console.error("Image delete error:", err)
      setError("Ошибка при удалении изображения")
    }
  }

  const handleReplace = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Кнопки управления */}
          {!imageUrl ? (
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isUploading}
              >
                <UploadIcon className="w-4 h-4" />
                {isUploading ? "Загрузка..." : "Загрузить изображение"}
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

          {/* Скрытый input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Прогресс загрузки */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Загрузка изображения...</span>
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

          {/* Превью изображения */}
          {imageUrl && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50">
                <img src={imageUrl} alt={fileName || "Uploaded image"} className="w-full h-auto max-h-96 object-contain" />
              </div>
              {fileName && (
                <p className="text-sm text-slate-600 truncate flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {fileName}
                </p>
              )}
            </div>
          )}

          {/* Инструкции */}
          {!imageUrl && !isUploading && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <p className="font-medium mb-1">Требования к изображению:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Форматы: JPG, PNG, GIF, WebP, SVG</li>
                <li>Максимальный размер: 10MB</li>
                <li>Рекомендуемое разрешение: 1920x1080 или выше</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
