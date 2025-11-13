import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Аудио файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Неверный тип файла. Ожидается аудио файл.' },
        { status: 400 }
      )
    }

    // Здесь будет интеграция с AI сервисом для транскрибации
    // Примеры сервисов:
    // 1. OpenAI Whisper API
    // 2. Google Cloud Speech-to-Text
    // 3. Azure Speech Services
    // 4. AssemblyAI
    // 5. Rev.ai

    // Пока что возвращаем заглушку
    const transcription = await transcribeWithAI(audioFile)

    return NextResponse.json({
      transcription,
      success: true
    })

  } catch (error) {
    console.error('Ошибка транскрибации:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

async function transcribeWithAI(audioFile: File): Promise<string> {
  // Используем OpenAI Whisper API
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY не настроен в переменных окружения')
  }
  
  try {
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', 'ru')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      const rawText = data.text
      
      // Структурируем текст через GPT-4
      const structuredText = await structureText(rawText)
      return structuredText
    } else {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error('Ошибка транскрибации')
    }
  } catch (error) {
    console.error('Ошибка OpenAI API:', error)
    throw error
  }
}

// Функция для структуризации текста через GPT-4
async function structureText(text: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY не настроен в переменных окружения')
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Ты помощник для структуризации текста. Форматируй текст: разбивай на абзацы, выделяй ключевые мысли, создавай списки где уместно. Сохраняй смысл и стиль оригинала.'
          },
          {
            role: 'user',
            content: `Структурируй следующий текст для учебного формата:\n\n${text}`
          }
        ],
        temperature: 0.3,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0].message.content
    } else {
      // Если структуризация не удалась, возвращаем исходный текст
      console.error('Ошибка структуризации:', await response.text())
      return text
    }
  } catch (error) {
    console.error('Ошибка структуризации текста:', error)
    // Возвращаем исходный текст при ошибке
    return text
  }
}


