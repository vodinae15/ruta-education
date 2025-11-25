"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { UploadIcon, TrashIcon, FileTextIcon, XIcon, DownloadIcon } from "./icons"

interface DocumentUploadProps {
  onDocumentUpload: (fileId: string, fileUrl: string, fileName: string) => void
  courseId: string
  lessonId?: string
  blockId?: string
  elementId?: string
  initialDocumentUrl?: string
  initialFileId?: string
  initialFileName?: string
  className?: string
}

export function DocumentUpload({
  onDocumentUpload,
  courseId,
  lessonId,
  blockId,
  elementId,
  initialDocumentUrl,
  initialFileId,
  initialFileName,
  className = "",
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [documentUrl, setDocumentUrl] = useState<string | null>(initialDocumentUrl || null)
  const [fileId, setFileId] = useState<string | null>(initialFileId || null)
  const [fileName, setFileName] = useState<string>(initialFileName || "")
  const [fileSize, setFileSize] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (extension === "pdf") return "📄"
    if (extension === "doc" || extension === "docx") return "📝"
    return "📎"
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем что курс сохранен
    if (!courseId) {
      setError("Сначала сохраните курс, чтобы загружать файлы")
      return
    }

    // Проверяем тип файла
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      setError("Пожалуйста, выберите документ (PDF, DOC, DOCX)")
      return
    }

    // Проверяем размер (макс 20MB)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setError("Размер документа не должен превышать 20MB")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Создаем FormData
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileType", "document")
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
        throw new Error(errorData.error || "Ошибка загрузки документа")
      }

      const data = await response.json()

      // Устанавливаем данные
      setDocumentUrl(data.file.url)
      setFileId(data.file.id)
      setFileName(data.file.fileName)
      setFileSize(data.file.fileSize)
      setUploadProgress(100)

      // Вызываем callback
      onDocumentUpload(data.file.id, data.file.url, data.file.fileName)
    } catch (err: any) {
      console.error("Document upload error:", err)
      setError(err.message || "Ошибка при загрузке документа")
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
        throw new Error("Ошибка удаления документа")
      }

      // Очищаем состояние
      setDocumentUrl(null)
      setFileId(null)
      setFileName("")
      setFileSize(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Уведомляем родителя об удалении
      onDocumentUpload("", "", "")
    } catch (err) {
      console.error("Document delete error:", err)
      setError("Ошибка при удалении документа")
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
          {!documentUrl ? (
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isUploading}
              >
                <UploadIcon className="w-4 h-4" />
                {isUploading ? "Загрузка..." : "Загрузить документ"}
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
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Прогресс загрузки */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Загрузка документа...</span>
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

          {/* Превью документа */}
          {documentUrl && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{getFileIcon(fileName)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
                      <FileTextIcon className="w-4 h-4 flex-shrink-0" />
                      {fileName}
                    </p>
                    {fileSize > 0 && (
                      <p className="text-xs text-slate-600 mt-1">{formatFileSize(fileSize)}</p>
                    )}
                  </div>
                  <a
                    href={documentUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-[#659AB8] text-white rounded-lg hover:bg-[#557a94] transition-colors text-sm"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Скачать
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Инструкции */}
          {!documentUrl && !isUploading && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <p className="font-medium mb-1">Требования к документу:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Форматы: PDF, DOC, DOCX</li>
                <li>Максимальный размер: 20MB</li>
                <li>Рекомендуется использовать PDF для лучшей совместимости</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
