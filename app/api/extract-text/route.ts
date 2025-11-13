import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    const isDOCX = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   fileName.endsWith('.docx')
    const isDOC = fileType === 'application/msword' || fileName.endsWith('.doc')

    if (!isPDF && !isDOCX && !isDOC) {
      return NextResponse.json(
        { error: 'Неверный тип файла. Ожидается PDF или DOCX файл.' },
        { status: 400 }
      )
    }

    // Извлекаем текст из файла
    let extractedText = ''
    
    if (isPDF) {
      extractedText = await extractTextFromPDF(file)
    } else if (isDOCX) {
      extractedText = await extractTextFromDOCX(file)
    } else if (isDOC) {
      // DOC файлы требуют специальной обработки, пока возвращаем ошибку
      return NextResponse.json(
        { error: 'Формат DOC не поддерживается. Пожалуйста, используйте DOCX или PDF.' },
        { status: 400 }
      )
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Не удалось извлечь текст из файла' },
        { status: 400 }
      )
    }

    // Структурируем текст через GPT-4
    const structuredText = await structureText(extractedText)

    return NextResponse.json({
      transcription: structuredText,
      success: true
    })

  } catch (error) {
    console.error('Ошибка извлечения текста:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Извлечение текста из PDF
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Используем require для pdf-parse (CommonJS модуль)
    const pdfParse = require('pdf-parse')
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const data = await pdfParse(buffer)
    return data.text
  } catch (error) {
    console.error('Ошибка извлечения текста из PDF:', error)
    throw new Error('Не удалось извлечь текст из PDF файла')
  }
}

// Извлечение текста из DOCX
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Используем require для mammoth (CommonJS модуль)
    const mammoth = require('mammoth')
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    console.error('Ошибка извлечения текста из DOCX:', error)
    throw new Error('Не удалось извлечь текст из DOCX файла')
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

