"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FixDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const fixStudentAuth = async () => {
    setLoading(true)
    setResult('')

    try {
      const response = await fetch('/api/fix-student-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult(`✅ Успешно: ${JSON.stringify(data, null, 2)}`)
      } else {
        setResult(`❌ Ошибка: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      setResult(`❌ Ошибка: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-gray p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Исправление авторизации студентов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Этот инструмент временно отключает RLS (Row Level Security) для таблиц студентов,
              чтобы исправить проблему с авторизацией.
            </p>
            
            <Button 
              onClick={fixStudentAuth} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Выполняется...' : 'Исправить авторизацию студентов'}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">{result}</pre>
              </div>
            )}

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Важно:</h3>
              <p className="text-yellow-700 text-sm">
                Это временное решение. После тестирования необходимо включить RLS обратно 
                с правильными политиками безопасности.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
