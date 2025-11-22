"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  EyeIcon, 
  EarIcon, 
  HandIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  LightbulbIcon,
  TargetIcon
} from '@/components/ui/icons'
import { InteractiveDiagram, parseDiagramFromText } from './interactive-diagram'
import { StructuredContentRenderer } from './structured-content-renderer'
import { TimelineRenderer } from './timeline-renderer'

interface AdaptedContentProps {
  content: string
  studentType: 'visual' | 'auditory' | 'kinesthetic'
  originalTitle?: string
}

interface ContentBlock {
  type: 'heading' | 'text' | 'diagram' | 'list' | 'table' | 'quote' | 'exercise' | 'story' | 'interactive' | 'test' | 'practice' | 'simulation' | 'timeline'
  content: string
  level?: number
  metadata?: any
}

export function AdaptedContentRenderer({ content, studentType, originalTitle }: AdaptedContentProps) {
  // Проверяем, есть ли структурированный контент с заголовками
  const hasStructuredContent = content.includes('#') && content.split('\n').some(line => line.trim().startsWith('#'))
  
  if (hasStructuredContent) {
    return (
      <StructuredContentRenderer 
        content={content} 
        studentType={studentType} 
        title={originalTitle}
      />
    )
  }

  // Fallback к обычному рендерингу
  const blocks = parseContent(content)
  
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

      {/* Контент */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <ContentBlockRenderer key={index} block={block} studentType={studentType} />
        ))}
      </div>
    </div>
  )
}

function ContentBlockRenderer({ block, studentType }: { block: ContentBlock, studentType: string }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className={`${getHeadingClass(block.level || 1)} text-[#5589a7] font-bold`}>
          {block.content}
        </div>
      )
    
    case 'diagram':
      return <DiagramRenderer content={block.content} studentType={studentType} />
    
    case 'list':
      return <ListRenderer content={block.content} studentType={studentType} />
    
    case 'table':
      return <TableRenderer content={block.content} />
    
    case 'quote':
      // Проверяем, является ли это связкой между блоками
      if (block.metadata?.isConnector) {
        return (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
            <div className="bg-slate-100 px-4 py-2 rounded-full">
              <p className="text-slate-600 text-sm italic">{block.content}</p>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
          </div>
        )
      }
      
      return (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <LightbulbIcon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <p className="text-blue-800 italic">{block.content}</p>
            </div>
          </CardContent>
        </Card>
      )
    
    case 'exercise':
      return (
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-purple-800 text-lg flex items-center gap-2">
              <HandIcon className="w-5 h-5" />
              Практическое задание
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-700 whitespace-pre-wrap">{block.content}</div>
          </CardContent>
        </Card>
      )
    
    case 'story':
      return (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-800 text-lg flex items-center gap-2">
              <EarIcon className="w-5 h-5" />
              История
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-700 whitespace-pre-wrap">{block.content}</div>
          </CardContent>
        </Card>
      )
    
    case 'test':
      return (
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 text-lg flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              Тест на понимание
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-orange-700 whitespace-pre-wrap">{block.content}</div>
            <Button className="mt-3 bg-orange-600 hover:bg-orange-700 text-white">
              Пройти тест
            </Button>
          </CardContent>
        </Card>
      )
    
    case 'practice':
      return (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-emerald-800 text-lg flex items-center gap-2">
              <HandIcon className="w-5 h-5" />
              Практическое упражнение
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-emerald-700 whitespace-pre-wrap">{block.content}</div>
            <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
              Начать практику
            </Button>
          </CardContent>
        </Card>
      )
    
    case 'simulation':
      return (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-indigo-800 text-lg flex items-center gap-2">
              <TargetIcon className="w-5 h-5" />
              Интерактивная симуляция
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-indigo-700 whitespace-pre-wrap">{block.content}</div>
            <Button className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white">
              Запустить симуляцию
            </Button>
          </CardContent>
        </Card>
      )
    
    case 'interactive':
      return (
        <Card className="bg-teal-50 border-teal-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-teal-800 text-lg flex items-center gap-2">
              <EarIcon className="w-5 h-5" />
              Интерактивный элемент
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-teal-700 whitespace-pre-wrap">{block.content}</div>
            <Button className="mt-3 bg-teal-600 hover:bg-teal-700 text-white">
              Участвовать
            </Button>
          </CardContent>
        </Card>
      )
    
    case 'timeline':
      return <TimelineRenderer content={block.content} title="Важные даты и события" />
    
    default:
      return (
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
          {block.content}
        </div>
      )
  }
}

