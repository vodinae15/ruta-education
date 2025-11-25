import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  normalizeStudentType, 
  type AdaptationContent,
  type AdaptationType,
  type AdaptationBlock,
  type AdaptationStatus
} from '@/lib/adaptation-logic'

// Логируем загрузку модуля
console.log('📦 [AI Adaptation] Module loaded at:', new Date().toISOString())

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'

console.log('📦 [AI Adaptation] Constants initialized:', {
  hasApiKey: !!OPENROUTER_API_KEY,
  apiKeyLength: OPENROUTER_API_KEY?.length || 0,
  apiUrl: OPENROUTER_API_URL,
  model: OPENROUTER_MODEL
})

interface LessonContent {
  title: string
  description?: string
  blocks: Array<{
    title: string
    content: string
    type: string
    elements?: Array<{
      id: string
      type: string
      content: string
      required?: boolean
      completed?: boolean
    }>
  }>
  materials?: string[]
  tests?: string[]
}

interface AdaptationRequest {
  lessonContent: LessonContent
  studentType: 'visual' | 'auditory' | 'kinesthetic' | 'original' | 'visual-analytical' | 'auditory-empathetic' | 'kinesthetic-practical'
  lessonId: string
  courseId?: string // Добавляем опциональный courseId
  saveToDatabase?: boolean
  forceRegenerate?: boolean
}

interface ValidationError {
  block: string
  field: string
  message: string
}

// Функция для проверки ошибки истекшего JWT токена
function isJwtExpiredError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = (error.message || '').toLowerCase()
  const errorCode = error.code || ''
  const errorDetails = (error.details || '').toLowerCase()
  const errorHint = (error.hint || '').toLowerCase()
  
  return (
    errorCode === 'PGRST301' ||
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('expired jwt') ||
    errorMessage.includes('token expired') ||
    errorDetails.includes('jwt expired') ||
    errorHint.includes('jwt expired')
  )
}

// Функция для обработки ошибки БД с проверкой JWT
function handleDatabaseError(error: any, context: string): { isJwtExpired: boolean; errorMessage: string } {
  if (isJwtExpiredError(error)) {
    console.error(`❌ [AI Adaptation] JWT expired in ${context}:`, error)
    return {
      isJwtExpired: true,
      errorMessage: 'Сессия истекла. Пожалуйста, перезайдите в систему.'
    }
  }
  
  return {
    isJwtExpired: false,
    errorMessage: error?.message || 'Неизвестная ошибка базы данных'
  }
}

// Функция трансформации нового формата AI (плоского) в старый формат (с intro/content/adaptation)
function transformNewFormatToLegacy(newFormat: any, adaptationType: 'original' | 'visual' | 'auditory' | 'kinesthetic'): AdaptationContent {
  console.log('🔄 [Transform] Transforming new format to legacy format for type:', adaptationType)

  const legacyContent: any = {}

  // Обрабатываем каждый блок (block1-block5)
  for (let i = 1; i <= 5; i++) {
    const blockKey = `block${i}`
    const newBlock = newFormat[blockKey]

    if (!newBlock) {
      console.warn(`⚠️ [Transform] Block ${blockKey} not found in new format`)
      continue
    }

    console.log(`🔄 [Transform] Processing ${blockKey}:`, Object.keys(newBlock))

    // Создаем базовую структуру блока
    legacyContent[blockKey] = {
      intro: {
        text: newBlock.introText || `Введение к разделу ${i}: ключевые понятия для изучения`,
        type: 'intro'
      },
      content: {
        title: `Блок ${i}`,
        text: newBlock.mainText || `Основное содержание раздела ${i}. Материал адаптирован под ваш стиль обучения.`,
        type: 'text',
        elements: []
      },
      adaptation: {
        type: adaptationType,
        element: {
          type: '', // Будет установлен ниже в зависимости от типа
          data: {},
          description: ''
        }
      }
    }

    // Обрабатываем медиа-элементы (общие для всех типов)
    if (newBlock.media && Array.isArray(newBlock.media)) {
      legacyContent[blockKey].content.elements = newBlock.media.map((m: any) => ({
        id: `media-${Date.now()}-${Math.random()}`,
        type: m.type,
        content: m.url,
        caption: m.caption || ''
      }))
      console.log(`✅ [Transform] Added ${newBlock.media.length} media elements to ${blockKey}`)
    }

    // Специфичная трансформация в зависимости от типа адаптации
    switch (adaptationType) {
      case 'original':
        // Блок 1: FlipCards
        if (i === 1 && newBlock.flipCards) {
          legacyContent[blockKey].adaptation.element.type = 'flipcards'
          legacyContent[blockKey].adaptation.element.data = {
            cards: newBlock.flipCards
          }
          legacyContent[blockKey].adaptation.element.description = 'Карточки для запоминания терминов'
          console.log(`✅ [Transform] Transformed flipCards for ${blockKey}:`, newBlock.flipCards.length, 'cards')
        }
        // Блок 2: StructuredText
        else if (i === 2 && newBlock.structuredText) {
          legacyContent[blockKey].adaptation.element.type = 'structured'
          legacyContent[blockKey].adaptation.element.data = {
            sections: newBlock.structuredText.sections || []
          }
          // Используем mainText из structuredText если есть
          if (newBlock.structuredText.mainText) {
            legacyContent[blockKey].content.text = newBlock.structuredText.mainText
          }
          legacyContent[blockKey].adaptation.element.description = 'Структурированный текст с секциями'
          console.log(`✅ [Transform] Transformed structuredText for ${blockKey}:`, newBlock.structuredText.sections?.length || 0, 'sections')
        }
        // Блоки 3-5: используем structuredText если есть
        else if (newBlock.structuredText) {
          legacyContent[blockKey].adaptation.element.type = 'structured'
          legacyContent[blockKey].adaptation.element.data = {
            sections: newBlock.structuredText.sections || []
          }
          if (newBlock.structuredText.mainText) {
            legacyContent[blockKey].content.text = newBlock.structuredText.mainText
          }
          legacyContent[blockKey].adaptation.element.description = 'Структурированный текст'
        } else if (newBlock.flipCards) {
          legacyContent[blockKey].adaptation.element.type = 'flipcards'
          legacyContent[blockKey].adaptation.element.data = {
            cards: newBlock.flipCards
          }
          legacyContent[blockKey].adaptation.element.description = 'Карточки для запоминания'
        } else {
          legacyContent[blockKey].adaptation.element.type = 'text'
          legacyContent[blockKey].adaptation.element.data = {}
          legacyContent[blockKey].adaptation.element.description = 'Текстовый контент'
        }
        break

      case 'visual':
        // Блок 1: MermaidDiagram
        if (i === 1 && newBlock.mermaidDiagram) {
          legacyContent[blockKey].adaptation.element.type = 'diagram'
          legacyContent[blockKey].adaptation.element.data = {
            mermaidCode: newBlock.mermaidDiagram.code || ''
          }
          legacyContent[blockKey].adaptation.element.description = newBlock.mermaidDiagram.description || 'Схема взаимосвязей'
          console.log(`✅ [Transform] Transformed mermaidDiagram for ${blockKey}`)
        }
        // Блоки 2-5: ComparisonTable
        else if (newBlock.comparisonTable) {
          legacyContent[blockKey].adaptation.element.type = 'table'
          legacyContent[blockKey].adaptation.element.data = {
            rows: newBlock.comparisonTable.rows || []
          }
          legacyContent[blockKey].adaptation.element.description = 'Таблица сравнения понятий'
          console.log(`✅ [Transform] Transformed comparisonTable for ${blockKey}:`, newBlock.comparisonTable.rows?.length || 0, 'rows')
        } else {
          legacyContent[blockKey].adaptation.element.type = 'text'
          legacyContent[blockKey].adaptation.element.data = {}
          legacyContent[blockKey].adaptation.element.description = 'Текстовый контент'
        }
        break

      case 'auditory':
        // Блок 5: AudioUploadBlock
        if (i === 5 && newBlock.audioUploadBlock) {
          legacyContent[blockKey].adaptation.element.type = 'audio-upload'
          legacyContent[blockKey].adaptation.element.data = {
            title: newBlock.audioUploadBlock.title || '',
            description: newBlock.audioUploadBlock.description || '',
            instructions: newBlock.audioUploadBlock.instructions || [],
            criteria: newBlock.audioUploadBlock.criteria || ''
          }
          legacyContent[blockKey].adaptation.element.description = 'Задание на запись аудио-пересказа'
          console.log(`✅ [Transform] Transformed audioUploadBlock for ${blockKey}`)
        }
        // Блоки 1-4: AudioCards
        else if (newBlock.audioCards) {
          legacyContent[blockKey].adaptation.element.type = 'audio-cards'
          legacyContent[blockKey].adaptation.element.data = {
            audioCards: newBlock.audioCards
          }
          legacyContent[blockKey].adaptation.element.description = 'Аудио-карточки с терминами'
          console.log(`✅ [Transform] Transformed audioCards for ${blockKey}:`, newBlock.audioCards.length, 'cards')
        } else {
          legacyContent[blockKey].adaptation.element.type = 'text'
          legacyContent[blockKey].adaptation.element.data = {}
          legacyContent[blockKey].adaptation.element.description = 'Текстовый контент'
        }
        break

      case 'kinesthetic':
        // Блок 1: GoalsChecklist
        if (i === 1 && newBlock.goalsChecklist) {
          legacyContent[blockKey].adaptation.element.type = 'goals'
          legacyContent[blockKey].adaptation.element.data = {
            goals: newBlock.goalsChecklist.goals || []
          }
          legacyContent[blockKey].adaptation.element.description = 'Чек-лист целей обучения'
          console.log(`✅ [Transform] Transformed goalsChecklist for ${blockKey}:`, newBlock.goalsChecklist.goals?.length || 0, 'goals')
        }
        // Блок 2: PracticalText
        else if (i === 2 && newBlock.practicalText) {
          legacyContent[blockKey].adaptation.element.type = 'practical'
          legacyContent[blockKey].adaptation.element.data = {
            title: newBlock.practicalText.title || '',
            tasks: newBlock.practicalText.tasks || [],
            criteria: newBlock.practicalText.criteria || ''
          }
          legacyContent[blockKey].adaptation.element.description = 'Практические задания'
          console.log(`✅ [Transform] Transformed practicalText for ${blockKey}:`, newBlock.practicalText.tasks?.length || 0, 'tasks')
        } else {
          legacyContent[blockKey].adaptation.element.type = 'text'
          legacyContent[blockKey].adaptation.element.data = {}
          legacyContent[blockKey].adaptation.element.description = 'Текстовый контент'
        }
        break
    }

    // Блоки 3-5: общие для всех типов адаптации (переопределяем после switch)
    if (i === 3) {
      // Блок 3: Практика (общий для всех типов)
      if (newBlock.practice || newBlock.tasks) {
        legacyContent[blockKey].adaptation.element.type = 'practice'
        legacyContent[blockKey].adaptation.element.data = {
          tasks: newBlock.practice || newBlock.tasks || []
        }
        legacyContent[blockKey].adaptation.element.description = 'Практические задания'
        console.log(`✅ [Transform] Transformed practice for ${blockKey}:`, (newBlock.practice || newBlock.tasks || []).length, 'tasks')
      } else {
        // Пустая практика - будет показан placeholder
        legacyContent[blockKey].adaptation.element.type = 'practice'
        legacyContent[blockKey].adaptation.element.data = { tasks: [] }
        legacyContent[blockKey].adaptation.element.description = 'Блок заполнится после адаптации'
      }
    } else if (i === 4) {
      // Блок 4: Вложения/медиа (общий для всех типов)
      // Медиа уже добавлены в content.elements выше (строка 136)
      legacyContent[blockKey].adaptation.element.type = 'attachments'
      legacyContent[blockKey].adaptation.element.data = {}
      legacyContent[blockKey].adaptation.element.description = 'Дополнительные материалы'
      console.log(`✅ [Transform] Block ${blockKey} set as attachments block`)
    } else if (i === 5) {
      // Блок 5: Тест (общий для всех типов)
      if (newBlock.test || newBlock.questions) {
        legacyContent[blockKey].adaptation.element.type = 'test'
        legacyContent[blockKey].adaptation.element.data = {
          questions: newBlock.test || newBlock.questions || []
        }
        legacyContent[blockKey].adaptation.element.description = 'Итоговый тест'
        console.log(`✅ [Transform] Transformed test for ${blockKey}:`, (newBlock.test || newBlock.questions || []).length, 'questions')
      } else {
        // Пустой тест - будет показан placeholder
        legacyContent[blockKey].adaptation.element.type = 'test'
        legacyContent[blockKey].adaptation.element.data = { questions: [] }
        legacyContent[blockKey].adaptation.element.description = 'Блок заполнится после адаптации'
      }
    }
  }

  console.log('✅ [Transform] Transformation complete, blocks:', Object.keys(legacyContent))
  return legacyContent as AdaptationContent
}

