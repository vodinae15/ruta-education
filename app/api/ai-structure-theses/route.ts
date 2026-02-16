import { NextRequest, NextResponse } from 'next/server'
import { HttpsProxyAgent } from 'https-proxy-agent'
import nodeFetch from 'node-fetch'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
const HTTPS_PROXY = process.env.HTTPS_PROXY

const proxyAgent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const { theses, blockTitle } = await request.json()

    if (!theses || !theses.trim()) {
      return NextResponse.json(
        { success: false, error: 'Theses text is required' },
        { status: 400 }
      )
    }

    const systemPrompt = `Ты — помощник автора онлайн-курса. Твоя задача — структурировать черновые заметки и тезисы автора в логичную структуру.

Правила:
- Сохраняй авторский голос и формулировки
- Не переписывай и не дополняй содержание
- Группируй тезисы по смысловым блокам
- Используй маркированные списки с тире (—)
- Если есть логическая последовательность, сохрани её
- Добавь краткие заголовки для групп тезисов, если их больше 3
- Результат должен быть готов к использованию как план блока урока`

    const userPrompt = `Структурируй тезисы для блока "${blockTitle}":\n\n${theses}`

    const openRouterRequestBody = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }

    const fetchOptions: any = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
        'X-Title': 'Ruta Theses Structuring',
      },
      body: JSON.stringify(openRouterRequestBody),
    }

    if (proxyAgent) {
      fetchOptions.agent = proxyAgent
    }

    const response = await nodeFetch(OPENROUTER_API_URL, fetchOptions)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[AI Structure Theses] API error:', response.status, errorData)
      return NextResponse.json(
        { success: false, error: `OpenRouter API error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json() as any
    const structured = data.choices?.[0]?.message?.content

    if (!structured) {
      return NextResponse.json(
        { success: false, error: 'No response from AI model' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, structured })
  } catch (error) {
    console.error('[AI Structure Theses] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
