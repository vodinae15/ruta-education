"use client"

import React, { useState } from "react"
import { BlockWrapper } from "./BlockWrapper"
import { FileText, Video, Music, Image as ImageIcon, Plus, Trash2, Upload, Download, ExternalLink } from "lucide-react"
import { AudioUploadV2 } from "@/components/ui/audio-upload-v2"
import { VideoUploadV2 } from "@/components/ui/video-upload-v2"
import { ImageUploadV2 } from "@/components/ui/image-upload-v2"
import { DocumentUpload } from "@/components/ui/document-upload"

interface Attachment {
  id: string
  type: "video" | "audio" | "document" | "image"
  fileUrl: string
  fileName?: string
  fileId?: string
  caption?: string
}

interface MediaElement {
  id: string
  type: "video" | "audio" | "image" | "file"
  content: string
  caption?: string
}

interface AttachmentsBlockProps {
  isEmpty?: boolean
  mainText?: string
  attachments?: Attachment[]
  mediaElements?: MediaElement[] // Медиа из content.elements
  isEditing?: boolean
  onAttachmentsChange?: (attachments: Attachment[]) => void
  onMainTextChange?: (text: string) => void
  courseId?: string
  lessonId?: string
}

export function AttachmentsBlock({
  isEmpty = true,
  mainText,
  attachments,
  mediaElements,
  isEditing = false,
  onAttachmentsChange,
  onMainTextChange,
  courseId = "",
  lessonId = "",
}: AttachmentsBlockProps) {
  const defaultAttachments: Attachment[] = attachments || []
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>(defaultAttachments)
  const [uploadingType, setUploadingType] = useState<string | null>(null)

  // Объединяем attachments и mediaElements для отображения
  const allMedia = [
    ...localAttachments,
    ...(mediaElements || []).map(el => ({
      id: el.id,
      type: el.type === 'file' ? 'document' as const : el.type,
      fileUrl: el.content,
      fileName: el.caption || `${el.type} файл`,
      caption: el.caption
    }))
  ]

  const handleAddAttachment = (type: "video" | "audio" | "document" | "image") => {
    setUploadingType(type)
  }

  const handleFileUpload = (fileId: string, fileUrl: string, fileName: string, type: "video" | "audio" | "document" | "image") => {
    const newAttachment: Attachment = {
      id: `attachment-${Date.now()}`,
      type,
      fileUrl,
      fileName,
      fileId
    }
    const updated = [...localAttachments, newAttachment]
    setLocalAttachments(updated)
    onAttachmentsChange?.(updated)
    setUploadingType(null)
  }

  const handleRemoveAttachment = (id: string) => {
    const updated = localAttachments.filter(att => att.id !== id)
    setLocalAttachments(updated)
    onAttachmentsChange?.(updated)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-5 h-5 text-white" />
      case "audio": return <Music className="w-5 h-5 text-white" />
      case "document": return <FileText className="w-5 h-5 text-white" />
      case "image": return <ImageIcon className="w-5 h-5 text-white" />
      default: return <FileText className="w-5 h-5 text-white" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video": return "Видео"
      case "audio": return "Аудио"
      case "document": return "Документ"
      case "image": return "Изображение"
      default: return "Файл"
    }
  }

  // Рендер медиа в зависимости от типа (для студента)
  const renderMediaPreview = (media: Attachment) => {
    if (media.type === 'video') {
      return (
        <div className="col-span-full">
          <div className="rounded-lg overflow-hidden bg-black">
            {media.fileUrl.includes('youtube.com') || media.fileUrl.includes('youtu.be') ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={media.fileUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video controls className="w-full" src={media.fileUrl}>
                Ваш браузер не поддерживает видео.
              </video>
            )}
          </div>
          {media.caption && (
            <p className="text-sm text-slate-600 mt-2 italic">{media.caption}</p>
          )}
        </div>
      )
    }

    if (media.type === 'image') {
      return (
        <div className="col-span-full">
          <img
            src={media.fileUrl}
            alt={media.caption || media.fileName || 'Изображение'}
            className="w-full h-auto rounded-lg"
            loading="lazy"
          />
          {media.caption && (
            <p className="text-sm text-slate-600 mt-2 italic">{media.caption}</p>
          )}
        </div>
      )
    }

    if (media.type === 'audio') {
      return (
        <div className="col-span-full">
          <div className="bg-slate-100 rounded-lg p-4">
            <audio controls className="w-full" src={media.fileUrl}>
              Ваш браузер не поддерживает аудио.
            </audio>
          </div>
          {media.caption && (
            <p className="text-sm text-slate-600 mt-2 italic">{media.caption}</p>
          )}
        </div>
      )
    }

    // Для документов показываем ссылку
    return (
      <div className="flex items-center gap-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
        <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
          {getIcon(media.type)}
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={media.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-900 truncate hover:text-[#659AB8] flex items-center gap-1"
            title={media.fileName}
          >
            {media.fileName}
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-xs text-slate-600">{getTypeLabel(media.type)}</p>
        </div>
      </div>
    )
  }

  return (
    <BlockWrapper
      blockNumber={4}
      title="Углубленное изучение"
      intro="Дополнительные материалы для изучения темы"
      isEmpty={isEmpty && allMedia.length === 0}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      {isEditing ? (
        <div className="space-y-4">
          {/* Список прикрепленных файлов */}
          {localAttachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {localAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-3 p-4 bg-[#F8FAFB] rounded-lg border-2 border-[#659AB8]">
                  <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
                    {getIcon(attachment.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate" title={attachment.fileName}>
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-slate-600">{getTypeLabel(attachment.type)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="text-[#659AB8] hover:text-[#5589a7] p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Компонент загрузки по типу */}
          {uploadingType && (
            <div className="border-2 border-[#659AB8] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Загрузка: {getTypeLabel(uploadingType)}</h4>
                <button onClick={() => setUploadingType(null)} className="text-slate-400 hover:text-slate-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {uploadingType === "audio" && (
                <AudioUploadV2
                  onAudioUpload={(fileId, fileUrl, fileName) => handleFileUpload(fileId, fileUrl, fileName, "audio")}
                  courseId={courseId}
                  lessonId={lessonId}
                  blockId="attachments-block"
                />
              )}
              {uploadingType === "video" && (
                <VideoUploadV2
                  onVideoUpload={(fileId, fileUrl, fileName) => handleFileUpload(fileId, fileUrl, fileName, "video")}
                  courseId={courseId}
                  lessonId={lessonId}
                  blockId="attachments-block"
                />
              )}
              {uploadingType === "image" && (
                <ImageUploadV2
                  onImageUpload={(fileId, fileUrl, fileName) => handleFileUpload(fileId, fileUrl, fileName, "image")}
                  courseId={courseId}
                  lessonId={lessonId}
                  blockId="attachments-block"
                />
              )}
              {uploadingType === "document" && (
                <DocumentUpload
                  onDocumentUpload={(fileId, fileUrl, fileName) => handleFileUpload(fileId, fileUrl, fileName, "document")}
                  courseId={courseId}
                  lessonId={lessonId}
                  blockId="attachments-block"
                />
              )}
            </div>
          )}

          {/* Кнопки добавления */}
          {!uploadingType && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleAddAttachment("video")}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors"
              >
                <Video className="w-6 h-6" />
                <span className="text-xs font-medium">Видео</span>
              </button>
              <button
                onClick={() => handleAddAttachment("audio")}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors"
              >
                <Music className="w-6 h-6" />
                <span className="text-xs font-medium">Аудио</span>
              </button>
              <button
                onClick={() => handleAddAttachment("image")}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs font-medium">Изображение</span>
              </button>
              <button
                onClick={() => handleAddAttachment("document")}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors"
              >
                <FileText className="w-6 h-6" />
                <span className="text-xs font-medium">Документ</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {allMedia.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {allMedia.map((media) => (
                <div key={media.id}>
                  {renderMediaPreview(media)}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-12 text-center bg-[#F8FAFB]">
              <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Нет вложений
              </h3>
              <p className="text-sm text-slate-600">
                Автор может добавить дополнительные материалы в режиме редактирования
              </p>
            </div>
          )}
        </>
      )}
    </BlockWrapper>
  )
}