// Валидация адаптированного контента
function validateAdaptationContent(content: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const requiredBlocks = ['block1', 'block2', 'block3', 'block4', 'block5']

  for (const blockId of requiredBlocks) {
    if (!content[blockId]) {
      errors.push({
        block: blockId,
        field: 'block',
        message: `Отсутствует блок ${blockId}`
      })
      continue
    }

    const block = content[blockId]

    // Проверяем наличие подводки
    if (!block.intro) {
      errors.push({
        block: blockId,
        field: 'intro',
        message: `Отсутствует подводка (intro)`
      })
    } else if (!block.intro.text || typeof block.intro.text !== 'string' || block.intro.text.trim().length === 0) {
      errors.push({
        block: blockId,
        field: 'intro.text',
        message: `Подводка (intro.text) пуста или не является строкой`
      })
    } else if (block.intro.text.trim().length < 10) {
      errors.push({
        block: blockId,
        field: 'intro.text',
        message: `Подводка (intro.text) слишком короткая (минимум 10 символов)`
      })
    }

    // Проверяем наличие контента
    if (!block.content) {
      errors.push({
        block: blockId,
        field: 'content',
        message: `Отсутствует контент (content)`
      })
    } else {
      if (!block.content.title || typeof block.content.title !== 'string' || block.content.title.trim().length === 0) {
        errors.push({
          block: blockId,
          field: 'content.title',
          message: `Заголовок контента (content.title) пуст или не является строкой`
        })
      }
      
      if (!block.content.text || typeof block.content.text !== 'string' || block.content.text.trim().length === 0) {
        errors.push({
          block: blockId,
          field: 'content.text',
          message: `Текст контента (content.text) пуст или не является строкой`
        })
      } else if (block.content.text.trim().length < 50) {
        errors.push({
          block: blockId,
          field: 'content.text',
          message: `Текст контента (content.text) слишком короткий (минимум 50 символов)`
        })
      }

      if (block.content.type !== 'text') {
        errors.push({
          block: blockId,
          field: 'content.type',
          message: `Тип контента (content.type) должен быть 'text'`
        })
      }
    }

    // Проверяем наличие адаптированного элемента
    if (!block.adaptation) {
      errors.push({
        block: blockId,
        field: 'adaptation',
        message: `Отсутствует адаптация (adaptation)`
      })
    } else {
      if (!block.adaptation.type || !['visual', 'auditory', 'kinesthetic', 'original'].includes(block.adaptation.type)) {
        errors.push({
          block: blockId,
          field: 'adaptation.type',
          message: `Тип адаптации (adaptation.type) должен быть 'visual', 'auditory', 'kinesthetic' или 'original'`
        })
      }

      if (!block.adaptation.element) {
        errors.push({
          block: blockId,
          field: 'adaptation.element',
          message: `Отсутствует адаптированный элемент (adaptation.element)`
        })
      } else {
        if (!block.adaptation.element.type) {
          errors.push({
            block: blockId,
            field: 'adaptation.element.type',
            message: `Отсутствует тип элемента (adaptation.element.type)`
          })
        }

        if (!block.adaptation.element.data) {
          errors.push({
            block: blockId,
            field: 'adaptation.element.data',
            message: `Отсутствуют данные элемента (adaptation.element.data)`
          })
        } else {
          // Детальная валидация структуры данных в зависимости от типа элемента
          const elementType = block.adaptation.element.type
          const elementData = block.adaptation.element.data
          
          validateElementDataStructure(elementType, elementData, blockId, errors)
        }

        if (!block.adaptation.element.description || typeof block.adaptation.element.description !== 'string') {
          errors.push({
            block: blockId,
            field: 'adaptation.element.description',
            message: `Отсутствует описание элемента (adaptation.element.description)`
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Функция для детальной валидации структуры данных элемента
function validateElementDataStructure(
  elementType: string,
  elementData: any,
  blockId: string,
  errors: ValidationError[]
): void {
  if (!elementType || !elementData) return

  switch (elementType) {
    case 'drag-drop':
    case 'drag-and-drop':
      // Валидация drag-drop: нужны leftItems, rightItems, correctPairs
      if (!Array.isArray(elementData.leftItems) || elementData.leftItems.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.leftItems',
          message: `Для drag-drop элемента отсутствует или пуст массив leftItems (элементы слева)`
        })
      } else {
        // Проверяем структуру элементов слева
        elementData.leftItems.forEach((item: any, index: number) => {
          if (!item.id || !item.text) {
            errors.push({
              block: blockId,
              field: `adaptation.element.data.leftItems[${index}]`,
              message: `Элемент leftItems[${index}] должен содержать поля id и text`
            })
          }
        })
      }

      if (!Array.isArray(elementData.rightItems) || elementData.rightItems.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.rightItems',
          message: `Для drag-drop элемента отсутствует или пуст массив rightItems (элементы справа)`
        })
      } else {
        // Проверяем структуру элементов справа
        elementData.rightItems.forEach((item: any, index: number) => {
          if (!item.id || !item.text) {
            errors.push({
              block: blockId,
              field: `adaptation.element.data.rightItems[${index}]`,
              message: `Элемент rightItems[${index}] должен содержать поля id и text`
            })
          }
        })
      }

      if (!Array.isArray(elementData.correctPairs) || elementData.correctPairs.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.correctPairs',
          message: `Для drag-drop элемента отсутствует или пуст массив correctPairs (правильные пары)`
        })
      } else {
        // Проверяем структуру правильных пар
        elementData.correctPairs.forEach((pair: any, index: number) => {
          if (!pair.leftId || !pair.rightId) {
            errors.push({
              block: blockId,
              field: `adaptation.element.data.correctPairs[${index}]`,
              message: `Пара correctPairs[${index}] должна содержать поля leftId и rightId`
            })
          }
        })
      }
      break

    case 'diagram':
      // Валидация диаграммы: нужны nodes и connections (или layers для многослойных)
      if (elementData.layers && Array.isArray(elementData.layers)) {
        // Многослойная диаграмма
        if (elementData.layers.length === 0) {
          errors.push({
            block: blockId,
            field: 'adaptation.element.data.layers',
            message: `Для многослойной диаграммы массив layers не может быть пустым`
          })
        } else {
          elementData.layers.forEach((layer: any, layerIndex: number) => {
            if (!layer.id || !layer.name) {
              errors.push({
                block: blockId,
                field: `adaptation.element.data.layers[${layerIndex}]`,
                message: `Слой layers[${layerIndex}] должен содержать поля id и name`
              })
            }
            if (!Array.isArray(layer.nodes) || layer.nodes.length === 0) {
              errors.push({
                block: blockId,
                field: `adaptation.element.data.layers[${layerIndex}].nodes`,
                message: `Слой layers[${layerIndex}] должен содержать непустой массив nodes`
              })
            }
          })
        }
      } else {
        // Обычная диаграмма
        if (!Array.isArray(elementData.nodes) || elementData.nodes.length === 0) {
          errors.push({
            block: blockId,
            field: 'adaptation.element.data.nodes',
            message: `Для диаграммы отсутствует или пуст массив nodes (узлы)`
          })
        } else {
          elementData.nodes.forEach((node: any, index: number) => {
            if (!node.id || !node.label) {
              errors.push({
                block: blockId,
                field: `adaptation.element.data.nodes[${index}]`,
                message: `Узел nodes[${index}] должен содержать поля id и label`
              })
            }
          })
        }

        // connections опциональны, но если есть - должны быть массивом
        if (elementData.connections !== undefined && !Array.isArray(elementData.connections)) {
          errors.push({
            block: blockId,
            field: 'adaptation.element.data.connections',
            message: `Поле connections должно быть массивом`
          })
        } else if (Array.isArray(elementData.connections)) {
          elementData.connections.forEach((conn: any, index: number) => {
            if (!conn.from || !conn.to) {
              errors.push({
                block: blockId,
                field: `adaptation.element.data.connections[${index}]`,
                message: `Связь connections[${index}] должна содержать поля from и to`
              })
            }
          })
        }
      }
      break

    case 'interactive':
      // Валидация интерактивного элемента зависит от подтипа
      if (!elementData.type) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.type',
          message: `Для interactive элемента отсутствует поле type (подтип: drag-drop, diagram-labeling, classification, и т.д.)`
        })
        break
      }

      const interactiveType = elementData.type

      switch (interactiveType) {
        case 'diagram-labeling':
          if (!elementData.diagram || !elementData.diagram.nodes || !Array.isArray(elementData.diagram.nodes) || elementData.diagram.nodes.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.diagram.nodes',
              message: `Для diagram-labeling отсутствует или пуст массив diagram.nodes`
            })
          }
          if (!Array.isArray(elementData.labels) || elementData.labels.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.labels',
              message: `Для diagram-labeling отсутствует или пуст массив labels`
            })
          }
          break

        case 'classification':
          if (!Array.isArray(elementData.items) || elementData.items.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.items',
              message: `Для classification отсутствует или пуст массив items`
            })
          }
          if (!Array.isArray(elementData.categories) || elementData.categories.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.categories',
              message: `Для classification отсутствует или пуст массив categories`
            })
          }
          if (!Array.isArray(elementData.correctClassification) || elementData.correctClassification.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.correctClassification',
              message: `Для classification отсутствует или пуст массив correctClassification`
            })
          }
          break

        case 'assembly':
          if (!Array.isArray(elementData.parts) || elementData.parts.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.parts',
              message: `Для assembly отсутствует или пуст массив parts`
            })
          }
          break

        case 'audio-dialog':
          if (!Array.isArray(elementData.questions) || elementData.questions.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.questions',
              message: `Для audio-dialog отсутствует или пуст массив questions`
            })
          } else {
            elementData.questions.forEach((q: any, index: number) => {
              if (!q.id || !q.text) {
                errors.push({
                  block: blockId,
                  field: `adaptation.element.data.questions[${index}]`,
                  message: `Вопрос questions[${index}] должен содержать поля id и text`
                })
              }
            })
          }
          break

        case 'diagram-builder':
          if (!elementData.template) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.template',
              message: `Для diagram-builder отсутствует объект template`
            })
          } else {
            if (!Array.isArray(elementData.template.nodes)) {
              errors.push({
                block: blockId,
                field: 'adaptation.element.data.template.nodes',
                message: `Для diagram-builder template.nodes должен быть массивом`
              })
            }
            if (!Array.isArray(elementData.template.connections)) {
              errors.push({
                block: blockId,
                field: 'adaptation.element.data.template.connections',
                message: `Для diagram-builder template.connections должен быть массивом`
              })
            }
          }
          if (!Array.isArray(elementData.elements) || elementData.elements.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.elements',
              message: `Для diagram-builder отсутствует или пуст массив elements`
            })
          }
          if (!Array.isArray(elementData.concepts) || elementData.concepts.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.concepts',
              message: `Для diagram-builder отсутствует или пуст массив concepts`
            })
          }
          break

        case 'product-creation':
          if (!Array.isArray(elementData.checklist) || elementData.checklist.length === 0) {
            errors.push({
              block: blockId,
              field: 'adaptation.element.data.checklist',
              message: `Для product-creation отсутствует или пуст массив checklist`
            })
          }
          break
      }
      break

    case 'audio':
      // Валидация аудио элемента
      if (!elementData.text || typeof elementData.text !== 'string' || elementData.text.trim().length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.text',
          message: `Для audio элемента отсутствует или пусто поле text (текст для озвучивания)`
        })
      }
      if (!elementData.duration || typeof elementData.duration !== 'number' || elementData.duration <= 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.duration',
          message: `Для audio элемента отсутствует или некорректно поле duration (длительность в секундах)`
        })
      }
      if (!elementData.format || !['mp3', 'wav', 'ogg'].includes(elementData.format)) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.format',
          message: `Для audio элемента отсутствует или некорректно поле format (должно быть mp3, wav или ogg)`
        })
      }
      break

    case 'table':
      // Валидация таблицы
      if (!Array.isArray(elementData.columns) || elementData.columns.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.columns',
          message: `Для table элемента отсутствует или пуст массив columns (колонки таблицы)`
        })
      }
      if (!Array.isArray(elementData.rows) || elementData.rows.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.rows',
          message: `Для table элемента отсутствует или пуст массив rows (строки таблицы)`
        })
      } else {
        // Проверяем, что количество полей в строках соответствует количеству колонок
        const columnsCount = elementData.columns?.length || 0
        elementData.rows.forEach((row: any, index: number) => {
          if (typeof row !== 'object' || Object.keys(row).length === 0) {
            errors.push({
              block: blockId,
              field: `adaptation.element.data.rows[${index}]`,
              message: `Строка rows[${index}] должна быть объектом с данными`
            })
          }
        })
      }
      break

    case 'story':
      // Валидация истории
      if (!elementData.text || typeof elementData.text !== 'string' || elementData.text.trim().length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.text',
          message: `Для story элемента отсутствует или пусто поле text (текст истории)`
        })
      }
      if (!Array.isArray(elementData.characters) || elementData.characters.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.characters',
          message: `Для story элемента отсутствует или пуст массив characters (персонажи)`
        })
      }
      if (!elementData.plot || typeof elementData.plot !== 'object') {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.plot',
          message: `Для story элемента отсутствует объект plot (сюжет)`
        })
      }
      break

    case 'simulation':
      // Валидация симуляции
      if (!elementData.model || typeof elementData.model !== 'object') {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.model',
          message: `Для simulation элемента отсутствует объект model (модель симуляции)`
        })
      }
      if (!Array.isArray(elementData.controls) || elementData.controls.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.controls',
          message: `Для simulation элемента отсутствует или пуст массив controls (элементы управления)`
        })
      }
      if (!elementData.process || typeof elementData.process !== 'object') {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.process',
          message: `Для simulation элемента отсутствует объект process (описание процесса)`
        })
      }
      break

    case 'checklist':
      // Валидация чеклиста
      if (!Array.isArray(elementData.items) || elementData.items.length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.items',
          message: `Для checklist элемента отсутствует или пуст массив items (элементы чеклиста)`
        })
      } else {
        elementData.items.forEach((item: any, index: number) => {
          if (!item.id || !item.text) {
            errors.push({
              block: blockId,
              field: `adaptation.element.data.items[${index}]`,
              message: `Элемент чеклиста items[${index}] должен содержать поля id и text`
            })
          }
        })
      }
      break

    case 'text':
      // Валидация текстового элемента (для original типа)
      if (!elementData.text || typeof elementData.text !== 'string' || elementData.text.trim().length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data.text',
          message: `Для text элемента отсутствует или пусто поле text`
        })
      }
      break

    default:
      // Для неизвестных типов просто проверяем, что data не пустой объект
      if (typeof elementData !== 'object' || Object.keys(elementData).length === 0) {
        errors.push({
          block: blockId,
          field: 'adaptation.element.data',
          message: `Данные элемента должны быть непустым объектом для типа ${elementType}`
        })
      }
      break
  }
}

