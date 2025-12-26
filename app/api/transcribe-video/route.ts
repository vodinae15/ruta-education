import { NextRequest, NextResponse } from 'next/server'
import { HttpsProxyAgent } from 'https-proxy-agent'
import nodeFetch from 'node-fetch'

const HTTPS_PROXY = process.env.HTTPS_PROXY
const proxyAgent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Видео файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Неверный тип файла. Ожидается видео файл.' },
        { status: 400 }
      )
    }

    // Проверяем размер файла (максимум 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Размер файла не должен превышать 100MB' },
        { status: 400 }
      )
    }

    // Транскрибируем видео
    const transcription = await transcribeVideoWithAI(videoFile)

    return NextResponse.json({
      transcription,
      success: true
    })

  } catch (error) {
    console.error('Ошибка транскрибации видео:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

async function transcribeVideoWithAI(videoFile: File): Promise<string> {
  // Интеграция с OpenRouter API для видео
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const formData = new FormData()
      formData.append('file', videoFile)
      formData.append('model', 'openai/whisper-1')
      formData.append('language', 'ru')

      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://rutaeducation.ru',
          'X-Title': 'Ruta Education',
        },
        body: formData,
      }

      if (proxyAgent) {
        fetchOptions.agent = proxyAgent
      }

      const response = await nodeFetch('https://openrouter.ai/api/v1/audio/transcriptions', fetchOptions)

      if (response.ok) {
        const data = await response.json()
        return data.text
      } else {
        console.error('OpenRouter API error for video:', await response.text())
      }
    } catch (error) {
      console.error('Ошибка OpenRouter API для видео:', error)
    }
  }

  // Fallback: OpenAI API (если есть ключ)
  if (process.env.OPENAI_API_KEY) {
    try {
      const formData = new FormData()
      formData.append('file', videoFile)
      formData.append('model', 'whisper-1')
      formData.append('language', 'ru')

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.text
      }
    } catch (error) {
      console.error('Ошибка OpenAI API для видео:', error)
    }
  }

  // Пример интеграции с Google Cloud Video Intelligence API
  if (process.env.GOOGLE_CLOUD_API_KEY) {
    try {
      const videoBytes = await videoFile.arrayBuffer()
      const videoBase64 = Buffer.from(videoBytes).toString('base64')

      const response = await fetch(
        `https://videointelligence.googleapis.com/v1/videos:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputContent: videoBase64,
            features: ['SPEECH_TRANSCRIPTION'],
            videoContext: {
              speechTranscriptionConfig: {
                languageCode: 'ru-RU',
                enableAutomaticPunctuation: true,
              },
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        // Обрабатываем результат (это асинхронная операция)
        return 'Транскрибация видео запущена. Результат будет доступен позже.'
      }
    } catch (error) {
      console.error('Ошибка Google Cloud Video API:', error)
    }
  }

  // Fallback: возвращаем заглушку
  return 'Автоматическая транскрибация видео временно недоступна. Пожалуйста, введите описание вручную.'
}

// Альтернативная функция для интеграции с Rev.ai
async function transcribeVideoWithRevAI(videoFile: File): Promise<string> {
  if (!process.env.REV_AI_API_KEY) {
    throw new Error('Rev.ai API key не настроен')
  }

  try {
    // 1. Загружаем видео файл
    const uploadResponse = await fetch('https://api.rev.ai/speechtotext/v1/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REV_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_url: await uploadToStorage(videoFile), // Нужно загрузить в облачное хранилище
        language: 'ru',
      }),
    })

    const { id } = await uploadResponse.json()

    // 2. Ждем завершения транскрибации
    let transcript = null
    while (transcript === null) {
      const response = await fetch(`https://api.rev.ai/speechtotext/v1/jobs/${id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.REV_AI_API_KEY}`,
        },
      })
      const data = await response.json()
      
      if (data.status === 'transcribed') {
        // 3. Получаем транскрипт
        const transcriptResponse = await fetch(`https://api.rev.ai/speechtotext/v1/jobs/${id}/transcript`, {
          headers: {
            'Authorization': `Bearer ${process.env.REV_AI_API_KEY}`,
            'Accept': 'text/plain',
          },
        })
        transcript = await transcriptResponse.text()
      } else if (data.status === 'failed') {
        throw new Error('Ошибка транскрибации')
      } else {
        // Ждем 2 секунды перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return transcript
  } catch (error) {
    console.error('Ошибка Rev.ai:', error)
    throw error
  }
}

// Вспомогательная функция для загрузки в облачное хранилище
async function uploadToStorage(file: File): Promise<string> {
  // Здесь должна быть логика загрузки файла в облачное хранилище
  // (AWS S3, Google Cloud Storage, Azure Blob Storage и т.д.)
  // Возвращаем URL для доступа к файлу
  throw new Error('Функция загрузки в хранилище не реализована')
}

