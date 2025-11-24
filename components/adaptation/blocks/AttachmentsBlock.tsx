import React from "react"
import { BlockWrapper } from "./BlockWrapper"
import { FileText, Video, Music, Image as ImageIcon } from "lucide-react"

interface AttachmentsBlockProps {
  isEmpty?: boolean
}

export function AttachmentsBlock({ isEmpty = true }: AttachmentsBlockProps) {
  return (
    <BlockWrapper
      blockNumber={4}
      title="Углубленное изучение"
      intro="Дополнительные материалы для изучения темы"
      isEmpty={isEmpty}
    >
      {!isEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Пример вложений - иконки */}
          <div className="flex items-center gap-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
            <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                video_example.mp4
              </p>
              <p className="text-xs text-slate-600">Видео</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
            <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                document.pdf
              </p>
              <p className="text-xs text-slate-600">Документ</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
            <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                audio_example.mp3
              </p>
              <p className="text-xs text-slate-600">Аудио</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
            <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                image.jpg
              </p>
              <p className="text-xs text-slate-600">Изображение</p>
            </div>
          </div>
        </div>
      )}
    </BlockWrapper>
  )
}
