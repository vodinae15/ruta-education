"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  confirmVariant = "default"
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-white border-2 border-[#659AB8]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[#659AB8] mb-2">{title}</h2>
              <p className="text-gray-700 text-sm">{message}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="p-1 h-auto ml-2"
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex gap-3 justify-end mt-6">
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-6"
            >
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              className="px-6 bg-primary hover:bg-primary/90 text-white"
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

