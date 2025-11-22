import React from "react"
import { AlertTriangleIcon, XIcon } from "@/components/ui/icons"

interface ModeSwitchWarningProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onSaveAndSwitch: () => void
  currentMode: "standard" | "personalized"
  targetMode: "standard" | "personalized"
  hasUnsavedChanges: boolean
}

export function ModeSwitchWarning({
  isOpen,
  onClose,
  onConfirm,
  onSaveAndSwitch,
  currentMode,
  targetMode,
  hasUnsavedChanges,
}: ModeSwitchWarningProps) {
  if (!isOpen) return null

  const modeNames = {
    standard: "Стандартная сборка",
    personalized: "Сборка по типу автора",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-lg border border-[#E5E7EB] max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#659AB8] flex items-center justify-center">
              <AlertTriangleIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-[#5589a7]">Переключение режима</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Закрыть"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Вы переключаетесь с режима <span className="font-semibold text-[#5589a7]">«{modeNames[currentMode]}»</span> на{" "}
            <span className="font-semibold text-[#5589a7]">«{modeNames[targetMode]}»</span>.
          </p>

          {hasUnsavedChanges ? (
            <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-4">
              <p className="text-sm text-slate-700">
                У вас есть <strong>несохранённые изменения</strong>. Они будут потеряны при переключении режима, если
                не сохранить их сейчас.
              </p>
            </div>
          ) : (
            <div className="bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg p-4">
              <p className="text-sm text-slate-600">
                Прогресс текущего режима будет сохранён отдельно. Вы сможете вернуться к нему позже.
              </p>
            </div>
          )}

          <div className="bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg p-4">
            <p className="text-sm text-slate-600">
              <strong className="text-[#5589a7]">Подсказка:</strong> Каждый режим сохраняет свой прогресс независимо. Вы можете работать над
              обоими версиями курса.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-[#F8FAFB] border-t border-[#E5E7EB]">
          {hasUnsavedChanges ? (
            <div className="space-y-3">
              <button
                onClick={onSaveAndSwitch}
                className="w-full bg-[#659AB8] text-white px-6 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
              >
                Сохранить и переключить
              </button>
              <button
                onClick={onConfirm}
                className="w-full bg-white text-[#659AB8] px-6 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
              >
                Переключить без сохранения
              </button>
              <button
                onClick={onClose}
                className="w-full bg-white text-slate-600 px-6 py-3 border-2 border-slate-300 rounded-lg font-semibold transition-colors duration-200 hover:border-slate-400 hover:text-slate-700"
              >
                Отменить
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-white text-slate-600 px-6 py-3 border-2 border-slate-300 rounded-lg font-semibold transition-colors duration-200 hover:border-slate-400 hover:text-slate-700"
              >
                Отменить
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-[#659AB8] text-white px-6 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
              >
                Переключить режим
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
