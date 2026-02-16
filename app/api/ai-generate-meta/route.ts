import { NextRequest, NextResponse } from 'next/server'
import { HttpsProxyAgent } from 'https-proxy-agent'
import nodeFetch from 'node-fetch'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
const HTTPS_PROXY = process.env.HTTPS_PROXY

const proxyAgent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined

const TEMPLATE_PROMPTS: Record<string, string> = {
  expectations: `Напиши вступительный текст для блока "Как работать с уроком" в формате "Ожидания от урока".

Содержание должно:
- Объяснить, что ученик узнает в этом уроке
- Перечислить ключевые навыки, которые он получит
- Мотивировать на прохождение
- Быть кратким (3-5 абзацев)

Пиши от лица автора курса, доброжелательно и конкретно.`,

  anxiety: `Напиши вступительный текст для блока "Как работать с уроком" в формате "Снятие тревоги".

Содержание должно:
- Поддержать ученика перед сложной темой
- Объяснить, что ошибки — нормальная часть обучения
- Дать понять, что материал подаётся пошагово
- Снять страх перед новым
- Быть кратким (3-5 абзацев)

Пиши тёпло и поддерживающе, от лица автора курса.`,

  format: `Напиши вступительный текст для блока "Как работать с уроком" в формате "Формат работы".

Содержание должно:
- Объяснить структуру урока (какие блоки, в каком порядке)
- Примерно оценить время на прохождение
- Рассказать, как лучше работать с материалом
- Дать рекомендации по записи заметок
- Быть кратким (3-5 абзацев)

Пиши деловым, но дружелюбным тоном.`,
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const { template, lessonContent, lessonTitle } = await request.json()

    if (!template || !TEMPLATE_PROMPTS[template]) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      )
    }

    const systemPrompt = `Ты — помощник автора онлайн-курса. Генерируй тексты для вступительного блока урока на основе его содержания.

Правила:
- Пиши на русском языке
- Текст должен быть готов к публикации без редактирования
- Используй информацию из содержания урока для конкретики
- Не используй маркдаун-разметку, пиши простым текстом
- Каждый абзац с новой строки`

    const userPrompt = `${TEMPLATE_PROMPTS[template]}

Название урока: "${lessonTitle}"

Содержание урока (на основе которого нужно писать):
${lessonContent ? lessonContent.substring(0, 3000) : 'Содержание пока не заполнено. Напиши общий шаблон.'}`

    const openRouterRequestBody = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }

    const fetchOptions: any = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
        'X-Title': 'Ruta Meta Block Generation',
      },
      body: JSON.stringify(openRouterRequestBody),
    }

    if (proxyAgent) {
      fetchOptions.agent = proxyAgent
    }

    const response = await nodeFetch(OPENROUTER_API_URL, fetchOptions)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[AI Generate Meta] API error:', response.status, errorData)
      return NextResponse.json(
        { success: false, error: `OpenRouter API error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json() as any
    const generatedText = data.choices?.[0]?.message?.content

    if (!generatedText) {
      return NextResponse.json(
        { success: false, error: 'No response from AI model' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, generatedText })
  } catch (error) {
    console.error('[AI Generate Meta] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
