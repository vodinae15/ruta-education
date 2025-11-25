"use client"

import { Card, CardContent } from "./card"
import { X } from "lucide-react"

interface SaveCourseWarningModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SaveCourseWarningModal({ isOpen, onClose }: SaveCourseWarningModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-white border-2 border-[#659AB8]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[#5589a7] mb-2">Сохраните курс</h2>
              <p className="text-slate-600 text-sm">
                Перед загрузкой файлов необходимо сохранить курс. Пожалуйста, нажмите кнопку "Сохранить курс" внизу страницы.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 h-auto text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
            >
              Понятно
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
