"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  EyeIcon, 
  EarIcon, 
  HandIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  LightbulbIcon,
  TargetIcon,
  BookOpenIcon,
  PlayIcon,
  FileTextIcon
} from '@/components/ui/icons'

interface StructuredContentProps {
  content: string
  studentType: 'visual' | 'auditory' | 'kinesthetic'
  title?: string
}

interface ContentSection {
  id: string
  type: 'theory' | 'example' | 'practice' | 'test' | 'summary'
  title: string
  content: string
  order: number
  completed?: boolean
}

export function StructuredContentRenderer({ content, studentType, title }: StructuredContentProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  
  const sections = parseStructuredContent(content)
  
  const getPresentationModeInfo = () => {
    switch (studentType) {
      case 'visual':
        return {
          name: 'Визуал',
          icon: <EyeIcon className="w-5 h-5" />,
          color: 'bg-blue-100 text-blue-800',
          description: 'Структурированная подача с схемами и диаграммами'
        }
      case 'auditory':
        return {
          name: 'Аудиал',
          icon: <EarIcon className="w-5 h-5" />,
          color: 'bg-green-100 text-green-800',
          description: 'Истории и диалоги для лучшего восприятия'
        }
      case 'kinesthetic':
        return {
          name: 'Кинестетик',
          icon: <HandIcon className="w-5 h-5" />,
          color: 'bg-purple-100 text-purple-800',
          description: 'Практические задания и интерактивные элементы'
        }
    }
  }

  const presentationModeInfo = getPresentationModeInfo()

  const markSectionCompleted = (sectionId: string) => {
    setCompletedSections(prev => new Set([...prev, sectionId]))
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'theory': return <BookOpenIcon className="w-5 h-5" />
      case 'example': return <LightbulbIcon className="w-5 h-5" />
      case 'practice': return <HandIcon className="w-5 h-5" />
      case 'test': return <CheckCircleIcon className="w-5 h-5" />
      case 'summary': return <TargetIcon className="w-5 h-5" />
      default: return <FileTextIcon className="w-5 h-5" />
    }
  }

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'theory': return 'bg-blue-50 border-blue-200'
      case 'example': return 'bg-yellow-50 border-yellow-200'
      case 'practice': return 'bg-green-50 border-green-200'
      case 'test': return 'bg-orange-50 border-orange-200'
      case 'summary': return 'bg-purple-50 border-purple-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getSectionTextColor = (type: string) => {
    switch (type) {
      case 'theory': return 'text-blue-800'
      case 'example': return 'text-yellow-800'
      case 'practice': return 'text-green-800'
      case 'test': return 'text-orange-800'
      case 'summary': return 'text-purple-800'
      default: return 'text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с режимом представления материала */}
      <div className="flex items-center gap-3 mb-6">
        <Badge className={presentationModeInfo.color}>
          {presentationModeInfo.icon}
          <span className="ml-1">{presentationModeInfo.name}</span>
        </Badge>
        <span className="text-sm text-slate-600">{presentationModeInfo.description}</span>
      </div>

      {/* Навигация по разделам */}
      <Card className="bg-white border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-primary font-bold">
            Структура урока
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => (
              <Button
                key={section.id}
                variant="outline"
                className={`h-auto p-4 text-left justify-start ${
                  activeSection === section.id ? 'border-primary bg-primary/5' : ''
                } ${completedSections.has(section.id) ? 'border-green-300 bg-green-50' : ''}`}
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${getSectionColor(section.type)}`}>
                    {getSectionIcon(section.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{section.title}</div>
                    <div className="text-xs text-slate-500 capitalize">{section.type}</div>
                  </div>
                  {completedSections.has(section.id) && (
                    <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Содержимое активного раздела */}
      {activeSection && (
        <Card className="bg-white border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-lg font-bold ${getSectionTextColor(sections.find(s => s.id === activeSection)?.type || 'theory')}`}>
                {sections.find(s => s.id === activeSection)?.title}
              </CardTitle>
              {!completedSections.has(activeSection) && (
                <Button
                  size="sm"
                  onClick={() => markSectionCompleted(activeSection)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Завершить
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {sections.find(s => s.id === activeSection)?.content}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Прогресс изучения */}
      <Card className="bg-white border-2">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Прогресс изучения</span>
            <span className="text-sm text-slate-600">
              {completedSections.size} из {sections.length} разделов
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${(completedSections.size / sections.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function parseStructuredContent(content: string): ContentSection[] {
  const sections: ContentSection[] = []
  const lines = content.split('\n')
  
  let currentSection: ContentSection | null = null
  let sectionId = 1
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) continue
    
    // Определяем тип раздела по заголовкам
    if (trimmedLine.startsWith('#')) {
      if (currentSection) {
        sections.push(currentSection)
      }
      
      const level = (trimmedLine.match(/^#+/) || [''])[0].length
      const title = trimmedLine.replace(/^#+\s*/, '')
      
      let type: ContentSection['type'] = 'theory'
      if (title.toLowerCase().includes('пример') || title.toLowerCase().includes('кейс')) {
        type = 'example'
      } else if (title.toLowerCase().includes('практика') || title.toLowerCase().includes('задание')) {
        type = 'practice'
      } else if (title.toLowerCase().includes('тест') || title.toLowerCase().includes('проверка')) {
        type = 'test'
      } else if (title.toLowerCase().includes('итог') || title.toLowerCase().includes('вывод')) {
        type = 'summary'
      }
      
      currentSection = {
        id: `section_${sectionId++}`,
        type,
        title,
        content: '',
        order: sectionId - 1
      }
    } else if (currentSection) {
      currentSection.content += line + '\n'
    }
  }
  
  if (currentSection) {
    sections.push(currentSection)
  }
  
  // Если разделов нет, создаем один общий
  if (sections.length === 0) {
    sections.push({
      id: 'section_1',
      type: 'theory',
      title: 'Основной материал',
      content: content,
      order: 1
    })
  }
  
  return sections
}
