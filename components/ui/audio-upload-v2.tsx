"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { MicIcon, PlayIcon, PauseIcon, UploadIcon, TrashIcon, FileTextIcon, XIcon } from "./icons"

interface AudioUploadProps {
  onAudioUpload: (fileId: string, fileUrl: string, fileName: string) => void
  onTranscription?: (transcription: string) => void
  courseId: string
  lessonId?: string
  blockId?: string
  elementId?: string
  initialAudioUrl?: string
  initialFileId?: string
  className?: string
}

export function AudioUploadV2({
  onAudioUpload,
  onTranscription,
  courseId,
  lessonId,
  blockId,
  elementId,
  initialAudioUrl,
  initialFileId,
  className = "",
}: AudioUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null)
  const [fileId, setFileId] = useState<string | null>(initialFileId || null)
  const [fileName, setFileName] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)

  const uploadToServer = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileType", "audio")
      formData.append("courseId", courseId)
      if (lessonId) formData.append("lessonId", lessonId)
      if (blockId) formData.append("blockId", blockId)
      if (elementId) formData.append("elementId", elementId)

      // Симулируем прогресс
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Ошибка загрузки аудио")
      }

      const data = await response.json()

      setAudioUrl(data.file.url)
      setFileId(data.file.id)
      setFileName(data.file.fileName)
      setUploadProgress(100)

      onAudioUpload(data.file.id, data.file.url, data.file.fileName)

      return data.file
    } catch (err: any) {
      console.error("Audio upload error:", err)
      setError(err.message || "Ошибка при загрузке аудио")
      throw err
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("audio/")) {
      setError("Пожалуйста, выберите аудио файл")
      return
    }

    await uploadToServer(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const audioChunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" })
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: "audio/wav" })

        // Создаем локальный URL для предпросмотра
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        setRecordedFile(audioFile)

        // Останавливаем все треки
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Recording error:", error)
      setError("Не удалось получить доступ к микрофону")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const saveRecording = async () => {
    if (!recordedFile) return

    try {
      await uploadToServer(recordedFile)
      setRecordedFile(null)
    } catch (err) {
      console.error("Save recording error:", err)
    }
  }

  const transcribeAudio = async () => {
    if (!fileId) return

    setIsTranscribing(true)

    try {
      // TODO: Интеграция с Whisper API или другим сервисом транскрибации
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      })

      if (response.ok) {
        const { transcription } = await response.json()
        onTranscription?.(transcription)
      } else {
        setError("Транскрибация временно недоступна")
      }
    } catch (error) {
      console.error("Transcription error:", error)
      setError("Ошибка при транскрибации")
    } finally {
      setIsTranscribing(false)
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const handleDelete = async () => {
    if (!fileId) {
      // Если это локальная запись, просто очищаем
      setAudioUrl(null)
      setRecordedFile(null)
      return
    }

    try {
      const response = await fetch(`/api/upload?fileId=${fileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Ошибка удаления аудио")
      }

      setAudioUrl(null)
      setFileId(null)
      setFileName("")
      setRecordedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      onAudioUpload("", "", "")
    } catch (err) {
      console.error("Delete error:", err)
      setError("Ошибка при удалении аудио")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Кнопки управления */}
          <div className="flex flex-wrap gap-2">
            {!audioUrl && (
              <>
                {!isRecording ? (
                  <Button onClick={startRecording} variant="outline" className="flex items-center gap-2">
                    <MicIcon className="w-4 h-4" />
                    Записать голос
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                    <PauseIcon className="w-4 h-4" />
                    Остановить ({formatTime(recordingTime)})
                  </Button>
                )}

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={isUploading}
                >
                  <UploadIcon className="w-4 h-4" />
                  {isUploading ? "Загрузка..." : "Загрузить файл"}
                </Button>
              </>
            )}

            {audioUrl && recordedFile && !fileId && (
              <Button onClick={saveRecording} className="flex items-center gap-2" disabled={isUploading}>
                <UploadIcon className="w-4 h-4" />
                {isUploading ? "Сохранение..." : "Сохранить запись"}
              </Button>
            )}

            {audioUrl && fileId && (
              <>
                {onTranscription && (
                  <Button
                    onClick={transcribeAudio}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={isTranscribing}
                  >
                    <FileTextIcon className="w-4 h-4" />
                    {isTranscribing ? "Распознавание..." : "Распознать"}
                  </Button>
                )}
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                  Удалить
                </Button>
              </>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />

          {/* Прогресс загрузки */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Загрузка аудио...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-[#659AB8] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <XIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Предпросмотр аудио */}
          {audioUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button onClick={playAudio} variant="outline" size="sm" className="flex items-center gap-2">
                  {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                  {isPlaying ? "Пауза" : "Воспроизвести"}
                </Button>
                {fileName && <span className="text-sm text-slate-600 truncate">{fileName}</span>}
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                className="w-full"
                controls
              />
            </div>
          )}

          {/* Инструкции */}
          {!audioUrl && !isUploading && !isRecording && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <ul className="list-disc list-inside space-y-1">
                <li>Запишите голос с микрофона или загрузите файл</li>
                <li>Форматы: MP3, WAV, M4A, OGG</li>
                <li>Максимальный размер: 50MB</li>
                {onTranscription && <li>Доступна автоматическая транскрибация в текст</li>}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