// Промпты для разных типов обучения с трехслойной структурой
const getAdaptationPrompt = (studentType: string, lessonContent: LessonContent): string => {
  const normalizedType = studentType === 'original' ? 'original' : normalizeStudentType(studentType)

  // Извлекаем медиа-элементы из блоков
  const allMediaElements = lessonContent.blocks.flatMap(block =>
    (block.elements || []).filter(el => ['video', 'audio', 'image', 'file'].includes(el.type))
  )

  const basePrompt = `
Ты - эксперт по структурированию образовательного контента для образовательной платформы.

ИСХОДНЫЙ КОНТЕНТ УРОКА:
Название: ${lessonContent.title}
Описание: ${lessonContent.description || 'Не указано'}

Контент урока:
${lessonContent.blocks.map((block, index) => {
  let blockInfo = `${index + 1}. ${block.title || 'Блок ' + (index + 1)}\n${block.content || ''}`
  if (block.elements && block.elements.length > 0) {
    const mediaElements = block.elements.filter(el => ['video', 'audio', 'image', 'file'].includes(el.type))
    if (mediaElements.length > 0) {
      blockInfo += '\n   Медиа:\n' + mediaElements.map(el => `     - ${el.type}: ${el.content}`).join('\n')
    }
  }
  return blockInfo
}).join('\n\n')}

${allMediaElements.length > 0 ? `
МЕДИА-ЭЛЕМЕНТЫ В УРОКЕ:
${allMediaElements.map((el, i) => `${i + 1}. ${el.type.toUpperCase()}: ${el.content}`).join('\n')}

⚠️ ВАЖНО: Эти медиа-элементы нужно сохранить В ТОЧНОСТИ как есть и распределить по блокам.
` : ''}

${lessonContent.tests && lessonContent.tests.length > 0 ? `
ТЕСТЫ ОТ АВТОРА:
${lessonContent.tests.map((test, i) => `${i + 1}. ${test}`).join('\n')}

⚠️ ВАЖНО: Используй эти тесты в блоке 5. Если тестов нет - ОБЯЗАТЕЛЬНО сгенерируй 10 вопросов самостоятельно!
` : '⚠️ ВАЖНО: Автор НЕ предоставил тесты. ОБЯЗАТЕЛЬНО сгенерируй 10 вопросов для блока 5 самостоятельно!'}

ЗАДАЧА: Создать структурированную адаптацию урока из 5 блоков.
`

  switch (normalizedType) {
    case 'original':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ДЛЯ ОРИГИНАЛЬНОГО ТИПА (БЕЗ АДАПТАЦИИ)
═══════════════════════════════════════════════════════════════════════════════

Ты должен упаковать контент автора в ИНТЕРАКТИВНЫЕ ШАБЛОНЫ, сохранив весь оригинальный материал.

ИСПОЛЬЗУЙ ДВА ШАБЛОНА:
1. **FlipCards** - карточки для запоминания терминов
2. **StructuredText** - структурированный текст с секциями

СТРУКТУРА КАЖДОГО БЛОКА:

{
  "block1": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку. Например: 'Начнем наше знакомство с темой...' или 'Давайте разберемся с основными понятиями...'",
    "flipCards": [
      {
        "id": "1",
        "front": "Ключевой термин или понятие",
        "back": "Определение или объяснение (1-2 предложения)"
      },
      // ОБЯЗАТЕЛЬНО 6-10 карточек на каждый блок
    ],
    "structuredText": {
      "sections": [
        {
          "id": "1",
          "title": "Заголовок раздела",
          "content": "Текст раздела (2-4 абзаца с подробным объяснением)"
        },
        // 2-4 секции на блок
      ],
      "mainText": "ПОЛНЫЙ текст блока в Markdown формате БЕЗ СОКРАЩЕНИЙ. Изложи ВСЕ что написал автор, сохраняя все детали, факты, примеры. НЕ делай краткие выжимки! Формат:\\n\\n## Заголовок\\n\\nПолный текст со всеми деталями, **жирным**, *курсивом*, списками:\\n- Пункт 1\\n- Пункт 2\\n\\n> Важные цитаты"
    },
    "media": []
  }
}

ПРАВИЛА СОЗДАНИЯ INTROTEXT (ОБЯЗАТЕЛЬНО ДЛЯ КАЖДОГО БЛОКА!):
- introText - это логичная подводка, которая последовательно ведет ученика по уроку
- ЗАПРЕЩЕНО использовать шаблонные фразы типа "Введение к разделу N"
- Каждый блок должен иметь УНИКАЛЬНЫЙ introText
- Примеры правильных introText:
  * Блок 1: "Начнем наше знакомство с темой. В этом разделе мы познакомимся с ключевыми понятиями, которые станут основой для дальнейшего изучения."
  * Блок 2: "Теперь углубимся в основные концепции. Разберем подробно каждое понятие и поймем, как они связаны между собой."
  * Блок 3: "Пришло время применить полученные знания на практике. Выполните задания, чтобы закрепить материал."
  * Блок 4: "Для более глубокого понимания темы предлагаем дополнительные материалы. Изучите их в удобном темпе."
  * Блок 5: "Проверим, как хорошо усвоен материал. Пройдите тест, чтобы оценить свои знания."
- КРИТИЧЕСКИ ВАЖНО: генерируй introText для КАЖДОГО блока!

ПРАВИЛА СОЗДАНИЯ FLIPCARDS:
- Извлекай КЛЮЧЕВЫЕ термины, понятия, имена из исходного контента
- front: термин/понятие (2-5 слов)
- back: четкое определение (1-2 предложения)
- Создавай МИНИМУМ 6-10 карточек на КАЖДЫЙ блок (это обязательное требование!)
- Используй ТОЛЬКО термины ИЗ ИСХОДНОГО КОНТЕНТА

ПРАВИЛА СОЗДАНИЯ STRUCTUREDTEXT:
- Разбей текст на логические секции с заголовками
- 2-4 секции на блок
- Каждая секция: заголовок + 2-4 абзаца контента
- mainText: ПОЛНЫЙ текст автора в Markdown (##, **, *, -, >)
- КРИТИЧЕСКИ ВАЖНО: НЕ сокращай текст автора! Излагай ПОЛНОСТЬЮ все что он написал
- Сохраняй ВСЕ факты, примеры, детали, объяснения из исходного контента без исключений

ПРАВИЛА РАБОТЫ С МЕДИА:
- НЕ добавляй медиа в блоки 1-3! Оставляй "media": []
- ВСЕ медиа будут добавлены в блок 4 (углубленное изучение)

ПРАВИЛА ДЛЯ БЛОКА 3 (ПРАКТИКА):
- Блок 3 - это ПРАКТИЧЕСКИЕ ЗАДАНИЯ для закрепления материала
- Добавь поле "practice": массив из 3-5 практических заданий
- Каждое задание должно содержать:
  * "id": уникальный идентификатор
  * "instruction": чёткая инструкция (что нужно сделать)
  * "hint": подсказка для выполнения (опционально)
- ОБЯЗАТЕЛЬНО создай практику на основе изученного материала из блоков 1-2
- FlipCards и StructuredText тоже добавляй для блока 3

ПРАВИЛА ДЛЯ БЛОКА 5 (ТЕСТ):
- Блок 5 - это ИТОГОВЫЙ ТЕСТ для проверки знаний
- Добавь поле "test": массив из 10 вопросов с вариантами ответа
- Каждый вопрос должен содержать:
  * "id": уникальный идентификатор
  * "question": текст вопроса
  * "options": массив из 4 вариантов ответа
  * "correctAnswer": индекс правильного ответа (0-3)
  * "explanation": объяснение правильного ответа
- ОБЯЗАТЕЛЬНО создай 10 вопросов! Это критическое требование!
- FlipCards и StructuredText тоже добавляй для блока 5

РАСПРЕДЕЛЕНИЕ КОНТЕНТА ПО БЛОКАМ:
- БЛОК 1: Введение и обзор (6-8 карточек + 2-3 секции + ПОЛНЫЙ текст)
- БЛОК 2: Основная теория (8-10 карточек + 3-4 секции + ПОЛНЫЙ текст)
- БЛОК 3: Практическое закрепление (6-8 карточек + 2-3 секции + ПОЛНЫЙ текст + 3-5 практических заданий)
- БЛОК 4: Углубленное изучение с медиа (6-8 карточек + 2-3 секции + ПОЛНЫЙ текст + ВСЕ медиа)
- БЛОК 5: Итоги и тест (6-8 карточек + 2 секции + ПОЛНЫЙ текст + 10 вопросов теста)

КРИТИЧЕСКИ ВАЖНО:
1. НЕ добавляй информацию, которой нет в исходном контенте
2. НЕ изменяй факты, даты, имена, термины
3. Создавай МИНИМУМ 6-10 карточек на КАЖДЫЙ блок (обязательно!)
4. Копируй URL медиа ТОЧНО как есть
5. Верни JSON для ВСЕХ 5 блоков
6. ИЗЛАГАЙ ПОЛНОСТЬЮ весь текст автора в mainText БЕЗ СОКРАЩЕНИЙ! Это КЛЮЧЕВОЕ требование!
7. ОБЯЗАТЕЛЬНО создай практику для блока 3 и тест из 10 вопросов для блока 5!

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО валидный JSON без комментариев:
{
  "block1": { "introText": "...", "flipCards": [...], "structuredText": {...}, "media": [] },
  "block2": { "introText": "...", "flipCards": [...], "structuredText": {...}, "media": [] },
  "block3": { "introText": "...", "flipCards": [...], "structuredText": {...}, "practice": [...], "media": [] },
  "block4": { "introText": "...", "flipCards": [...], "structuredText": {...}, "media": [...] },
  "block5": { "introText": "...", "flipCards": [...], "structuredText": {...}, "test": [...], "media": [] }
}
`

    case 'visual':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ДЛЯ ВИЗУАЛЬНОГО ТИПА (VISUAL)
═══════════════════════════════════════════════════════════════════════════════

Ты должен упаковать контент автора в ИНТЕРАКТИВНЫЕ ШАБЛОНЫ для визуального восприятия.

ИСПОЛЬЗУЙ ДВА ШАБЛОНА:
1. **MermaidDiagram** - схема взаимосвязей между концепциями (только в БЛОКЕ 1)
2. **ComparisonTable** - таблица сравнения понятий (в БЛОКАХ 2-5)

СТРУКТУРА БЛОКА 1 (с Mermaid Diagram):

{
  "block1": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку. Например: 'Начнем наше знакомство с темой...' или 'Посмотрим на общую картину...'",
    "mermaidDiagram": {
      "code": "graph TD\\n    A[Центральная тема] --> B[Понятие 1]\\n    A --> C[Понятие 2]\\n    style A fill:#659AB8,stroke:#5589a7,color:#fff",
      "description": "Схема основных взаимосвязей темы урока"
    },
    "mainText": "ПОЛНЫЙ текст блока в Markdown БЕЗ СОКРАЩЕНИЙ. Изложи ВСЕ что написал автор, сохраняя все детали, факты, примеры",
    "media": []
  }
}

СТРУКТУРА БЛОКОВ 2-5 (с Comparison Table):

{
  "block2": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку.",
    "comparisonTable": {
      "rows": [
        {
          "id": "1",
          "concept": "Название понятия 1",
          "definition": "Определение понятия (2-3 предложения)",
          "signs": "Ключевые признаки через запятую",
          "example": "Конкретный пример из исходного контента"
        }
        // ОБЯЗАТЕЛЬНО 6-10 строк на блок
      ]
    },
    "mainText": "ПОЛНЫЙ текст блока в Markdown БЕЗ СОКРАЩЕНИЙ. Изложи ВСЕ что написал автор",
    "media": []
  }
}

ПРАВИЛА СОЗДАНИЯ MERMAID ДИАГРАММЫ (block1):
- Используй синтаксис Mermaid: graph TD (top-down) или graph LR (left-right)
- Узлы: A[Текст], B((Круглый)), C{{Ромб}}
- Связи: A --> B (стрелка), A --- B (линия), A -.-> B (пунктир)
- Стили: style A fill:#659AB8,stroke:#5589a7,color:#fff
- Создавай 6-9 узлов максимум (не перегружай схему)
- 2-3 уровня вложенности максимум
- Центральный узел - тема урока, от него расходятся ключевые понятия
- ОБЯЗАТЕЛЬНО используй \\n для переносов строк в коде (не настоящие переносы!)

Пример Mermaid кода:
graph TD
    A[Княгиня Ольга] --> B[Внутренняя политика]
    A --> C[Внешняя политика]
    B --> D[Налоговая реформа]
    C --> F[Крещение в Константинополе]
    style A fill:#659AB8,stroke:#5589a7,stroke-width:2px,color:#fff
    style B fill:#E8F4FA,stroke:#659AB8,color:#111827

ПРАВИЛА СОЗДАНИЯ COMPARISON TABLE (blocks 2-5):
- Извлекай КЛЮЧЕВЫЕ понятия из исходного контента
- Каждая строка = одно понятие с 4 полями:
  * concept: название (2-5 слов)
  * definition: определение (2-3 предложения)
  * signs: ключевые признаки (через запятую или список)
  * example: конкретный пример ИЗ ИСХОДНОГО КОНТЕНТА
- Создавай МИНИМУМ 6-10 строк на КАЖДЫЙ блок (это обязательное требование!)
- Используй ТОЛЬКО понятия ИЗ ИСХОДНОГО КОНТЕНТА

ПРАВИЛА СОЗДАНИЯ INTROTEXT (ОБЯЗАТЕЛЬНО ДЛЯ КАЖДОГО БЛОКА!):
- introText - это логичная подводка, которая последовательно ведет ученика по уроку
- ЗАПРЕЩЕНО использовать шаблонные фразы типа "Введение к разделу N"
- Каждый блок должен иметь УНИКАЛЬНЫЙ introText
- Примеры правильных introText:
  * Блок 1: "Начнем наше знакомство с темой. Посмотрим на общую структуру взаимосвязей..."
  * Блок 2: "Теперь углубимся в основные концепции. Разберем подробно каждое понятие..."
  * Блок 3: "Рассмотрим практические примеры применения изученных концепций..."
  * Блок 4: "Для более глубокого понимания темы изучим детали и нюансы..."
  * Блок 5: "Подведем итоги изученного материала и систематизируем знания..."
- КРИТИЧЕСКИ ВАЖНО: генерируй introText для КАЖДОГО блока!

ПРАВИЛА РАБОТЫ С МЕДИА:
- НЕ добавляй медиа в блоки 1-3! Оставляй "media": []
- ВСЕ медиа будут добавлены в блок 4 (углубленное изучение)

ПРАВИЛА ДЛЯ БЛОКА 3 (ПРАКТИКА):
- Блок 3 - это ПРАКТИЧЕСКИЕ ЗАДАНИЯ для закрепления материала
- Добавь поле "practice": массив из 3-5 практических заданий
- Каждое задание должно содержать:
  * "id": уникальный идентификатор
  * "instruction": чёткая инструкция (что нужно сделать)
  * "hint": подсказка для выполнения (опционально)
- ОБЯЗАТЕЛЬНО создай практику на основе изученного материала из блоков 1-2
- ComparisonTable тоже добавляй для блока 3

ПРАВИЛА ДЛЯ БЛОКА 5 (ТЕСТ):
- Блок 5 - это ИТОГОВЫЙ ТЕСТ для проверки знаний
- Добавь поле "test": массив из 10 вопросов с вариантами ответа
- Каждый вопрос должен содержать:
  * "id": уникальный идентификатор
  * "question": текст вопроса
  * "options": массив из 4 вариантов ответа
  * "correctAnswer": индекс правильного ответа (0-3)
  * "explanation": объяснение правильного ответа
- ОБЯЗАТЕЛЬНО создай 10 вопросов! Это критическое требование!
- ComparisonTable тоже добавляй для блока 5

РАСПРЕДЕЛЕНИЕ КОНТЕНТА ПО БЛОКАМ:
- БЛОК 1: Обзор темы + Mermaid схема (6-9 узлов) + ПОЛНЫЙ текст
- БЛОК 2: Основная теория + таблица понятий (8-10 строк) + ПОЛНЫЙ текст
- БЛОК 3: Практическое закрепление + таблица примеров (6-8 строк) + ПОЛНЫЙ текст + 3-5 практических заданий
- БЛОК 4: Углубленное изучение с медиа + таблица деталей (6-8 строк) + ПОЛНЫЙ текст + ВСЕ медиа
- БЛОК 5: Итоги и тест + итоговая таблица (6-8 строк) + ПОЛНЫЙ текст + 10 вопросов теста

КРИТИЧЕСКИ ВАЖНО:
1. НЕ добавляй информацию, которой нет в исходном контенте
2. НЕ изменяй факты, даты, имена, термины
3. Создавай МИНИМУМ 6-10 строк таблицы на КАЖДЫЙ блок (обязательно!)
4. Копируй URL медиа ТОЧНО как есть
5. Верни JSON для ВСЕХ 5 блоков
6. Mermaid code ДОЛЖЕН быть одной строкой с \\n для переносов
7. ИЗЛАГАЙ ПОЛНОСТЬЮ весь текст автора в mainText БЕЗ СОКРАЩЕНИЙ! Это КЛЮЧЕВОЕ требование!
8. ОБЯЗАТЕЛЬНО создай практику для блока 3 и тест из 10 вопросов для блока 5!

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО валидный JSON без комментариев:
{
  "block1": { "introText": "...", "mermaidDiagram": {...}, "mainText": "...", "media": [] },
  "block2": { "introText": "...", "comparisonTable": {...}, "mainText": "...", "media": [] },
  "block3": { "introText": "...", "comparisonTable": {...}, "mainText": "...", "practice": [...], "media": [] },
  "block4": { "introText": "...", "comparisonTable": {...}, "mainText": "...", "media": [...] },
  "block5": { "introText": "...", "comparisonTable": {...}, "mainText": "...", "test": [...], "media": [] }
}
`

    case 'auditory':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ДЛЯ АУДИАЛЬНОГО ТИПА (AUDITORY)
═══════════════════════════════════════════════════════════════════════════════

Ты должен упаковать контент автора в ИНТЕРАКТИВНЫЕ ШАБЛОНЫ для аудиального восприятия.

ИСПОЛЬЗУЙ ДВА ШАБЛОНА:
1. **AudioCards** - аудио-карточки с терминами (в БЛОКАХ 1-5)
2. **AudioUploadBlock** - блок для загрузки аудио от студента (только в БЛОКЕ 5)

СТРУКТУРА БЛОКОВ 1-4 (с AudioCards):

{
  "block1": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку. Например: 'Послушайте ключевые понятия темы...' или 'Познакомимся с терминологией урока...'",
    "audioCards": [
      {
        "id": "1",
        "term": "Название термина или понятия",
        "audioUrl": "https://example.com/audio/term1.mp3",
        "duration": 30
      }
      // ОБЯЗАТЕЛЬНО 6-10 карточек на каждый блок
    ],
    "mainText": "ПОЛНЫЙ текст блока в Markdown БЕЗ СОКРАЩЕНИЙ. Изложи ВСЕ что написал автор",
    "media": []
  }
}

СТРУКТУРА БЛОКА 5 (с AudioUploadBlock):

{
  "block5": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку.",
    "audioUploadBlock": {
      "title": "Итоговое задание: аудио-пересказ",
      "description": "Запишите аудио-пересказ темы своими словами, используя ключевые термины",
      "instructions": [
        "Перечислите 3-5 инструкций для записи аудио",
        "Например: Упомяните основные понятия темы",
        "Используйте примеры из урока"
      ],
      "criteria": "Критерии оценки: полнота, точность терминов, структурированность"
    },
    "mainText": "Итоговый текст урока в Markdown",
    "media": []
  }
}

