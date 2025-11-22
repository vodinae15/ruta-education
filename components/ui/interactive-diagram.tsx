"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  EyeIcon, 
  ArrowRightIcon, 
  CheckCircleIcon,
  LightbulbIcon
} from '@/components/ui/icons'

interface DiagramNode {
  id: string
  label: string
  type: 'start' | 'process' | 'decision' | 'end'
  description?: string
  children?: string[]
}

interface InteractiveDiagramProps {
  title: string
  nodes: DiagramNode[]
  connections: Array<{ from: string; to: string; label?: string }>
  studentType: 'visual' | 'auditory' | 'kinesthetic'
}

export function InteractiveDiagram({ title, nodes, connections, studentType }: InteractiveDiagramProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set())

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
    setVisitedNodes(prev => new Set([...prev, nodeId]))
  }

  const getNodeStyle = (node: DiagramNode) => {
    const baseStyle = "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200"
    
    if (activeNode === node.id) {
      return `${baseStyle} border-[#659AB8] bg-[#659AB8]/10`
    }
    
    if (visitedNodes.has(node.id)) {
      return `${baseStyle} border-green-300 bg-green-50`
    }
    
    switch (node.type) {
      case 'start':
        return `${baseStyle} border-blue-300 bg-blue-50`
      case 'end':
        return `${baseStyle} border-red-300 bg-red-50`
      case 'decision':
        return `${baseStyle} border-yellow-300 bg-yellow-50`
      default:
        return `${baseStyle} border-slate-300 bg-white`
    }
  }

  const getNodeIcon = (node: DiagramNode) => {
    switch (node.type) {
      case 'start':
        return <CheckCircleIcon className="w-4 h-4 text-blue-600" />
      case 'end':
        return <CheckCircleIcon className="w-4 h-4 text-red-600" />
      case 'decision':
        return <LightbulbIcon className="w-4 h-4 text-yellow-600" />
      default:
        return <ArrowRightIcon className="w-4 h-4 text-slate-600" />
    }
  }

  return (
    <Card className="bg-white border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
          <EyeIcon className="w-5 h-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-slate-600">
          Нажмите на элементы схемы для подробной информации
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Диаграмма */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={getNodeStyle(node)}
                onClick={() => handleNodeClick(node.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getNodeIcon(node)}
                  <span className="font-semibold text-slate-800">{node.label}</span>
                </div>
                {node.description && (
                  <p className="text-sm text-slate-600">{node.description}</p>
                )}
              </div>
            ))}
          </div>

          {/* Соединения */}
          {connections.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Связи:</h4>
              <div className="space-y-1">
                {connections.map((conn, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">
                      {nodes.find(n => n.id === conn.from)?.label}
                    </span>
                    <ArrowRightIcon className="w-3 h-3" />
                    <span className="font-medium">
                      {nodes.find(n => n.id === conn.to)?.label}
                    </span>
                    {conn.label && (
                      <Badge variant="outline" className="text-xs">
                        {conn.label}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Детальная информация */}
          {activeNode && (
            <div className="border-t pt-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">
                  {nodes.find(n => n.id === activeNode)?.label}
                </h4>
                <p className="text-slate-600 text-sm">
                  {nodes.find(n => n.id === activeNode)?.description || 
                   'Подробная информация об этом элементе...'}
                </p>
              </div>
            </div>
          )}

          {/* Прогресс изучения */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Прогресс изучения</span>
              <span className="text-sm text-slate-600">
                {visitedNodes.size} из {nodes.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-[#659AB8] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(visitedNodes.size / nodes.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Функция для парсинга ASCII-диаграммы в структурированные данные
export function parseDiagramFromText(text: string): { nodes: DiagramNode[], connections: Array<{ from: string; to: string; label?: string }> } {
  const lines = text.split('\n').filter(line => line.trim())
  const nodes: DiagramNode[] = []
  const connections: Array<{ from: string; to: string; label?: string }> = []
  
  // Улучшенный парсер для различных типов диаграмм
  let nodeId = 1
  const nodeMap = new Map<string, string>()
  
  for (const line of lines) {
    // Поиск узлов в квадратных скобках [текст]
    if (line.includes('[') && line.includes(']')) {
      const matches = line.match(/\[([^\]]+)\]/g)
      if (matches) {
        matches.forEach(match => {
          const label = match.slice(1, -1).trim()
          const id = `node_${nodeId++}`
          nodeMap.set(label, id)
          
          let type: DiagramNode['type'] = 'process'
          if (label.toLowerCase().includes('начало') || label.toLowerCase().includes('старт') || 
              label.toLowerCase().includes('start') || label.toLowerCase().includes('вход')) {
            type = 'start'
          } else if (label.toLowerCase().includes('конец') || label.toLowerCase().includes('финиш') || 
                     label.toLowerCase().includes('end') || label.toLowerCase().includes('выход')) {
            type = 'end'
          } else if (label.toLowerCase().includes('решение') || label.toLowerCase().includes('выбор') || 
                     label.toLowerCase().includes('decision') || label.toLowerCase().includes('условие')) {
            type = 'decision'
          }
          
          nodes.push({
            id,
            label,
            type,
            description: `Подробное описание: ${label}. Нажмите для получения дополнительной информации.`
          })
        })
      }
    }
    
    // Поиск узлов в других форматах
    else if (line.includes('┌') || line.includes('╔') || line.includes('┐') || line.includes('┘')) {
      // Блочные диаграммы
      const textMatch = line.match(/[┌╔┐┘└╚╗╝][\s\S]*?[┌╔┐┘└╚╗╝]|[\w\s]+/)
      if (textMatch) {
        const label = textMatch[0].replace(/[┌╔┐┘└╚╗╝│─]/g, '').trim()
        if (label && label.length > 0) {
          const id = `node_${nodeId++}`
          nodeMap.set(label, id)
          
          let type: DiagramNode['type'] = 'process'
          if (label.toLowerCase().includes('начало') || label.toLowerCase().includes('старт')) {
            type = 'start'
          } else if (label.toLowerCase().includes('конец') || label.toLowerCase().includes('финиш')) {
            type = 'end'
          } else if (label.toLowerCase().includes('решение') || label.toLowerCase().includes('выбор')) {
            type = 'decision'
          }
          
          nodes.push({
            id,
            label,
            type,
            description: `Блок: ${label}. Содержит важную информацию для понимания темы.`
          })
        }
      }
    }
    
    // Поиск стрелок и связей
    if (line.includes('→') || line.includes('->') || line.includes('=>')) {
      const arrowMatch = line.match(/([^→\-=>]+)[→\-=>]+([^→\-=>]+)/)
      if (arrowMatch) {
        const fromLabel = arrowMatch[1].trim()
        const toLabel = arrowMatch[2].trim()
        
        if (nodeMap.has(fromLabel) && nodeMap.has(toLabel)) {
          connections.push({
            from: nodeMap.get(fromLabel)!,
            to: nodeMap.get(toLabel)!,
            label: 'связь'
          })
        }
      }
    }
  }
  
  // Если узлов мало, создаем дополнительные из текста
  if (nodes.length < 2) {
    const words = text.split(/\s+/).filter(word => 
      word.length > 3 && 
      !word.match(/[┌╔┐┘└╚╗╝│─→\-=>]/) &&
      !word.includes('[') && !word.includes(']')
    )
    
    words.slice(0, 5).forEach((word, index) => {
      const id = `node_${nodeId++}`
      const label = word.charAt(0).toUpperCase() + word.slice(1)
      
      nodes.push({
        id,
        label,
        type: index === 0 ? 'start' : index === words.length - 1 ? 'end' : 'process',
        description: `Концепция: ${label}. Важный элемент для понимания темы.`
      })
    })
  }
  
  return { nodes, connections }
}
