"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"

interface CourseActionModalProps {
  isOpen: boolean
  onClose: () => void
  type: "save" | "publish" | "hide"
  courseLink?: string
}

export function CourseActionModal({ isOpen, onClose, type, courseLink }: CourseActionModalProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    router.push("/dashboard")
  }

  const handleCopyLink = async () => {
    if (courseLink) {
      await navigator.clipboard.writeText(courseLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getModalContent = () => {
    switch (type) {
      case "save":
        return {
          title: "Черновик сохранён",
          subtitle: "Вы можете продолжить его редактирование в любое удобное время",
        }
      case "publish":
        return {
          title: "Курс опубликован",
          subtitle: "Откройте ученикам доступ к курсу по email",
        }
      case "hide":
        return {
          title: "Курс скрыт",
          subtitle: "Он больше не будет отображаться у вас в личном кабинете",
        }
    }
  }

  const content = getModalContent()

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-white border-2 border-[#659AB8]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[#659AB8] mb-2">{content.title}</h2>
              <p className="text-gray-700 text-sm">{content.subtitle}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} className="p-1 h-auto">
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