ВАЖНО: AudioCards требуют реальные аудио-файлы, которых у нас НЕТ в исходном контенте.
ПОЭТОМУ: Генерируй audioUrl как placeholder: "https://audio.example.com/[lesson-id]/[term-slug].mp3"
- Замени [lesson-id] на id урока (если есть) или на "lesson1"
- Замени [term-slug] на латинскую транслитерацию термина (например: "княгиня-ольга" → "knyaginya-olga")

ПРАВИЛА СОЗДАНИЯ AUDIO CARDS:
- Извлекай КЛЮЧЕВЫЕ термины из исходного контента
- term: название термина (2-5 слов)
- audioUrl: placeholder URL (см. выше)
- duration: примерная длительность в секундах (20-60 сек для определения)
- Создавай МИНИМУМ 6-10 карточек на КАЖДЫЙ блок (это обязательное требование!)
- Используй ТОЛЬКО термины ИЗ ИСХОДНОГО КОНТЕНТА

ПРАВИЛА СОЗДАНИЯ AUDIO UPLOAD BLOCK (только block5):
- title: заголовок задания
- description: краткое описание (1-2 предложения)
- instructions: массив из 3-5 конкретных инструкций
- criteria: критерии оценки аудио-пересказа

ПРАВИЛА СОЗДАНИЯ INTROTEXT (ОБЯЗАТЕЛЬНО ДЛЯ КАЖДОГО БЛОКА!):
- introText - это логичная подводка, которая последовательно ведет ученика по уроку
- ЗАПРЕЩЕНО использовать шаблонные фразы типа "Введение к разделу N"
- Каждый блок должен иметь УНИКАЛЬНЫЙ introText
- Примеры правильных introText:
  * Блок 1: "Начнем наше знакомство с темой. Послушайте ключевые термины..."
  * Блок 2: "Теперь углубимся в основные понятия через аудио-материалы..."
  * Блок 3: "Познакомимся с практическими примерами использования терминов..."
  * Блок 4: "Для более глубокого понимания послушайте дополнительные разъяснения..."
  * Блок 5: "Проверим, как хорошо усвоена терминология. Запишите аудио-пересказ..."
