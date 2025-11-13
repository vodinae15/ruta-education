"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StarIcon,
  BookOpenIcon
} from '@/components/ui/icons'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'milestone' | 'date' | 'event' | 'achievement'
  importance: 'high' | 'medium' | 'low'
}

interface TimelineRendererProps {
  content: string
  title?: string
}

export function TimelineRenderer({ content, title = "Хронология событий" }: TimelineRendererProps) {
  const [activeEvent, setActiveEvent] = useState<string | null>(null)
  const [completedEvents, setCompletedEvents] = useState<Set<string>>(new Set())
  
  const events = parseTimelineContent(content)
  
  const markEventCompleted = (eventId: string) => {
    setCompletedEvents(prev => new Set([...prev, eventId]))
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <StarIcon className="w-5 h-5" />
      case 'date': return <CalendarIcon className="w-5 h-5" />
      case 'event': return <ClockIcon className="w-5 h-5" />
      case 'achievement': return <CheckCircleIcon className="w-5 h-5" />
      default: return <BookOpenIcon className="w-5 h-5" />
    }
  }

  const getEventColor = (type: string, importance: string) => {
    if (importance === 'high') {
      switch (type) {
        case 'milestone': return 'bg-red-100 border-red-300 text-red-800'
        case 'date': return 'bg-blue-100 border-blue-300 text-blue-800'
        case 'event': return 'bg-green-100 border-green-300 text-green-800'
        case 'achievement': return 'bg-purple-100 border-purple-300 text-purple-800'
        default: return 'bg-gray-100 border-gray-300 text-gray-800'
      }
    } else if (importance === 'medium') {
      switch (type) {
        case 'milestone': return 'bg-red-50 border-red-200 text-red-700'
        case 'date': return 'bg-blue-50 border-blue-200 text-blue-700'
        case 'event': return 'bg-green-50 border-green-200 text-green-700'
        case 'achievement': return 'bg-purple-50 border-purple-200 text-purple-700'
        default: return 'bg-gray-50 border-gray-200 text-gray-700'
      }
    } else {
      switch (type) {
        case 'milestone': return 'bg-red-25 border-red-100 text-red-600'
        case 'date': return 'bg-blue-25 border-blue-100 text-blue-600'
        case 'event': return 'bg-green-25 border-green-100 text-green-600'
        case 'achievement': return 'bg-purple-25 border-purple-100 text-purple-600'
        default: return 'bg-gray-25 border-gray-100 text-gray-600'
      }
    }
  }

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high': return <Badge className="bg-red-100 text-red-800">Важно</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Средне</Badge>
      case 'low': return <Badge className="bg-gray-100 text-gray-800">Низко</Badge>
      default: return null
    }
  }

  return (
    <Card className="bg-white border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-primary font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6" />
          {title}
        </CardTitle>
        <p className="text-sm text-slate-600">
          Нажмите на событие для получения подробной информации
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Временная шкала */}
          <div className="relative">
            {/* Линия времени */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-300"></div>
            
            {events.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4 pb-6">
                {/* Точка на линии времени */}
                <div className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                  completedEvents.has(event.id) 
                    ? 'bg-green-500 border-green-500' 
                    : activeEvent === event.id 
                      ? 'bg-primary border-primary' 
                      : getEventColor(event.type, event.importance)
                }`}>
                  {completedEvents.has(event.id) ? (
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  ) : (
                    getEventIcon(event.type)
                  )}
                </div>
                
                {/* Содержимое события */}
                <div className="flex-1 min-w-0">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      activeEvent === event.id ? 'ring-2 ring-primary' : ''
                    } ${completedEvents.has(event.id) ? 'bg-green-50 border-green-200' : ''}`}
                    onClick={() => setActiveEvent(activeEvent === event.id ? null : event.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800">{event.title}</h3>
                            {getImportanceBadge(event.importance)}
                          </div>
                          <p className="text-sm text-slate-600 font-medium">{event.date}</p>
                        </div>
                        {!completedEvents.has(event.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              markEventCompleted(event.id)
                            }}
                            className="ml-2"
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Изучено
                          </Button>
                        )}
                      </div>
                      
                      {activeEvent === event.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-slate-700 leading-relaxed">{event.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>

          {/* Прогресс изучения */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Прогресс изучения</span>
              <span className="text-sm text-slate-600">
                {completedEvents.size} из {events.length} событий
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedEvents.size / events.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function parseTimelineContent(content: string): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const lines = content.split('\n')
  
  let eventId = 1
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) continue
    
    // Поиск дат в различных форматах
    const dateMatch = trimmedLine.match(/(\d{1,2}[.\-]\d{1,2}[.\-]\d{2,4}|\d{4}[.\-]\d{1,2}[.\-]\d{1,2}|\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4})/i)
    
    if (dateMatch) {
      const date = dateMatch[1]
      const restOfLine = trimmedLine.replace(date, '').trim()
      
      // Определяем тип события
      let type: TimelineEvent['type'] = 'date'
      let importance: TimelineEvent['importance'] = 'medium'
      
      if (restOfLine.toLowerCase().includes('важно') || restOfLine.toLowerCase().includes('ключевой')) {
        importance = 'high'
      } else if (restOfLine.toLowerCase().includes('незначительно') || restOfLine.toLowerCase().includes('второстепенно')) {
        importance = 'low'
      }
      
      if (restOfLine.toLowerCase().includes('достижение') || restOfLine.toLowerCase().includes('успех')) {
        type = 'achievement'
      } else if (restOfLine.toLowerCase().includes('этап') || restOfLine.toLowerCase().includes('веха')) {
        type = 'milestone'
      } else if (restOfLine.toLowerCase().includes('событие') || restOfLine.toLowerCase().includes('происшествие')) {
        type = 'event'
      }
      
      // Извлекаем заголовок и описание
      const titleMatch = restOfLine.match(/^[^:]+:/)
      const title = titleMatch ? titleMatch[0].slice(0, -1).trim() : restOfLine.split('.')[0].trim()
      const description = titleMatch ? restOfLine.replace(titleMatch[0], '').trim() : restOfLine
      
      events.push({
        id: `event_${eventId++}`,
        date,
        title: title || 'Событие',
        description: description || 'Описание события',
        type,
        importance
      })
    }
    
    // Поиск нумерованных списков с датами
    else if (trimmedLine.match(/^\d+\./)) {
      const content = trimmedLine.replace(/^\d+\.\s*/, '')
      const dateMatch = content.match(/(\d{1,2}[.\-]\d{1,2}[.\-]\d{2,4}|\d{4}[.\-]\d{1,2}[.\-]\d{1,2})/)
      
      if (dateMatch) {
        const date = dateMatch[1]
        const restOfContent = content.replace(date, '').trim()
        
        events.push({
          id: `event_${eventId++}`,
          date,
          title: restOfContent.split('.')[0].trim() || 'Событие',
          description: restOfContent,
          type: 'event',
          importance: 'medium'
        })
      }
    }
  }
  
  // Если событий нет, создаем из текста
  if (events.length === 0) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    sentences.slice(0, 5).forEach((sentence, index) => {
      events.push({
        id: `event_${eventId++}`,
        date: `Этап ${index + 1}`,
        title: sentence.trim().split(' ').slice(0, 5).join(' ') + '...',
        description: sentence.trim(),
        type: 'event',
        importance: index === 0 ? 'high' : 'medium'
      })
    })
  }
  
  return events
}
