"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, ClockIcon, LockIcon, ArrowRightIcon } from "@/components/ui/icons"
import { useRouter } from "next/navigation"

interface CourseAccessStatusProps {
  accessStatus: "granted" | "pending" | "denied"
  accessMessage: string
  courseId: string
  launchMode: string | null
  streamStartDate: string | null
}

export function CourseAccessStatus({
  accessStatus,
  accessMessage,
  courseId,
  launchMode,
  streamStartDate,
}: CourseAccessStatusProps) {
  const router = useRouter()

  if (accessStatus === "granted") {
    return (
      <Card className="bg-green-50 border-2 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Доступ открыт</p>
                <p className="text-sm text-green-700">{accessMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/course/${courseId}/adaptation`)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              Перейти к курсу
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (accessStatus === "pending") {
    return (
      <Card className="bg-blue-50 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">Ожидает начала обучения</p>
                <p className="text-sm text-blue-700">{accessMessage}</p>
                {streamStartDate && (
                  <Badge className="mt-2 bg-blue-100 text-blue-800 border-blue-200">
                    Старт: {new Date(streamStartDate).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // accessStatus === "denied"
  return (
    <Card className="bg-red-50 border-2 border-red-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LockIcon className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Нет доступа к курсу</p>
              <p className="text-sm text-red-700">{accessMessage}</p>
            </div>
          </div>
          <Button
            onClick={() => router.push(`/course/${courseId}/pricing`)}
            className="bg-[#659AB8] hover:bg-[#659AB8]-hover text-white flex items-center gap-2"
          >
            Купить тариф
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

