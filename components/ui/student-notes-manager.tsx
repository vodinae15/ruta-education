"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircleIcon, UserIcon, TrashIcon, EditIcon, SendIcon } from "@/components/ui/icons"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StudentNote {
  id: string
  note: string
  created_by: string
  created_by_email: string
  created_by_type: "author" | "student"
  created_at: string
  updated_at: string
}

interface StudentNotesManagerProps {
  studentId: string
  courseId: string
  isOpen: boolean
  onClose: () => void
}

export function StudentNotesManager({ studentId, courseId, isOpen, onClose }: StudentNotesManagerProps) {
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка заметок только при открытии окна
  useEffect(() => {
    if (isOpen && studentId && courseId) {
      fetchNotes()
    }
  }, [isOpen, studentId, courseId])

  const fetchNotes = async () => {
    try {
      const isInitialLoad = notes.length === 0
      if (isInitialLoad) {
      setLoading(true)
      }
      setError(null)
      console.log("📥 [Notes] Загрузка заметок:", { studentId, courseId })
      const response = await fetch(`/api/student-notes?studentId=${studentId}&courseId=${courseId}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [Notes] Ошибка загрузки заметок:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error("Не удалось загрузить заметки")
      }

      const data = await response.json()
      console.log("✅ [Notes] Заметки загружены:", {
        count: data.notes?.length || 0,
        notes: data.notes
      })
      setNotes(data.notes || [])
    } catch (err) {
      console.error("❌ [Notes] Ошибка при загрузке заметок:", err)
      setError(err instanceof Error ? err.message : "Ошибка загрузки заметок")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async () => {
    if (!newNote.trim()) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/student-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseId,
          note: newNote.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Не удалось создать заметку")
      }

      const data = await response.json()
      // Очищаем поле ввода
      setNewNote("")
      // Обновляем заметки после создания для синхронизации
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания заметки")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/student-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          note: editingNoteText.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Не удалось обновить заметку")
      }

      const data = await response.json()
      // Очищаем состояние редактирования
      setEditingNoteId(null)
      setEditingNoteText("")
      // Обновляем заметки после редактирования для синхронизации
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления заметки")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту заметку?")) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/student-notes?noteId=${noteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Не удалось удалить заметку")
      }

      // Обновляем заметки после удаления для синхронизации
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления заметки")
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const startEditing = (note: StudentNote) => {
    setEditingNoteId(note.id)
    setEditingNoteText(note.note)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditingNoteText("")
    // После отмены редактирования можно возобновить автообновление
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary font-bold flex items-center gap-2">
            <MessageCircleIcon className="w-5 h-5" />
            Заметки
          </DialogTitle>
          <DialogDescription>
            Обмен заметками между автором и учеником
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Форма создания новой заметки */}
          <div className="bg-light-blue/30 p-4 rounded-lg border-2 border-primary/20">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Напишите заметку..."
              className="min-h-[100px] mb-3"
              disabled={loading}
            />
            <Button
              onClick={handleCreateNote}
              disabled={!newNote.trim() || loading}
              className="w-full"
            >
              <SendIcon className="w-4 h-4 mr-2" />
              Добавить заметку
            </Button>
          </div>

          {/* Список заметок */}
          {loading && notes.length === 0 ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-6 w-40 mx-auto" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageCircleIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Пока нет заметок</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-4 rounded-lg border-2",
                    note.created_by_type === "author"
                      ? "bg-primary/5 border-primary/20"
                      : "bg-slate-50 border-slate-200"
                  )}
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        className="min-h-[100px]"
                        disabled={loading}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={!editingNoteText.trim() || loading}
                          size="sm"
                        >
                          Сохранить
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="secondary"
                          size="sm"
                          disabled={loading}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={note.created_by_type === "author" ? "info" : "default"}
                              className="text-xs"
                            >
                              {note.created_by_type === "author" ? "Автор" : "Ученик"}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {note.created_by_email}
                            </span>
                          </div>
                          <p className="text-slate-900 whitespace-pre-wrap">{note.note}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => startEditing(note)}
                            className="h-8 w-8 p-0"
                            title="Редактировать"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Удалить"
                            disabled={loading}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">
                        {formatDateTime(note.created_at)}
                        {note.updated_at !== note.created_at && " (изменено)"}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

