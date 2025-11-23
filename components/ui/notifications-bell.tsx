"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BellIcon } from "@/components/ui/icons"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { NotificationsList } from "./notifications-list"

interface NotificationsBellProps {
  authorId: string
}

export function NotificationsBell({ authorId }: NotificationsBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadUnreadCount = async () => {
    try {
      const response = await fetch(`/api/author-notifications?unreadOnly=true`)
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error loading unread count:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnreadCount()
    // Обновляем счетчик каждые 30 секунд
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [authorId])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // При открытии обновляем счетчик
      loadUnreadCount()
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative h-10 w-10 rounded-full flex items-center justify-center text-slate-900 hover:text-[#5589a7] transition-colors duration-200"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#659AB8] text-white text-xs rounded-full"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationsList
          authorId={authorId}
          onNotificationRead={() => {
            loadUnreadCount()
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

