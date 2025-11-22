"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircleIcon, ClockIcon, BookOpenIcon, CheckIcon, XIcon } from "@/components/ui/icons"
// import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface Notification {
  id: string
  course_id: string
  student_id: string | null
  notification_type: "purchase_with_feedback" | "stream_started" | "course_published"
  message: string
  is_read: boolean
  created_at: string
  courses?: {
    id: string
    title: string
  }
  students?: {
    id: string
    email: string
  }
}

interface NotificationsListProps {
  authorId: string
  onNotificationRead?: () => void
}

export function NotificationsList({ authorId, onNotificationRead }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/author-notifications`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        // Обрабатываем ошибку от API
        const errorData = await response.json().catch(() => ({ error: "Не удалось загрузить уведомления" }))
        console.error("Error loading notifications:", errorData)
        toast({
          title: "Ошибка",
          description: errorData.error || "Не удалось загрузить уведомления. Попробуйте обновить страницу.",
          variant: "destructive",
        })
        setNotifications([]) // Устанавливаем пустой массив при ошибке
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить уведомления. Проверьте подключение к интернету.",
        variant: "destructive",
      })
      setNotifications([]) // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [authorId])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/author-notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
        if (onNotificationRead) {
          onNotificationRead()
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/author-notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        if (onNotificationRead) {
          onNotificationRead()
        }
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "purchase_with_feedback":
        return <MessageCircleIcon className="w-5 h-5 text-[#5589a7]" />
      case "stream_started":
        return <ClockIcon className="w-5 h-5 text-blue-600" />
      case "course_published":
        return <BookOpenIcon className="w-5 h-5 text-green-600" />
      default:
        return <MessageCircleIcon className="w-5 h-5 text-slate-400" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "purchase_with_feedback":
        return "bg-[#659AB8]/10 border-[#659AB8]/20"
      case "stream_started":
        return "bg-blue-50 border-blue-200"
      case "course_published":
        return "bg-green-50 border-green-200"
      default:
        return "bg-slate-50 border-slate-200"
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="flex flex-col h-[500px]">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-lg text-slate-900">Уведомления</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs text-[#5589a7] hover:text-[#5589a7]/80"
          >
            Отметить все как прочитанные
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-5 w-40 mx-auto" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">Нет уведомлений</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`mb-2 cursor-pointer transition-all ${
                  !notification.is_read ? "border-l-4 border-l-primary" : ""
                } ${getNotificationColor(notification.notification_type)}`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id)
                  }
                  if (notification.course_id) {
                    router.push(`/course/${notification.course_id}`)
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getNotificationIcon(notification.notification_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {notification.courses?.title || "Курс"}
                      </p>
                      <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          {new Date(notification.created_at).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {!notification.is_read && (
                          <Badge className="bg-[#659AB8] text-white text-xs">Новое</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

