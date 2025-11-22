"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { UserIcon, TrashIcon, XIcon, MailIcon, PlusIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface Collaborator {
  id: string
  course_id: string
  collaborator_email: string
  collaborator_user_id: string | null
  added_by: string
  added_at: string
}

interface CourseCollaboratorsManagerProps {
  courseId: string
  isOpen: boolean
  onClose: () => void
  isAuthor?: boolean // Является ли текущий пользователь автором
}

export function CourseCollaboratorsManager({
  courseId,
  isOpen,
  onClose,
  isAuthor = true
}: CourseCollaboratorsManagerProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Загрузка соавторов при открытии модального окна
  useEffect(() => {
    if (isOpen && courseId && !initialLoaded) {
      fetchCollaborators()
    }
  }, [isOpen, courseId, initialLoaded])

  // Сброс при смене курса
  useEffect(() => {
    setInitialLoaded(false)
    setCollaborators([])
  }, [courseId])

  const fetchCollaborators = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/course-collaborators?courseId=${courseId}`)

      if (!response.ok) {
        throw new Error("Не удалось загрузить соавторов")
      }

      const data = await response.json()
      setCollaborators(data.collaborators || [])
      setInitialLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки соавторов")
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const handleAddCollaborator = async () => {
    if (!email.trim()) {
      setError("Введите email соавтора")
      return
    }

    if (!validateEmail(email)) {
      setError("Введите корректный email адрес")
      return
    }

    try {
      setAdding(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/course-collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось добавить соавтора")
      }

      setSuccess(`Соавтор ${email.trim()} успешно добавлен`)
      setEmail("")
      // Обновляем список соавторов
      await fetchCollaborators()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления соавтора")
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCollaborator = async (collaboratorId: string, collaboratorEmail: string) => {
    if (!confirm(`Вы уверены, что хотите удалить соавтора ${collaboratorEmail}?`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/course-collaborators", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          collaboratorId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось удалить соавтора")
      }

      setSuccess(`Соавтор ${collaboratorEmail} удален`)
      // Обновляем список соавторов
      await fetchCollaborators()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления соавтора")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#5589a7]">
            Управление соавторами
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Добавьте соавторов для совместной работы над курсом. Соавторы смогут редактировать курс так же, как и вы.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Форма добавления соавтора */}
          {isAuthor && (
            <div className="space-y-4 p-4 bg-light-blue/30 rounded-lg border border-[#659AB8]/20">
              <h3 className="font-semibold text-[#5589a7]">Добавить соавтора</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                      setSuccess(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !adding) {
                        handleAddCollaborator()
                      }
                    }}
                    disabled={adding}
                    icon={<MailIcon className="w-4 h-4" />}
                  />
                </div>
                <Button
                  onClick={handleAddCollaborator}
                  disabled={adding || !email.trim()}
                  className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white flex items-center gap-2"
                >
                  {adding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Добавление...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-4 h-4" />
                      Добавить
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-slate-700 bg-[#FDF8F3] border border-[#E5E7EB] p-2 rounded">{error}</p>
              )}
              {success && (
                <p className="text-sm text-[#5589a7] bg-[#E8F4FA] border border-[#CDE6F9] p-2 rounded">{success}</p>
              )}
            </div>
          )}

          {/* Список соавторов */}
          <div className="space-y-3">
            <h3 className="font-semibold text-[#5589a7]">
              Соавторы ({collaborators.length})
            </h3>

            {loading || !initialLoaded ? (
              <div className="space-y-3 py-8">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <UserIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Соавторы пока не добавлены</p>
                {isAuthor && (
                  <p className="text-sm mt-1">Добавьте соавтора по email выше</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-[#659AB8]/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-[#659AB8]/10 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-[#5589a7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {collaborator.collaborator_email}
                        </p>
                        <p className="text-sm text-slate-500">
                          Добавлен {formatDate(collaborator.added_at)}
                        </p>
                      </div>
                      <Badge className="bg-[#659AB8]/10 text-[#5589a7] border-[#659AB8]/20">
                        Соавтор
                      </Badge>
                    </div>
                    {isAuthor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(collaborator.id, collaborator.collaborator_email)}
                        disabled={loading}
                        className="text-[#659AB8] hover:text-[#5589a7] hover:bg-[#E8F4FA] ml-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Информация о правах - только после загрузки */}
          {initialLoaded && (
            <div className="p-4 bg-light-blue/20 rounded-lg border border-[#659AB8]/10">
              <p className="text-sm text-slate-700">
                <strong>Важно:</strong> Соавторы имеют те же права редактирования, что и автор курса.
                Они могут создавать и редактировать уроки, блоки и весь контент курса.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

