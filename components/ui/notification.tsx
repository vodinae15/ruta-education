"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { XIcon } from "./icons"

interface NotificationProps {
  type: "draft" | "published"
  isVisible: boolean
  onClose: () => void
  courseLink?: string
}

export function Notification({ type, isVisible, onClose, courseLink }: NotificationProps) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const copyLink = async () => {
    if (courseLink) {
      await navigator.clipboard.writeText(courseLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    onClose()
    router.push("/dashboard")
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-[#FEFDF2] bg-opacity-95 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-white border-[#659AB8] border-2">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 text-center">
              {type === "draft" ? (
                <div>
                  <h3 className="text-lg font-semibold text-[#659AB8] mb-2">Курс сохранён как черновик</h3>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-[#659AB8] mb-2">Курс опубликован!</h3>
                  <p className="text-gray-600 mb-4">Откройте ученикам доступ к курсу по email</p>
                </div>
              )}
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="ml-2 p-1 h-auto text-[#659AB8] hover:bg-[#CDE6F9]"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