- КРИТИЧЕСКИ ВАЖНО: генерируй introText для КАЖДОГО блока!

ПРАВИЛА РАБОТЫ С МЕДИА:
- НЕ добавляй медиа в блоки 1-3! Оставляй "media": []
- ВСЕ медиа будут добавлены в блок 4 (углубленное изучение)

РАСПРЕДЕЛЕНИЕ КОНТЕНТА ПО БЛОКАМ:
- БЛОК 1: Введение + 6-8 аудио-карточек + ПОЛНЫЙ текст
- БЛОК 2: Основная теория + 8-10 аудио-карточек + ПОЛНЫЙ текст
- БЛОК 3: Практические примеры + 6-8 аудио-карточек + ПОЛНЫЙ текст
- БЛОК 4: Углубленное изучение + 6-8 аудио-карточек + ПОЛНЫЙ текст
- БЛОК 5: Итоги + AudioUploadBlock + ПОЛНЫЙ текст

КРИТИЧЕСКИ ВАЖНО:
1. НЕ добавляй информацию, которой нет в исходном контенте
2. НЕ изменяй факты, даты, имена, термины
3. Создавай МИНИМУМ 6-10 аудио-карточек на КАЖДЫЙ блок (обязательно!)
4. Копируй URL медиа ТОЧНО как есть
5. Верни JSON для ВСЕХ 5 блоков
6. audioUrl - это placeholder, не настоящие файлы
7. ИЗЛАГАЙ ПОЛНОСТЬЮ весь текст автора в mainText БЕЗ СОКРАЩЕНИЙ! Это КЛЮЧЕВОЕ требование!

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО валидный JSON без комментариев:
{
  "block1": { "introText": "...", "audioCards": [...], "mainText": "...", "media": [] },
  "block2": { "introText": "...", "audioCards": [...], "mainText": "...", "media": [] },
  "block3": { "introText": "...", "audioCards": [...], "mainText": "...", "media": [] },
  "block4": { "introText": "...", "audioCards": [...], "mainText": "...", "media": [...] },
  "block5": { "introText": "...", "audioUploadBlock": {...}, "mainText": "...", "media": [] }
}
`

    case 'kinesthetic':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ДЛЯ КИНЕСТЕТИЧЕСКОГО ТИПА (KINESTHETIC)
═══════════════════════════════════════════════════════════════════════════════

Ты должен упаковать контент автора в ИНТЕРАКТИВНЫЕ ШАБЛОНЫ для кинестетического восприятия.

ИСПОЛЬЗУЙ ДВА ШАБЛОНА:
1. **GoalsChecklist** - чек-лист целей обучения (только в БЛОКЕ 1)
2. **PracticalText** - практический текст с заданиями (в БЛОКАХ 2-5)

СТРУКТУРА БЛОКА 1 (с GoalsChecklist):

{
  "block1": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку. Например: 'Начнем с постановки целей...' или 'Что вы сможете сделать после изучения темы?...'",
    "goalsChecklist": {
      "goals": [
        {
          "id": "1",
          "goal": "Формулировка учебной цели (что студент сможет сделать)",
          "completed": false
        }
        // ОБЯЗАТЕЛЬНО 5-8 целей
      ]
    },
    "mainText": "ПОЛНЫЙ текст блока в Markdown БЕЗ СОКРАЩЕНИЙ. Изложи ВСЕ что написал автор",
    "media": []
  }
}

СТРУКТУРА БЛОКОВ 2-5 (с PracticalText):

{
  "block2": {
    "introText": "ОБЯЗАТЕЛЬНО! Логичная подводка к блоку (2-3 предложения), которая ведет ученика по уроку.",
    "practicalText": {
      "title": "Заголовок практического задания",
      "tasks": [
        {
          "id": "1",
          "instruction": "Четкая инструкция к заданию (что нужно сделать)",
          "example": "Пример выполнения или шаблон"
        }
        // ОБЯЗАТЕЛЬНО 3-5 заданий на блок
      ],
      "criteria": "Критерии оценки выполнения заданий"
    },
    "mainText": "ПОЛНЫЙ текст блока в Markdown БЕЗ СОКРАЩЕНИЙ. Изложи ВСЕ что написал автор",
    "media": []
  }
}

ПРАВИЛА СОЗДАНИЯ GOALS CHECKLIST (block1):
- Формулируй цели в формате "Научиться...", "Понять...", "Применить..."
- Каждая цель - конкретное измеримое достижение
- goal: формулировка цели (одно предложение)
- completed: всегда false (студент будет отмечать сам)
- Создавай МИНИМУМ 5-8 целей на блок (это обязательное требование!)
- Извлекай цели ИЗ ИСХОДНОГО КОНТЕНТА (что студент должен освоить)

ПРАВИЛА СОЗДАНИЯ PRACTICAL TEXT (blocks 2-5):
- title: заголовок задания (краткий и понятный)
- tasks: массив из 3-5 практических заданий
  * instruction: что конкретно нужно сделать (1-2 предложения)
  * example: пример выполнения или шаблон для заполнения
- criteria: как будет оцениваться работа (2-3 критерия)
- Задания должны быть ПРАКТИЧЕСКИМИ (создать, написать, нарисовать, сравнить)
- Используй примеры ИЗ ИСХОДНОГО КОНТЕНТА

ПРАВИЛА СОЗДАНИЯ INTROTEXT (ОБЯЗАТЕЛЬНО ДЛЯ КАЖДОГО БЛОКА!):
- introText - это логичная подводка, которая последовательно ведет ученика по уроку
- ЗАПРЕЩЕНО использовать шаблонные фразы типа "Введение к разделу N"
- Каждый блок должен иметь УНИКАЛЬНЫЙ introText
- Примеры правильных introText:
  * Блок 1: "Начнем с постановки целей. Что вы сможете делать после изучения темы?..."
  * Блок 2: "Теперь перейдем к практике. Выполним задания на основе изученного..."
  * Блок 3: "Применим полученные знания на конкретных примерах..."
  * Блок 4: "Углубимся в практику с более сложными заданиями..."
  * Блок 5: "Проверим, как хорошо усвоен материал. Выполните итоговое задание..."
- КРИТИЧЕСКИ ВАЖНО: генерируй introText для КАЖДОГО блока!

ПРАВИЛА РАБОТЫ С МЕДИА:
- НЕ добавляй медиа в блоки 1-3! Оставляй "media": []
- ВСЕ медиа будут добавлены в блок 4 (углубленное изучение)

РАСПРЕДЕЛЕНИЕ КОНТЕНТА ПО БЛОКАМ:
- БЛОК 1: Цели обучения (5-8 целей) + ПОЛНЫЙ обзор темы
- БЛОК 2: Основная теория + практические задания (3-5 заданий) + ПОЛНЫЙ текст
- БЛОК 3: Применение на практике + задания с примерами (3-5 заданий) + ПОЛНЫЙ текст
- БЛОК 4: Углубленная практика + сложные задания (3-5 заданий) + ПОЛНЫЙ текст
- БЛОК 5: Итоговый проект + финальное задание (3-4 задания) + ПОЛНЫЙ текст

КРИТИЧЕСКИ ВАЖНО:
1. НЕ добавляй информацию, которой нет в исходном контенте
2. НЕ изменяй факты, даты, имена, термины
3. Создавай МИНИМУМ 5-8 целей в блоке 1 и 3-5 заданий в блоках 2-5 (обязательно!)
4. Копируй URL медиа ТОЧНО как есть
5. Верни JSON для ВСЕХ 5 блоков
6. Задания должны быть ПРАКТИЧЕСКИМИ, а не теоретическими
7. ИЗЛАГАЙ ПОЛНОСТЬЮ весь текст автора в mainText БЕЗ СОКРАЩЕНИЙ! Это КЛЮЧЕВОЕ требование!

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО валидный JSON без комментариев:
{
  "block1": { "introText": "...", "goalsChecklist": {...}, "mainText": "...", "media": [] },
  "block2": { "introText": "...", "practicalText": {...}, "mainText": "...", "media": [] },
  "block3": { "introText": "...", "practicalText": {...}, "mainText": "...", "media": [] },
  "block4": { "introText": "...", "practicalText": {...}, "mainText": "...", "media": [...] },
  "block5": { "introText": "...", "practicalText": {...}, "mainText": "...", "media": [] }
}
`

    default:
      return basePrompt + 'Адаптируй контент под визуальный тип обучения.'
  }
}

