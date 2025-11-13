"use client"

import React, { useState, useRef } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { MicIcon, PlayIcon, PauseIcon, UploadIcon, TrashIcon, FileTextIcon } from "./icons"

interface AudioUploadProps {
  onAudioUpload: (audioFile: File) => void
  onTranscription: (transcription: string) => void
  isRecording?: boolean
  onRecordingChange?: (isRecording: boolean) => void
  className?: string
}

export function AudioUpload({
  onAudioUpload,
  onTranscription,
  isRecording = false,
  onRecordingChange,
  className = ""
}: AudioUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('audio/')) {
      alert('Пожалуйста, выберите аудио файл')
      return
    }

    setIsUploading(true)
    
    try {
      // Создаем URL для предпросмотра
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setUploadedFile(file)
      
      // Вызываем callback для загрузки файла
      onAudioUpload(file)
      
      // НЕ запускаем транскрибацию автоматически - только по кнопке
      
    } catch (error) {
      console.error('Ошибка загрузки аудио:', error)
      alert('Ошибка при загрузке аудио файла')
    } finally {
      setIsUploading(false)
    }
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
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' })
        
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        setUploadedFile(audioFile)
        
        onAudioUpload(audioFile)
        // НЕ запускаем транскрибацию автоматически - только по кнопке
        
        // Останавливаем все треки
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      onRecordingChange?.(true)
      
      // Запускаем таймер записи
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Ошибка записи:', error)
      alert('Не удалось получить доступ к микрофону')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      onRecordingChange?.(false)
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const transcribeAudio = async (audioFile: File) => {
    setIsTranscribing(true)
    
    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const { transcription } = await response.json()
        onTranscription(transcription)
      } else {
        const errorData = await response.json()
        onTranscription('')
        alert(errorData.error || 'Ошибка при транскрибации аудио. Пожалуйста, введите текст вручную.')
      }
      
    } catch (error) {
      console.error('Ошибка транскрибации:', error)
      onTranscription('')
      alert('Ошибка при транскрибации аудио. Пожалуйста, введите текст вручную.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleTranscribe = async () => {
    if (!uploadedFile) return
    await transcribeAudio(uploadedFile)
  }

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const clearAudio = () => {
    setAudioUrl(null)
    setUploadedFile(null)
    setIsPlaying(false)
    setRecordingTime(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Кнопки управления */}
          <div className="flex gap-2">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MicIcon className="w-4 h-4" />
                Записать голос
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="flex items-center gap-2"
              >
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
              {isUploading ? 'Загрузка...' : 'Загрузить файл'}
            </Button>
            
            {audioUrl && (
              <>
                <Button
                  onClick={handleTranscribe}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isTranscribing}
                >
                  <FileTextIcon className="w-4 h-4" />
                  {isTranscribing ? 'Распознавание...' : 'Распознать'}
                </Button>
                <Button
                  onClick={clearAudio}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Очистить
                </Button>
              </>
            )}
          </div>

          {/* Скрытый input для загрузки файлов */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Предпросмотр аудио */}
          {audioUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={playAudio}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                  {isPlaying ? 'Пауза' : 'Воспроизвести'}
                </Button>
                
                {isTranscribing && (
                  <span className="text-sm text-gray-500">
                    Транскрибация...
                  </span>
                )}
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
          <div className="text-sm text-gray-600">
            <p>• Нажмите "Записать голос" для записи с микрофона</p>
            <p>• Или загрузите аудио файл (MP3, WAV, M4A)</p>
            <p>• После загрузки нажмите "Распознать" для транскрибации в текст</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