function DiagramRenderer({ content, studentType }: { content: string, studentType: string }) {
  // Попытка создать интерактивную диаграмму
  try {
    const { nodes, connections } = parseDiagramFromText(content)
    
    if (nodes.length > 0) {
      return (
        <InteractiveDiagram
          title="Интерактивная схема"
          nodes={nodes}
          connections={connections}
          studentType={studentType as 'visual' | 'auditory' | 'kinesthetic'}
        />
      )
    }
  } catch (error) {
    console.log('Не удалось создать интерактивную диаграмму, используем простую версию')
  }
  
  // Fallback к простой визуализации схемы
  const lines = content.split('\n').filter(line => line.trim())
  
  return (
    <Card className="bg-slate-50 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
          <EyeIcon className="w-5 h-5" />
          Схема
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white p-4 rounded-lg border font-mono text-sm overflow-x-auto">
          {lines.map((line, index) => (
            <div key={index} className="text-slate-700">
              {line}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ListRenderer({ content, studentType }: { content: string, studentType: string }) {
  const items = content.split('\n').filter(item => item.trim())
  
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">{index + 1}</span>
          </div>
          <div className="text-slate-700">{item.trim()}</div>
        </div>
      ))}
    </div>
  )
}

function TableRenderer({ content }: { content: string }) {
  const lines = content.split('\n').filter(line => line.trim())
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-slate-300">
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              {line.split('│').map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-slate-300 px-3 py-2 text-sm">
                  {cell.trim()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getHeadingClass(level: number): string {
  switch (level) {
    case 1: return 'text-3xl mb-4'
    case 2: return 'text-2xl mb-3'
    case 3: return 'text-xl mb-2'
    case 4: return 'text-lg mb-2'
    default: return 'text-base mb-1'
  }
}

function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const lines = content.split('\n')
  
  let currentBlock: ContentBlock | null = null
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      if (currentBlock) {
        blocks.push(currentBlock)
        currentBlock = null
      }
      continue
    }
    
    // Определяем тип блока
    if (trimmedLine.startsWith('БЛОК ')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'heading',
        content: trimmedLine,
        level: 3
      }
    } else if (trimmedLine.startsWith('#')) {
      if (currentBlock) blocks.push(currentBlock)
      const level = (trimmedLine.match(/^#+/) || [''])[0].length
      currentBlock = {
        type: 'heading',
        content: trimmedLine.replace(/^#+\s*/, ''),
        level
      }
    } else if (trimmedLine.includes('Изучив') || trimmedLine.includes('Теперь') || 
               trimmedLine.includes('Освоив') || trimmedLine.includes('Объединим') ||
               trimmedLine.includes('Чтобы') || trimmedLine.includes('Применим') ||
               trimmedLine.includes('Углубим') || trimmedLine.includes('Создадим')) {
      // Связки между блоками
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'quote',
        content: trimmedLine,
        metadata: { isConnector: true }
      }
    } else if (trimmedLine.includes('[ТЕСТ]') || trimmedLine.includes('[TEST]')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'test',
        content: line.replace(/\[ТЕСТ\]|\[TEST\]/g, '').trim()
      }
    } else if (trimmedLine.includes('[ПРАКТИКА]') || trimmedLine.includes('[ПРАКТИКА]')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'practice',
        content: line.replace(/\[ПРАКТИКА\]|\[PRACTICE\]/g, '').trim()
      }
    } else if (trimmedLine.includes('[СИМУЛЯЦИЯ]') || trimmedLine.includes('[СХЕМА]')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'simulation',
        content: line.replace(/\[СИМУЛЯЦИЯ\]|\[СХЕМА\]|\[SIMULATION\]/g, '').trim()
      }
    } else if (trimmedLine.includes('[ОБСУЖДЕНИЕ]') || trimmedLine.includes('[РЕФЛЕКСИЯ]') || trimmedLine.includes('[ИСТОРИЯ]')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'interactive',
        content: line.replace(/\[ОБСУЖДЕНИЕ\]|\[РЕФЛЕКСИЯ\]|\[ИСТОРИЯ\]|\[DISCUSSION\]|\[REFLECTION\]|\[STORY\]/g, '').trim()
      }
    } else if (trimmedLine.includes('┌') || trimmedLine.includes('╔') || trimmedLine.includes('[') || 
               trimmedLine.includes('→') || trimmedLine.includes('●') || trimmedLine.includes('■')) {
      if (currentBlock && currentBlock.type !== 'diagram') {
        blocks.push(currentBlock)
      }
      if (!currentBlock || currentBlock.type !== 'diagram') {
        currentBlock = { type: 'diagram', content: '' }
      }
      currentBlock.content += line + '\n'
    } else if (trimmedLine.match(/^\d+\./) || trimmedLine.startsWith('●') || trimmedLine.startsWith('✓') || 
               trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      if (currentBlock && currentBlock.type !== 'list') {
        blocks.push(currentBlock)
      }
      if (!currentBlock || currentBlock.type !== 'list') {
        currentBlock = { type: 'list', content: '' }
      }
      currentBlock.content += line + '\n'
    } else if (trimmedLine.includes('│') && (trimmedLine.includes('┌') || trimmedLine.includes('└'))) {
      if (currentBlock && currentBlock.type !== 'table') {
        blocks.push(currentBlock)
      }
      if (!currentBlock || currentBlock.type !== 'table') {
        currentBlock = { type: 'table', content: '' }
      }
      currentBlock.content += line + '\n'
    } else if (trimmedLine.startsWith('"') && trimmedLine.endsWith('"')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'quote',
        content: trimmedLine.slice(1, -1)
      }
    } else if (trimmedLine.toLowerCase().includes('задание') || trimmedLine.toLowerCase().includes('упражнение') ||
               trimmedLine.toLowerCase().includes('попробуйте') || trimmedLine.toLowerCase().includes('сделайте')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'exercise',
        content: line
      }
    } else if (trimmedLine.toLowerCase().includes('представьте') || trimmedLine.toLowerCase().includes('история') ||
               trimmedLine.toLowerCase().includes('диалог') || trimmedLine.toLowerCase().includes('кейс')) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        type: 'story',
        content: line
      }
    } else if (trimmedLine.toLowerCase().includes('дата') || trimmedLine.toLowerCase().includes('время') ||
               trimmedLine.toLowerCase().includes('хронология') || trimmedLine.toLowerCase().includes('этап') ||
               trimmedLine.match(/\d{1,2}[.\-]\d{1,2}[.\-]\d{2,4}/) || trimmedLine.match(/\d{4}[.\-]\d{1,2}[.\-]\d{1,2}/)) {
      if (currentBlock && currentBlock.type !== 'timeline') {
        blocks.push(currentBlock)
      }
      if (!currentBlock || currentBlock.type !== 'timeline') {
        currentBlock = { type: 'timeline', content: '' }
      }
      currentBlock.content += line + '\n'
    } else {
      if (!currentBlock) {
        currentBlock = { type: 'text', content: '' }
      }
      currentBlock.content += line + '\n'
    }
  }
  
  if (currentBlock) {
    blocks.push(currentBlock)
  }
  
  return blocks
}