export async function POST(request: NextRequest) {
  // Логируем в самом начале - это должно появиться в любом случае
  console.error('🔵 [AI Adaptation] ========== NEW REQUEST RECEIVED ==========')
  console.error('🔵 [AI Adaptation] Request URL:', request.url)
  console.error('🔵 [AI Adaptation] Request method:', request.method)

  try {
    console.error('🔵 [AI Adaptation] Request headers:', Object.fromEntries(request.headers.entries()))
  } catch (e) {
    console.error('🔵 [AI Adaptation] Could not log headers:', e)
  }

  let requestBody: any = null
  try {
    console.error('📥 [AI Adaptation] Parsing request body...')
    requestBody = await request.json()
    console.error('📥 [AI Adaptation] Request body parsed successfully')
    console.error('📥 [AI Adaptation] Request body received:', {
      hasLessonContent: !!requestBody.lessonContent,
      studentType: requestBody.studentType,
      lessonId: requestBody.lessonId,
      saveToDatabase: requestBody.saveToDatabase,
      forceRegenerate: requestBody.forceRegenerate,
      lessonContentKeys: requestBody.lessonContent ? Object.keys(requestBody.lessonContent) : null,
      lessonContentBlocks: requestBody.lessonContent?.blocks?.length || 0
    })
  } catch (parseError: any) {
    console.error('❌ [AI Adaptation] ========== REQUEST BODY PARSE ERROR ==========')
    console.error('❌ [AI Adaptation] Parse error:', parseError.message)
    console.error('❌ [AI Adaptation] Parse error stack:', parseError.stack)
    return NextResponse.json(
      { success: false, error: `Ошибка при парсинге тела запроса: ${parseError.message}` },
      { status: 400 }
    )
  }

  try {
    const { lessonContent, studentType, lessonId, courseId: requestCourseId, saveToDatabase = true, forceRegenerate = false }: AdaptationRequest = requestBody

    if (!lessonContent || !studentType || !lessonId) {
      console.error('❌ [AI Adaptation] Missing required parameters:', {
        hasLessonContent: !!lessonContent,
        hasStudentType: !!studentType,
        hasLessonId: !!lessonId
      })
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные параметры: lessonContent, studentType, lessonId' },
        { status: 400 }
      )
    }

    // Нормализуем тип студента (original не нормализуется, обрабатывается отдельно)
    let normalizedType: AdaptationType
    try {
      if (studentType === 'original') {
        normalizedType = 'original'
      } else {
        normalizedType = normalizeStudentType(studentType)
        // Проверяем, что нормализованный тип валиден
        if (!['visual', 'auditory', 'kinesthetic', 'original'].includes(normalizedType)) {
          console.error('❌ [AI Adaptation] Invalid normalized type:', normalizedType, 'from studentType:', studentType)
          return NextResponse.json(
            { success: false, error: `Неверный тип адаптации: ${normalizedType}. Ожидается: visual, auditory, kinesthetic или original` },
            { status: 400 }
          )
        }
      }
    } catch (error: any) {
      console.error('❌ [AI Adaptation] Error normalizing student type:', error)
      return NextResponse.json(
        { success: false, error: `Ошибка при нормализации типа студента: ${error.message || 'Неизвестная ошибка'}` },
        { status: 500 }
      )
    }
    
    console.error(`🔄 [AI Adaptation] ========== STARTING ADAPTATION ==========`)
    console.error(`🔄 [AI Adaptation] Lesson ID: ${lessonId}`)
    console.error(`🔄 [AI Adaptation] Student Type (original): ${studentType}`)
    console.error(`🔄 [AI Adaptation] Student Type (normalized): ${normalizedType}`)
    console.error(`🔄 [AI Adaptation] Save to DB: ${saveToDatabase}`)
    console.error(`🔄 [AI Adaptation] Force regenerate: ${forceRegenerate}`)

    console.error('🔐 [AI Adaptation] Creating Supabase client...')
    const supabase = await createClient()

    // Проверяем права доступа (автор или соавтор)
    console.log('🔐 [AI Adaptation] Checking user authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('❌ [AI Adaptation] Auth error:', authError)
      const jwtCheck = handleDatabaseError(authError, 'authentication')
      if (jwtCheck.isJwtExpired) {
        return NextResponse.json(
          { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
          { status: 401 }
        )
      }
    }
    if (!user) {
      console.error('❌ [AI Adaptation] User not authenticated')
      return NextResponse.json(
        { success: false, error: 'Неавторизован' },
        { status: 401 }
      )
    }
    console.log('✅ [AI Adaptation] User authenticated:', user.id)

    // Получаем урок и проверяем права доступа
    console.log('📚 [AI Adaptation] Fetching lesson from database...')
    console.log('📚 [AI Adaptation] Lesson ID to search:', lessonId)
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .single()

    if (lessonError) {
      console.error('❌ [AI Adaptation] Lesson query error:', {
        error: lessonError,
        message: lessonError.message,
        code: lessonError.code,
        details: lessonError.details,
        hint: lessonError.hint
      })
      
      const jwtCheck = handleDatabaseError(lessonError, 'lesson query')
      if (jwtCheck.isJwtExpired) {
        return NextResponse.json(
          { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
          { status: 401 }
        )
      }
    }
    
    if (lessonError || !lesson) {
      console.error('❌ [AI Adaptation] Lesson not found in course_lessons table')
      console.log('📚 [AI Adaptation] Will try to find lesson in modules.lessons...')
      // Не возвращаем ошибку сразу, возможно урок в modules.lessons
    } else {
      console.log('✅ [AI Adaptation] Lesson found in course_lessons:', {
        lessonId: lesson.id,
        courseId: lesson.course_id
      })
    }

    // Если урок не найден в course_lessons, используем courseId из запроса
    let courseId = lesson?.course_id || requestCourseId
    
    // Если courseId все еще не найден, пытаемся найти его из курса
    if (!courseId && requestCourseId) {
      courseId = requestCourseId
    }
    
    // Если courseId все еще не найден, возвращаем ошибку (нужен для RLS политики)
    if (!courseId) {
      console.error('❌ [AI Adaptation] Course ID is required but not found')
      console.error('❌ [AI Adaptation] Lesson ID:', lessonId)
      console.error('❌ [AI Adaptation] Request courseId:', requestCourseId)
      console.error('❌ [AI Adaptation] Lesson from DB:', lesson)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Course ID is required for saving adaptation. Please provide courseId in the request.'
        },
        { status: 400 }
      )
    }
    
      console.log('✅ [AI Adaptation] Course ID determined:', courseId)

    // Проверяем доступ к редактированию (автор или соавтор)
    if (courseId) {
      console.log('🔐 [AI Adaptation] Checking course access...')
      console.log('🔐 [AI Adaptation] Course ID:', courseId)
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, author_id')
        .eq('id', courseId)
        .single()

      if (courseError) {
        console.error('❌ [AI Adaptation] Course query error:', courseError)
        const jwtCheck = handleDatabaseError(courseError, 'course query')
        if (jwtCheck.isJwtExpired) {
          return NextResponse.json(
            { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
            { status: 401 }
          )
        }
      }

      if (!course) {
        console.error('❌ [AI Adaptation] Course not found:', courseId)
        return NextResponse.json(
          { success: false, error: 'Курс не найден' },
          { status: 404 }
        )
      }

      console.log('✅ [AI Adaptation] Course found:', {
        courseId: course.id,
        authorId: course.author_id
      })

      const isAuthor = course.author_id === user.id
      console.log('🔐 [AI Adaptation] Is author:', isAuthor)
      
      if (!isAuthor) {
        // Проверяем, является ли соавтором
        console.log('🔐 [AI Adaptation] Checking collaborator status...')
        const { data: collaborator, error: collabError } = await supabase
          .from('course_collaborators')
          .select('id')
          .eq('course_id', courseId)
          .eq('collaborator_user_id', user.id)
          .maybeSingle()

        if (collabError) {
          console.error('❌ [AI Adaptation] Collaborator query error:', collabError)
          const jwtCheck = handleDatabaseError(collabError, 'collaborator query')
          if (jwtCheck.isJwtExpired) {
            return NextResponse.json(
              { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
              { status: 401 }
            )
          }
        }

        if (!collaborator) {
          console.error('❌ [AI Adaptation] User is not author or collaborator')
          return NextResponse.json(
            { success: false, error: 'У вас нет прав доступа к этому курсу' },
            { status: 403 }
          )
        }
        console.log('✅ [AI Adaptation] User is collaborator')
      }
    } else {
      console.log('⚠️ [AI Adaptation] Course ID not available, skipping access check')
    }

    // Проверяем наличие материалов урока (опционально, не критично)
    console.log('📊 [AI Adaptation] Analyzing lesson materials...')
    try {
      // Вызываем RPC только если функция существует и courseId доступен
      if (courseId) {
        const { data: materialsAnalysis, error: materialsError } = await supabase.rpc('analyze_lesson_materials', {
          lesson_id_param: lessonId,
          course_id_param: courseId
        })

        if (materialsError) {
          console.warn('⚠️ [AI Adaptation] Materials analysis error (non-critical):', materialsError.message)
          const jwtCheck = handleDatabaseError(materialsError, 'materials analysis')
          if (jwtCheck.isJwtExpired) {
            // Это не критично для процесса, но логируем
            console.warn('⚠️ [AI Adaptation] JWT expired during materials analysis, continuing anyway')
          }
        } else if (materialsAnalysis) {
          console.log('📊 [AI Adaptation] Materials analysis result:', {
            has_audio: materialsAnalysis.has_audio,
            has_video: materialsAnalysis.has_video,
            has_images: materialsAnalysis.has_images,
            has_diagrams: materialsAnalysis.has_diagrams,
            has_practice: materialsAnalysis.has_practice,
            recommendationsCount: materialsAnalysis.recommendations?.length || 0
          })
        }
      } else {
        console.log('⚠️ [AI Adaptation] Skipping materials analysis (courseId not available)')
      }
    } catch (error: any) {
      console.warn('⚠️ [AI Adaptation] Error analyzing materials (continuing anyway):', error?.message || error)
    }

    // Проверяем, существует ли уже адаптация (если не требуется принудительная регенерация)
    if (saveToDatabase && !forceRegenerate) {
      const { data: existing } = await supabase
        .from('lesson_adaptations')
        .select('id, status')
        .eq('lesson_id', lessonId)
        .eq('adaptation_type', normalizedType)
        .in('status', ['generated', 'edited', 'published'])
        .maybeSingle()

      if (existing) {
        console.log(`⚠️ [AI Adaptation] Adaptation for ${normalizedType} already exists for lesson ${lessonId}`)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Адаптация уже существует. Используйте forceRegenerate=true для принудительной регенерации.',
            existingAdaptationId: existing.id
          },
          { status: 409 }
        )
      }
    }

    // Обновляем статус генерации в метаданных
    await supabase
      .from('lesson_adaptation_metadata')
      .upsert({
        lesson_id: lessonId,
        adaptation_type: normalizedType,
        ai_generation_status: 'processing',
        ai_generation_timestamp: new Date().toISOString(),
        ai_generation_error: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id,adaptation_type'
      })
    
    console.log('📝 [AI Adaptation] Updated metadata status to processing')

    console.log('📝 [AI Adaptation] Generating adaptation prompt...')
    console.log('📝 [AI Adaptation] Lesson content structure:', {
      title: lessonContent.title,
      description: lessonContent.description,
      blocksCount: lessonContent.blocks?.length || 0,
      blocks: lessonContent.blocks?.map((b: any) => ({
        title: b.title,
        type: b.type,
        contentLength: b.content?.length || 0
      })) || []
    })

    const prompt = getAdaptationPrompt(studentType, lessonContent)
    console.log('📝 [AI Adaptation] Prompt generated, length:', prompt.length)
    console.log('📝 [AI Adaptation] Prompt preview (first 500 chars):', prompt.substring(0, 500))

    console.log('🚀 [AI Adaptation] ========== SENDING REQUEST TO OPENROUTER API ==========')
    console.log('🚀 [AI Adaptation] API URL:', OPENROUTER_API_URL)
    console.log('🚀 [AI Adaptation] API Key present:', !!OPENROUTER_API_KEY)
    console.log('🚀 [AI Adaptation] API Key length:', OPENROUTER_API_KEY?.length || 0)
    console.log('🚀 [AI Adaptation] Student type:', normalizedType)
    console.log('🚀 [AI Adaptation] Lesson title:', lessonContent.title)
    console.log('🚀 [AI Adaptation] Model:', OPENROUTER_MODEL)
    console.log('🚀 [AI Adaptation] Max tokens: 16000')
    console.log('🚀 [AI Adaptation] Temperature: 0.7')

    // Проверяем наличие API ключа
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 20) {
      console.error('❌ [AI Adaptation] Invalid or missing OpenRouter API key')
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: 'API ключ OpenRouter не настроен или неверен',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      return NextResponse.json(
        { 
          success: false, 
          error: 'API ключ OpenRouter не настроен. Пожалуйста, настройте переменную окружения OPENROUTER_API_KEY.'
        },
        { status: 500 }
      )
    }

    // Логируем информацию о запросе (без полного ключа)
    console.log('🚀 [AI Adaptation] Making request to OpenRouter API:', {
      url: OPENROUTER_API_URL,
      hasApiKey: !!OPENROUTER_API_KEY,
      apiKeyPrefix: OPENROUTER_API_KEY?.substring(0, 10) + '...',
      apiKeyLength: OPENROUTER_API_KEY?.length,
      model: OPENROUTER_MODEL,
      promptLength: prompt.length
    })

    const openRouterRequestBody = {
      model: OPENROUTER_MODEL,
      max_tokens: 16000, // Увеличено для генерации всех 5 блоков
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт по адаптации образовательного контента. Всегда отвечай только в формате JSON без дополнительных комментариев. Строго следуй указанной структуре блоков. КРИТИЧЕСКИ ВАЖНО: ты ДОЛЖЕН вернуть ВСЕ 5 блоков (block1, block2, block3, block4, block5). Каждый блок должен содержать три слоя: intro (подводка), content (улучшенная текстовая версия), adaptation (адаптированный элемент). Если ответ обрезается из-за лимита токенов, сократи текст внутри блоков, но обязательно верни все 5 блоков.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
        'X-Title': 'Ruta Course Adaptation'
      },
      body: JSON.stringify(openRouterRequestBody)
    })

    console.log('📡 [AI Adaptation] ========== OPENROUTER API RESPONSE ==========')
    console.log('📡 [AI Adaptation] Response status:', response.status)
    console.log('📡 [AI Adaptation] Response status text:', response.statusText)
    console.log('📡 [AI Adaptation] Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ [AI Adaptation] ========== CLAUDE API ERROR ==========')
      console.error('❌ [AI Adaptation] Status:', response.status)
      console.error('❌ [AI Adaptation] Status text:', response.statusText)
      console.error('❌ [AI Adaptation] Error data:', errorData)
      try {
        const parsedError = JSON.parse(errorData || '{}')
        console.error('❌ [AI Adaptation] Error data (parsed):', parsedError)
      } catch (parseErr) {
        console.error('❌ [AI Adaptation] Error data (raw):', errorData)
      }
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = `Ошибка при обращении к OpenRouter API: ${response.status} ${response.statusText}`
      if (response.status === 403) {
        errorMessage = 'Ошибка доступа к OpenRouter API. Проверьте, что API ключ (OPENROUTER_API_KEY) правильно настроен в переменных окружения и имеет необходимые права доступа.'
      } else if (response.status === 401) {
        errorMessage = 'Неверный API ключ OpenRouter. Проверьте переменную окружения OPENROUTER_API_KEY.'
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов к OpenRouter API. Попробуйте позже.'
      }
      
      // Обновляем статус ошибки в метаданных
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: errorMessage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: errorData.substring(0, 500) // Первые 500 символов для отладки
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('📥 [AI Adaptation] ========== OPENROUTER API RESPONSE DATA ==========')
    console.log('📥 [AI Adaptation] Response data keys:', Object.keys(data))
    console.log('📥 [AI Adaptation] Response data structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasId: !!data.id,
      hasModel: !!data.model,
      hasUsage: !!data.usage
    })
    console.log('📥 [AI Adaptation] Full response data:', JSON.stringify(data, null, 2))
    
    // OpenRouter API возвращает ответ в формате { choices: [{ message: { content: "..." } }] }
    const aiResponse = data.choices?.[0]?.message?.content
    console.log('📥 [AI Adaptation] Extracted AI response:', {
      hasResponse: !!aiResponse,
      responseLength: aiResponse?.length || 0,
      responsePreview: aiResponse?.substring(0, 200) || 'N/A'
    })

    if (!aiResponse) {
      console.error('❌ [AI Adaptation] ========== NO CONTENT IN AI RESPONSE ==========')
      console.error('❌ [AI Adaptation] Full response data:', JSON.stringify(data, null, 2))
      
      // Обновляем статус ошибки в метаданных
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: 'Пустой ответ от ИИ',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      return NextResponse.json(
        { 
          success: false, 
          error: 'Пустой ответ от ИИ',
          responseData: data
        },
        { status: 500 }
      )
    }

    console.log('📄 [AI Adaptation] AI response content received, length:', aiResponse.length)

    // Парсим JSON ответ от ИИ
    console.log('🔧 [AI Adaptation] ========== PARSING AI RESPONSE ==========')
    let adaptedContent: AdaptationContent
    try {
      // Убираем возможные markdown code blocks и лишние пробелы
      let cleanedResponse = aiResponse.trim()
      console.log('🔧 [AI Adaptation] Original response length:', cleanedResponse.length)
      console.log('🔧 [AI Adaptation] Original response (first 500 chars):', cleanedResponse.substring(0, 500))
      
      // Удаляем markdown code blocks
      const beforeClean = cleanedResponse
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim()
      if (beforeClean !== cleanedResponse) {
        console.log('🔧 [AI Adaptation] Removed markdown code blocks')
      }
      
      // Пытаемся найти JSON объект в ответе (на случай, если есть дополнительный текст)
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0]
        console.log('🔧 [AI Adaptation] Extracted JSON from response')
      }
      
      console.log('🔧 [AI Adaptation] Cleaned response length:', cleanedResponse.length)
      console.log('🔧 [AI Adaptation] Cleaned response (first 500 chars):', cleanedResponse.substring(0, 500))
      
      adaptedContent = JSON.parse(cleanedResponse)
      console.log('✅ [AI Adaptation] ========== JSON PARSED SUCCESSFULLY ==========')
      console.log('✅ [AI Adaptation] Parsed content keys:', Object.keys(adaptedContent))
      console.log('✅ [AI Adaptation] Blocks found:', Object.keys(adaptedContent).filter(k => k.startsWith('block')))
    } catch (parseError: any) {
      console.error('❌ [AI Adaptation] ========== JSON PARSE ERROR ==========')
      console.error('❌ [AI Adaptation] Parse error message:', parseError.message)
      console.error('❌ [AI Adaptation] Parse error stack:', parseError.stack)
      console.error('❌ [AI Adaptation] AI response (first 1000 chars):', aiResponse.substring(0, 1000))
      console.error('❌ [AI Adaptation] AI response (last 1000 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 1000)))
      
      // Обновляем статус ошибки в метаданных
      const errorMessage = `Ошибка при парсинге ответа ИИ: ${parseError.message}`
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: errorMessage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          parseError: parseError.message,
          responsePreview: aiResponse.substring(0, 500)
        },
        { status: 500 }
      )
    }

    console.log('✅ [AI Adaptation] Parsed adapted content successfully')
    console.log('✅ [AI Adaptation] Parsed content blocks:', Object.keys(adaptedContent).filter(k => k.startsWith('block')))

    // Трансформируем новый формат AI в старый формат (с intro/content/adaptation)
    console.log('🔄 [AI Adaptation] ========== TRANSFORMING FORMAT ==========')
    adaptedContent = transformNewFormatToLegacy(adaptedContent, normalizedType)
    console.log('✅ [AI Adaptation] Format transformation complete')

    // Копируем медиа-элементы из оригинальных блоков в адаптированные
    console.log('🔄 [AI Adaptation] Copying media elements from original blocks...')
    lessonContent.blocks.forEach((originalBlock, index) => {
      const blockKey = `block${index + 1}` as keyof typeof adaptedContent
      if (adaptedContent[blockKey] && originalBlock.elements && originalBlock.elements.length > 0) {
        const mediaElements = originalBlock.elements.filter(el =>
          ['video', 'audio', 'image', 'file'].includes(el.type)
        )
        if (mediaElements.length > 0) {
          if (!adaptedContent[blockKey].content.elements) {
            adaptedContent[blockKey].content.elements = []
          }
          // Добавляем медиа-элементы которых еще нет
          mediaElements.forEach(mediaEl => {
            const exists = adaptedContent[blockKey].content.elements?.some(
              (el: any) => el.id === mediaEl.id
            )
            if (!exists) {
              adaptedContent[blockKey].content.elements!.push(mediaEl)
              console.log(`✅ [AI Adaptation] Added ${mediaEl.type} element to ${blockKey}`)
            }
          })
        }
      }
    })

    // Проверяем наличие всех блоков перед валидацией
    const foundBlocks = Object.keys(adaptedContent).filter(k => k.startsWith('block')).sort()
    const requiredBlocks = ['block1', 'block2', 'block3', 'block4', 'block5']
    const missingBlocks = requiredBlocks.filter(b => !foundBlocks.includes(b))
    
    if (missingBlocks.length > 0) {
      console.error('❌ [AI Adaptation] ========== MISSING BLOCKS ==========')
      console.error('❌ [AI Adaptation] Found blocks:', foundBlocks)
      console.error('❌ [AI Adaptation] Missing blocks:', missingBlocks)
      console.error('❌ [AI Adaptation] Full response preview:', JSON.stringify(adaptedContent, null, 2).substring(0, 1000))
      
      // Обновляем статус ошибки в метаданных
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: `ИИ не вернул все необходимые блоки. Отсутствуют: ${missingBlocks.join(', ')}. Возможно, ответ был обрезан из-за лимита токенов.`,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      return NextResponse.json(
        { 
          success: false, 
          error: 'ИИ не вернул все необходимые блоки',
          missingBlocks,
          foundBlocks,
          hint: 'Ответ от ИИ был неполным. Попробуйте запустить адаптацию снова или проверьте настройки API.'
        },
        { status: 500 }
      )
    }

    // Валидируем адаптированный контент
    console.log('✅ [AI Adaptation] ========== VALIDATING CONTENT ==========')
    const validation = validateAdaptationContent(adaptedContent)
    console.log('✅ [AI Adaptation] Validation result:', {
      valid: validation.valid,
      errorsCount: validation.errors.length
    })
    
    if (!validation.valid) {
      console.error('❌ [AI Adaptation] ========== VALIDATION ERRORS ==========')
      console.error('❌ [AI Adaptation] Validation errors:', validation.errors)
      
      // Формируем подробное сообщение об ошибках
      const errorMessages = validation.errors.map(err => 
        `Блок ${err.block}: поле ${err.field} - ${err.message}`
      ).join('; ')
      
      // Обновляем статус ошибки в метаданных
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: `Ошибки валидации: ${errorMessages}`,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      return NextResponse.json(
        { 
          success: false, 
          error: 'Ошибки валидации адаптированного контента',
          validationErrors: validation.errors,
          errorSummary: errorMessages
        },
        { status: 500 }
      )
    }

    console.log('✅ [AI Adaptation] ========== VALIDATION PASSED ==========')
    console.log('📊 [AI Adaptation] Blocks validated:', Object.keys(adaptedContent).length)
    console.log('📊 [AI Adaptation] Block details:', Object.keys(adaptedContent).map(key => ({
      key,
      hasIntro: !!adaptedContent[key as keyof AdaptationContent]?.intro,
      hasContent: !!adaptedContent[key as keyof AdaptationContent]?.content,
      hasAdaptation: !!adaptedContent[key as keyof AdaptationContent]?.adaptation
    })))

    // Сохраняем адаптацию в БД
    console.log('💾 [AI Adaptation] ========== SAVING TO DATABASE ==========')
    console.log('💾 [AI Adaptation] Save to database:', saveToDatabase)
    console.log('💾 [AI Adaptation] Lesson ID:', lessonId)
    console.log('💾 [AI Adaptation] Adaptation type:', normalizedType)
    
    try {
      // Проверяем, существует ли уже адаптация (для forceRegenerate)
      console.log('💾 [AI Adaptation] Checking for existing adaptation...')
      const { data: existing, error: existingError } = await supabase
        .from('lesson_adaptations')
        .select('id, version')
        .eq('lesson_id', lessonId)
        .eq('adaptation_type', normalizedType)
        .maybeSingle()

      if (existingError) {
        console.error('❌ [AI Adaptation] Error checking existing adaptation:', existingError)
        const jwtCheck = handleDatabaseError(existingError, 'checking existing adaptation')
        if (jwtCheck.isJwtExpired) {
          return NextResponse.json(
            { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
            { status: 401 }
          )
        }
      }

      if (existing) {
        console.log('💾 [AI Adaptation] Existing adaptation found:', {
          id: existing.id,
          version: existing.version,
          forceRegenerate: forceRegenerate
        })
      } else {
        console.log('💾 [AI Adaptation] No existing adaptation found, will create new')
      }

      if (existing && forceRegenerate) {
        // Удаляем старую версию и создаем новую при принудительной регенерации
        console.log('💾 [AI Adaptation] Deleting old adaptation and creating new one (force regenerate)...')
        console.log('💾 [AI Adaptation] Old adaptation ID:', existing.id)
        console.log('💾 [AI Adaptation] Old version:', existing.version)
        
        // Удаляем старую версию
        const { error: deleteError } = await supabase
          .from('lesson_adaptations')
          .delete()
          .eq('id', existing.id)

        if (deleteError) {
          console.error('❌ [AI Adaptation] ========== DELETE ERROR ==========')
          console.error('❌ [AI Adaptation] Failed to delete old adaptation:', deleteError)
          const jwtCheck = handleDatabaseError(deleteError, 'deleting old adaptation')
          if (jwtCheck.isJwtExpired) {
            return NextResponse.json(
              { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
              { status: 401 }
            )
          }
          throw new Error(`Ошибка при удалении старой адаптации: ${deleteError.message}`)
        } else {
          console.log('✅ [AI Adaptation] Old adaptation deleted successfully')
        }
        
        // Создаем новую версию
        console.log('💾 [AI Adaptation] Creating new adaptation after deletion...')
        const { data: insertedData, error: insertError } = await supabase
          .from('lesson_adaptations')
          .insert({
            lesson_id: lessonId,
            course_id: courseId,
            adaptation_type: normalizedType,
            block1: adaptedContent.block1,
            block2: adaptedContent.block2,
            block3: adaptedContent.block3,
            block4: adaptedContent.block4,
            block5: adaptedContent.block5,
            status: 'generated',
            generated_at: new Date().toISOString(),
            version: (existing.version || 1) + 1
          })
          .select()

        if (insertError) {
          console.error('❌ [AI Adaptation] ========== INSERT ERROR (AFTER DELETE) ==========')
          console.error('❌ [AI Adaptation] Failed to create new adaptation:', insertError)
          const jwtCheck = handleDatabaseError(insertError, 'creating new adaptation after delete')
          if (jwtCheck.isJwtExpired) {
            return NextResponse.json(
              { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
              { status: 401 }
            )
          }
          throw new Error(`Ошибка при создании новой адаптации: ${insertError.message}`)
        } else {
          console.log('✅ [AI Adaptation] New adaptation created in database (force regenerate)')
          console.log('✅ [AI Adaptation] New adaptation ID:', insertedData?.[0]?.id)
          console.log('✅ [AI Adaptation] New version:', (existing.version || 1) + 1)
        }
      } else if (!existing) {
        // Создаем новую адаптацию
        console.log('💾 [AI Adaptation] Creating new adaptation...')
        console.log('💾 [AI Adaptation] Insert data:', {
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          hasBlock1: !!adaptedContent.block1,
          hasBlock2: !!adaptedContent.block2,
          hasBlock3: !!adaptedContent.block3,
          hasBlock4: !!adaptedContent.block4,
          hasBlock5: !!adaptedContent.block5
        })
        
        const { data: insertedData, error: insertError } = await supabase
          .from('lesson_adaptations')
          .insert({
            lesson_id: lessonId,
            course_id: courseId, // Добавляем course_id для RLS политики
            adaptation_type: normalizedType,
            block1: adaptedContent.block1,
            block2: adaptedContent.block2,
            block3: adaptedContent.block3,
            block4: adaptedContent.block4,
            block5: adaptedContent.block5,
            status: 'generated',
            generated_at: new Date().toISOString(),
            version: 1
          })
          .select()

        if (insertError) {
          console.error('❌ [AI Adaptation] ========== INSERT ERROR ==========')
          console.error('❌ [AI Adaptation] Failed to create adaptation:', insertError)
          console.error('❌ [AI Adaptation] Insert error details:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          })
          const jwtCheck = handleDatabaseError(insertError, 'creating adaptation')
          if (jwtCheck.isJwtExpired) {
            return NextResponse.json(
              { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
              { status: 401 }
            )
          }
          throw new Error(`Ошибка при создании адаптации: ${insertError.message}`)
        } else {
          console.log('✅ [AI Adaptation] Adaptation created in database')
          console.log('✅ [AI Adaptation] Inserted adaptation ID:', insertedData?.[0]?.id)
        }
      } else {
        console.log('⚠️ [AI Adaptation] Adaptation already exists and forceRegenerate is false, skipping save')
      }
      
      // Обновляем статус генерации в метаданных
      const { error: metadataError } = await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'completed',
          ai_generation_timestamp: new Date().toISOString(),
          ai_generation_error: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })

      if (metadataError) {
        console.error('❌ [AI Adaptation] Failed to update metadata:', metadataError)
        const jwtCheck = handleDatabaseError(metadataError, 'updating metadata')
        if (jwtCheck.isJwtExpired) {
          // Это не критично для процесса, но логируем
          console.warn('⚠️ [AI Adaptation] JWT expired during metadata update, continuing anyway')
        }
        // Не критично, продолжаем
      } else {
        console.log('✅ [AI Adaptation] Metadata updated successfully')
      }
    } catch (saveError: any) {
      console.error('❌ [AI Adaptation] Error saving adaptation:', saveError)
      
      // Обновляем статус ошибки в метаданных
      await supabase
        .from('lesson_adaptation_metadata')
        .upsert({
          lesson_id: lessonId,
          adaptation_type: normalizedType,
          ai_generation_status: 'error',
          ai_generation_error: `Ошибка при сохранении: ${saveError.message}`,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lesson_id,adaptation_type'
        })
      
      // Возвращаем ошибку, но также возвращаем сгенерированный контент
      return NextResponse.json(
        { 
          success: false, 
          error: `Ошибка при сохранении адаптации: ${saveError.message}`,
          adaptedContent, // Возвращаем контент, даже если сохранение не удалось
          savedToDatabase: false
        },
        { status: 500 }
      )
    }

    console.log('✅ [AI Adaptation] ========== ADAPTATION COMPLETED SUCCESSFULLY ==========')
    console.log('📦 [AI Adaptation] Blocks generated:', Object.keys(adaptedContent).length)
    console.log('📦 [AI Adaptation] Final response:', {
      success: true,
      lessonId,
      studentType: normalizedType,
      savedToDatabase: true,
      blocksCount: Object.keys(adaptedContent).length
    })

    return NextResponse.json({
      success: true,
      adaptedContent,
      lessonId,
      studentType: normalizedType,
      savedToDatabase: true,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ [AI Adaptation] ========== UNHANDLED ERROR ==========')
    console.error('❌ [AI Adaptation] Error type:', error?.constructor?.name)
    console.error('❌ [AI Adaptation] Error message:', error?.message)
    console.error('❌ [AI Adaptation] Error stack:', error?.stack)
    console.error('❌ [AI Adaptation] Error code:', error?.code)
    console.error('❌ [AI Adaptation] Error details:', error?.details)
    console.error('❌ [AI Adaptation] Error hint:', error?.hint)
    console.error('❌ [AI Adaptation] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    // Проверяем, не истек ли JWT токен
    const jwtCheck = handleDatabaseError(error, 'unhandled error')
    if (jwtCheck.isJwtExpired) {
      return NextResponse.json(
        { success: false, error: jwtCheck.errorMessage, code: 'JWT_EXPIRED' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Внутренняя ошибка сервера: ${error?.message || 'Неизвестная ошибка'}`,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

