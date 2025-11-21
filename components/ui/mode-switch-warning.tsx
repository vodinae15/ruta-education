import React from "react"
import { Button } from "@/components/ui/button"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Переключение режима</h3>
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
          <p className="text-slate-700 leading-relaxed">
            Вы переключаетесь с режима <span className="font-semibold text-primary">«{modeNames[currentMode]}»</span> на{" "}
            <span className="font-semibold text-primary">«{modeNames[targetMode]}»</span>.
          </p>

          {hasUnsavedChanges ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                ⚠️ У вас есть <strong>несохранённые изменения</strong>. Они будут потеряны при переключении режима, если
                не сохранить их сейчас.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                Прогресс текущего режима будет сохранён отдельно. Вы сможете вернуться к нему позже.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Подсказка:</strong> Каждый режим сохраняет свой прогресс независимо. Вы можете работать над
              обоими версиями курса.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Отменить
          </Button>

          {hasUnsavedChanges ? (
            <>
              <Button
                onClick={onConfirm}
                variant="outline"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                Переключить без сохранения
              </Button>
              <Button onClick={onSaveAndSwitch} className="flex-1 bg-primary hover:bg-primary-hover text-white">
                Сохранить и переключить
              </Button>
            </>
          ) : (
            <Button onClick={onConfirm} className="flex-1 bg-primary hover:bg-primary-hover text-white">
              Переключить режим
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
