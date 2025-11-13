"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdaptationElement } from "@/lib/adaptation-logic"
import { VisualDiagram } from "./visual-diagram"
import { AudioPlayer } from "./audio-player"
import { InteractiveSimulation } from "./interactive-simulation"
import { ComparisonTable } from "./comparison-table"
import { StoryContent } from "./story-content"
import { InteractiveElement } from "./interactive-element"
import { Checklist } from "./checklist"
import { AlertTriangleIcon } from "@/components/ui/icons"

interface AdaptationElementRendererProps {
  element: AdaptationElement
  blockNumber: number
  onInteraction?: (type: string, data?: any) => void
}

// Функция для проверки валидности данных элемента
function validateElementData(element: AdaptationElement): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!element.data) {
    errors.push('Отсутствуют данные элемента')
    return { valid: false, errors }
  }

  switch (element.type) {
    case 'diagram':
      if (element.data.layers && Array.isArray(element.data.layers)) {
        // Многослойная диаграмма
        if (element.data.layers.length === 0) {
          errors.push('Массив layers пуст')
        }
        element.data.layers.forEach((layer: any, index: number) => {
          if (!layer.nodes || !Array.isArray(layer.nodes) || layer.nodes.length === 0) {
            errors.push(`Слой ${index + 1} не содержит узлов`)
          }
        })
      } else {
        // Обычная диаграмма
        if (!element.data.nodes || !Array.isArray(element.data.nodes) || element.data.nodes.length === 0) {
          errors.push('Отсутствуют или пусты узлы диаграммы')
        }
      }
      break

    case 'interactive':
      if (!element.data.type) {
        errors.push('Отсутствует тип интерактивного элемента')
        break
      }
      
      const interactiveType = element.data.type
      if (interactiveType === 'drag-drop' || interactiveType === 'drag-and-drop') {
        if (!element.data.leftItems || !Array.isArray(element.data.leftItems) || element.data.leftItems.length === 0) {
          errors.push('Отсутствуют или пусты элементы слева (leftItems)')
        }
        if (!element.data.rightItems || !Array.isArray(element.data.rightItems) || element.data.rightItems.length === 0) {
          errors.push('Отсутствуют или пусты элементы справа (rightItems)')
        }
        if (!element.data.correctPairs || !Array.isArray(element.data.correctPairs) || element.data.correctPairs.length === 0) {
          errors.push('Отсутствуют или пусты правильные пары (correctPairs)')
        }
      } else if (interactiveType === 'diagram-labeling') {
        if (!element.data.diagram || !element.data.diagram.nodes || !Array.isArray(element.data.diagram.nodes) || element.data.diagram.nodes.length === 0) {
          errors.push('Отсутствует или пуста схема для маркировки')
        }
        if (!element.data.labels || !Array.isArray(element.data.labels) || element.data.labels.length === 0) {
          errors.push('Отсутствуют или пусты метки (labels)')
        }
      } else if (interactiveType === 'classification') {
        if (!element.data.items || !Array.isArray(element.data.items) || element.data.items.length === 0) {
          errors.push('Отсутствуют или пусты элементы для классификации')
        }
        if (!element.data.categories || !Array.isArray(element.data.categories) || element.data.categories.length === 0) {
          errors.push('Отсутствуют или пусты категории')
        }
      } else if (interactiveType === 'audio-dialog') {
        if (!element.data.questions || !Array.isArray(element.data.questions) || element.data.questions.length === 0) {
          errors.push('Отсутствуют или пусты вопросы')
        }
      } else if (interactiveType === 'diagram-builder') {
        if (!element.data.elements || !Array.isArray(element.data.elements) || element.data.elements.length === 0) {
          errors.push('Отсутствуют или пусты элементы конструктора')
        }
        if (!element.data.concepts || !Array.isArray(element.data.concepts) || element.data.concepts.length === 0) {
          errors.push('Отсутствуют или пусты понятия')
        }
      }
      break

    case 'audio':
      if (!element.data.text || typeof element.data.text !== 'string' || element.data.text.trim().length === 0) {
        errors.push('Отсутствует или пуст текст для озвучивания')
      }
      if (!element.data.duration || typeof element.data.duration !== 'number' || element.data.duration <= 0) {
        errors.push('Отсутствует или некорректна длительность')
      }
      if (!element.data.format || !['mp3', 'wav', 'ogg'].includes(element.data.format)) {
        errors.push('Отсутствует или некорректен формат аудио')
      }
      break

    case 'table':
      if (!element.data.columns || !Array.isArray(element.data.columns) || element.data.columns.length === 0) {
        errors.push('Отсутствуют или пусты колонки таблицы')
      }
      if (!element.data.rows || !Array.isArray(element.data.rows) || element.data.rows.length === 0) {
        errors.push('Отсутствуют или пусты строки таблицы')
      }
      break

    case 'simulation':
      if (!element.data.model || typeof element.data.model !== 'object') {
        errors.push('Отсутствует модель симуляции')
      }
      if (!element.data.controls || !Array.isArray(element.data.controls) || element.data.controls.length === 0) {
        errors.push('Отсутствуют или пусты элементы управления')
      }
      if (!element.data.process || typeof element.data.process !== 'object') {
        errors.push('Отсутствует описание процесса')
      }
      break

    case 'checklist':
      if (!element.data.items || !Array.isArray(element.data.items) || element.data.items.length === 0) {
        errors.push('Отсутствуют или пусты элементы чеклиста')
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Компонент fallback для некорректных данных
function FallbackElement({ element, errors, blockNumber }: { element: AdaptationElement; errors: string[]; blockNumber: number }) {
  return (
    <Card className="bg-yellow-50 border-2 border-yellow-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-2">
              Элемент адаптации некорректен (Блок {blockNumber})
            </h4>
            <p className="text-sm text-yellow-800 mb-2">
              {element.description || 'Описание отсутствует'}
            </p>
            <div className="mt-3">
              <p className="text-xs font-semibold text-yellow-900 mb-1">Обнаруженные проблемы:</p>
              <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-yellow-700 mt-3 italic">
              Пожалуйста, пересоздайте адаптацию для этого блока или обратитесь к администратору.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdaptationElementRenderer({
  element,
  blockNumber,
  onInteraction
}: AdaptationElementRendererProps) {
  const [hasError, setHasError] = useState(false)
  const [errorInfo, setErrorInfo] = useState<{ errors: string[] } | null>(null)

  // Проверяем валидность данных при монтировании
  const validation = validateElementData(element)
  
  if (!validation.valid) {
    return (
      <div className="mt-4">
        <FallbackElement element={element} errors={validation.errors} blockNumber={blockNumber} />
      </div>
    )
  }

  const renderElement = () => {
    try {
      switch (element.type) {
        case 'diagram':
          // Дополнительная проверка для диаграммы
          if (element.data.layers && Array.isArray(element.data.layers)) {
            const hasValidLayers = element.data.layers.some((layer: any) => 
              layer.nodes && Array.isArray(layer.nodes) && layer.nodes.length > 0
            )
            if (!hasValidLayers) {
              throw new Error('Нет слоёв с валидными узлами')
            }
          } else if (!element.data.nodes || !Array.isArray(element.data.nodes) || element.data.nodes.length === 0) {
            throw new Error('Отсутствуют узлы диаграммы')
          }
          return (
            <VisualDiagram
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        case 'audio':
          if (!element.data.text || !element.data.duration || !element.data.format) {
            throw new Error('Неполные данные аудио элемента')
          }
          return (
            <AudioPlayer
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        case 'simulation':
          if (!element.data.model || !element.data.controls || !element.data.process) {
            throw new Error('Неполные данные симуляции')
          }
          return (
            <InteractiveSimulation
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        case 'table':
          if (!element.data.columns || !element.data.rows) {
            throw new Error('Неполные данные таблицы')
          }
          return (
            <ComparisonTable
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        case 'story':
          return (
            <StoryContent
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        case 'interactive':
          // Дополнительная проверка для интерактивных элементов
          if (!element.data.type) {
            throw new Error('Отсутствует тип интерактивного элемента')
          }
          const interactiveType = element.data.type
          if (interactiveType === 'drag-drop' || interactiveType === 'drag-and-drop') {
            if (!element.data.leftItems || element.data.leftItems.length === 0) {
              throw new Error('Отсутствуют элементы слева')
            }
            if (!element.data.rightItems || element.data.rightItems.length === 0) {
              throw new Error('Отсутствуют элементы справа')
            }
          }
          return (
            <InteractiveElement
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        case 'checklist':
          if (!element.data.items || element.data.items.length === 0) {
            throw new Error('Отсутствуют элементы чеклиста')
          }
          return (
            <Checklist
              data={element.data}
              description={element.description}
              onInteraction={onInteraction}
            />
          )
        default:
          return (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700">{element.description}</p>
            </div>
          )
      }
    } catch (error: any) {
      // Обработка ошибок рендеринга
      console.error(`[AdaptationElementRenderer] Ошибка рендеринга элемента типа ${element.type}:`, error)
      return (
        <FallbackElement 
          element={element} 
          errors={[error.message || 'Неизвестная ошибка при рендеринге элемента']} 
          blockNumber={blockNumber} 
        />
      )
    }
  }

  return (
    <div className="mt-4">
      {renderElement()}
    </div>
  )
}

