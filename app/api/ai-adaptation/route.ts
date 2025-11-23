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
  // Для 'original' не нормализуем, обрабатываем отдельно
  if (studentType === 'original') {
    // Обработка для 'original' будет в switch ниже
  }
  const normalizedType = studentType === 'original' ? 'original' : normalizeStudentType(studentType)
  
  const basePrompt = studentType === 'original' 
    ? `
Ты - эксперт по форматированию образовательного контента. Твоя задача - структурировать и оформить оригинальный контент автора БЕЗ адаптации под типы восприятия.

ИСХОДНЫЙ КОНТЕНТ УРОКА:
Название: ${lessonContent.title}
Описание: ${lessonContent.description || 'Не указано'}
Блоки урока:
${lessonContent.blocks.map((block, index) => {
  let blockInfo = `${index + 1}. ${block.title}: ${block.content}`
  if (block.elements && block.elements.length > 0) {
    const mediaElements = block.elements.filter(el => ['video', 'audio', 'image', 'file'].includes(el.type))
    if (mediaElements.length > 0) {
      blockInfo += '\n   Медиа-элементы (НЕ ИЗМЕНЯТЬ): ' + mediaElements.map(el => `${el.type} (${el.content})`).join(', ')
    }
  }
  return blockInfo
}).join('\n')}

⚠️ ВАЖНО: Некоторые блоки содержат медиа-элементы (video, audio, image, file). Эти элементы НЕ НУЖНО адаптировать или изменять - они автоматически добавятся в content.elements во всех адаптациях.

ЗАДАЧА: Отформатировать и структурировать этот контент БЕЗ адаптации, создав ОБЯЗАТЕЛЬНО ВСЕ 5 БЛОКОВ с трехслойной структурой.

КРИТИЧЕСКИ ВАЖНО: Ты ДОЛЖЕН вернуть ВСЕ 5 блоков (block1, block2, block3, block4, block5). Даже если исходный урок содержит только один блок, ты должен создать 5 блоков, распределив контент по блокам логически. Если ответ обрезается из-за лимита токенов, сократи длину текста внутри блоков, но обязательно верни структуру всех 5 блоков.

═══════════════════════════════════════════════════════════════════════════════
СТРУКТУРА КАЖДОГО БЛОКА (ОБЯЗАТЕЛЬНО):
═══════════════════════════════════════════════════════════════════════════════

1. intro (Подводка):
   - Тип: объект с полем "text" (строка, 2-3 предложения)
   - Назначение: кратко описать, что будет в блоке
   - Стиль: нейтральный, информативный

2. content (Оригинальный контент автора):
   - Тип: объект с полями "title", "text", "sections", "type"
   - title: заголовок блока (строка)
   - text: ПОЛНЫЙ текст контента автора, улучшенный для читабельности (разбивка на абзацы, выделение ключевых терминов)
   - sections: массив секций с подзаголовками (если нужно)
   - type: всегда "text"
   - Назначение: представить ВЕСЬ контент автора в читаемом виде

3. adaptation (Без адаптации):
   - Тип: объект с полями "type", "element"
   - type: "original"
   - element: объект с полями "type", "data", "description"
   - type: "text" (просто текст, без специальных элементов)
   - data: { text: "Оригинальный контент автора без изменений" }
   - description: "Оригинальная версия контента автора"
   - Назначение: показать, что это оригинальная версия без адаптации
`
    : `
Ты - эксперт по адаптации образовательного контента для ${normalizedType === 'visual' ? 'визуалов' : normalizedType === 'auditory' ? 'аудиалов' : 'кинестетиков'}.

ИСХОДНЫЙ КОНТЕНТ УРОКА:
Название: ${lessonContent.title}
Описание: ${lessonContent.description || 'Не указано'}
Блоки урока:
${lessonContent.blocks.map((block, index) => {
  let blockInfo = `${index + 1}. ${block.title}: ${block.content}`
  if (block.elements && block.elements.length > 0) {
    const mediaElements = block.elements.filter(el => ['video', 'audio', 'image', 'file'].includes(el.type))
    if (mediaElements.length > 0) {
      blockInfo += '\n   Медиа-элементы (НЕ ИЗМЕНЯТЬ): ' + mediaElements.map(el => `${el.type} (${el.content})`).join(', ')
    }
  }
  return blockInfo
}).join('\n')}

⚠️ ВАЖНО: Некоторые блоки содержат медиа-элементы (video, audio, image, file). Эти элементы НЕ НУЖНО адаптировать или изменять - они автоматически добавятся в content.elements во всех адаптациях.

ЗАДАЧА: ${studentType === 'original' ? 'Отформатировать и структурировать этот контент БЕЗ адаптации, создав ОБЯЗАТЕЛЬНО ВСЕ 5 БЛОКОВ с трехслойной структурой.' : `Адаптировать этот контент под тип восприятия "${normalizedType}", создав ОБЯЗАТЕЛЬНО ВСЕ 5 БЛОКОВ с трехслойной структурой.`}

КРИТИЧЕСКИ ВАЖНО: Ты ДОЛЖЕН вернуть ВСЕ 5 блоков (block1, block2, block3, block4, block5). Даже если исходный урок содержит только один блок, ты должен создать 5 блоков адаптации, распределив контент по блокам логически. Если ответ обрезается из-за лимита токенов, сократи длину текста внутри блоков, но обязательно верни структуру всех 5 блоков.

═══════════════════════════════════════════════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО: ПРИНЦИП ДУБЛИРОВАНИЯ С УСИЛЕНИЕМ
═══════════════════════════════════════════════════════════════════════════════

Система НЕ удаляет текст автора. Адаптация = структурирование + добавление специализированных элементов.

ПРИНЦИП РАБОТЫ:
1. Подводка (intro) - короткое вступление (2-3 предложения), которое объясняет, что сейчас произойдёт и зачем это нужно
2. Улучшенная текстовая версия (content) - ПОЛНЫЙ контент автора, структурированный для читабельности:
   - Все ключевые понятия из исходного контента
   - Все важные факты и детали
   - Все примеры и пояснения
   - Разбивка на логические абзацы с заголовками
   - Выделение ключевых терминов
3. Адаптированный элемент (adaptation) - специализированный формат, который ДУБЛИРУЕТ и УСИЛИВАЕТ содержание текста:
   - НЕ заменяет текст
   - Дополняет текст визуализацией/озвучкой/симуляцией
   - Создаёт дополнительные точки входа в материал
   - Помогает увидеть/услышать/прощупать структуру материала

ПРАВИЛА:
- Текстовая версия должна содержать ВЕСЬ контент автора из исходных блоков урока
- Адаптированный элемент должен отражать те же концепции, что и текст
- Адаптация должна быть конкретной и детальной, не абстрактной
- Все ключевые термины из исходного контента должны присутствовать в тексте
- Структура должна логически вытекать из исходного контента

═══════════════════════════════════════════════════════════════════════════════
ВАЖНО: ПРАКТИЧЕСКИЕ ЗАДАНИЯ И ТЕСТЫ
═══════════════════════════════════════════════════════════════════════════════

ПРАКТИЧЕСКИЕ ЗАДАНИЯ:
- Практические задания внутри урока (Блок 3) МОГУТ адаптироваться под типы восприятия
- Практические задания могут быть визуальными, аудиальными или кинестетическими
- Содержание практических заданий может изменяться в зависимости от типа восприятия
- Формат выполнения задания адаптируется под тип восприятия (drag-drop, аудио-диалог, симуляция)

ИТОГОВЫЕ ТЕСТЫ:
- Итоговые тесты с вопросами и ответами НЕ адаптируются под типы восприятия
- Итоговые тесты остаются ОДИНАКОВЫМИ для всех типов студентов
- Содержание теста (вопросы, варианты ответов, правильные ответы) НЕ изменяется
- Если в исходном контенте есть итоговый тест, включи его в текст БЛОКА 5 как есть
- Тест может быть описан в тексте, но его структура и содержание остаются неизменными

АДАПТАЦИЯ ПОДАЧИ ТЕСТОВ:
- Только подача теста может адаптироваться (например, озвучка текста для аудиалов)
- Содержание теста (вопросы, ответы, правильные ответы) НЕ изменяется
- Для аудиалов можно добавить озвучку текста теста, но вопросы и ответы остаются теми же
- Для визуалов можно улучшить форматирование, но содержание не изменяется
- Для кинестетиков можно улучшить интерактивность, но содержание не изменяется

═══════════════════════════════════════════════════════════════════════════════
СТРУКТУРА КАЖДОГО БЛОКА (ОБЯЗАТЕЛЬНО):
═══════════════════════════════════════════════════════════════════════════════

1. intro (Подводка):
   - Тип: объект с полем "text" (строка, 2-3 предложения)
   - Назначение: объяснить, что будет происходить в блоке
   - Стиль: мотивирующий, понятный, конкретный

2. content (Улучшенная текстовая версия):
   - Тип: объект с полями "title", "text", "sections", "type"
   - title: заголовок блока (строка)
   - text: полный текст контента автора, структурированный (строка, минимум 200 символов)
   - sections: массив секций с подзаголовками и выделенными терминами
   - type: всегда "text"
   - Назначение: представить ВЕСЬ контент автора в структурированном виде

3. adaptation (Адаптированный элемент):
   - Тип: объект с полями "type", "element"
   - type: тип адаптации ("visual", "auditory", "kinesthetic")
   - element: объект с полями "type", "data", "description"
   - Назначение: визуализировать/озвучить/симулировать содержание текста
`

  switch (studentType === 'original' ? 'original' : normalizedType) {
    case 'original':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
ВАЖНЫЕ ПРАВИЛА ДЛЯ ОРИГИНАЛЬНОЙ ВЕРСИИ
═══════════════════════════════════════════════════════════════════════════════

ВАЖНО: Твоя задача - НЕ изменять контент автора, а только:
1. Отформатировать его в структуру из 5 блоков
2. Улучшить читабельность (разбить на абзацы, добавить заголовки)
3. Сохранить ВСЕ исходные факты, примеры, термины БЕЗ ИЗМЕНЕНИЙ
4. НЕ добавлять новый контент, НЕ изменять смысл
5. НЕ адаптировать под типы восприятия - это оригинальная версия

РАСПРЕДЕЛЕНИЕ КОНТЕНТА ПО БЛОКАМ:
- БЛОК 1: Обзор темы (введение, основные тезисы)
- БЛОК 2: Основы темы (основной теоретический материал)
- БЛОК 3: Практическое закрепление (задания, примеры из исходного контента)
- БЛОК 4: Углублённое изучение (дополнительные детали, если есть)
- БЛОК 5: Итоговое задание (тесты, финальные задания из исходного контента)

КРИТИЧЕСКИ ВАЖНО:
1. НЕ изменяй факты, термины, примеры из исходного контента
2. НЕ добавляй новый контент, которого нет в исходном уроке
3. НЕ адаптируй под типы восприятия - это оригинальная версия
4. Только форматируй и структурируй существующий контент
5. Сохраняй все тесты и задания БЕЗ ИЗМЕНЕНИЙ
6. Если исходный урок содержит только один блок, распредели его содержание по всем 5 блокам логически

═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ВЫВОДА (ОБЯЗАТЕЛЬНО):
═══════════════════════════════════════════════════════════════════════════════

Верни результат в формате JSON со следующей структурой:

{
  "block1": {
    "intro": {
      "text": "Подводка из 2-3 предложений, описывающая содержание блока",
      "type": "intro"
    },
    "content": {
      "title": "Заголовок блока",
      "text": "Оригинальный текст автора, отформатированный для читабельности. ВСЕ факты и термины сохранены БЕЗ ИЗМЕНЕНИЙ.",
      "sections": [
        {
          "title": "Подзаголовок секции",
          "content": "Содержание секции из исходного контента",
          "highlighted": ["ключевые", "термины", "из", "исходного", "контента"]
        }
      ],
      "type": "text"
    },
    "adaptation": {
      "type": "original",
      "element": {
        "type": "text",
        "data": {
          "text": "Оригинальный контент автора без изменений"
        },
        "description": "Оригинальная версия контента автора"
      }
    }
  },
  "block2": { /* аналогичная структура */ },
  "block3": { /* аналогичная структура */ },
  "block4": { /* аналогичная структура */ },
  "block5": { /* аналогичная структура */ }
}

Верни ТОЛЬКО JSON без дополнительных комментариев. Убедись, что JSON содержит все 5 блоков полностью.
`
    case 'visual':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
АДАПТАЦИЯ ДЛЯ ВИЗУАЛЬНОГО ТИПА ВОСПРИЯТИЯ
═══════════════════════════════════════════════════════════════════════════════

Визуалы обрабатывают информацию через пространственные отношения, иерархии, паттерны.
Им нужно видеть структуру целиком, понимать связи между элементами, иметь возможность "окинуть взглядом" всю систему.

БЛОК 1 - ОБЗОР ТЕМЫ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о том, что будет изучено в уроке
- Упоминание о карте урока, которая показывает связи между частями
- Пример: "В этом уроке вы изучите [тема]. Ниже вы найдёте карту урока, которая показывает, как связаны все части материала. Сначала ознакомьтесь со схемой, затем прочитайте детальное описание."

Контент (content):
- Структурированный список того, что будет изучено:
  - "Что вы узнаете:" - список ключевых вопросов
  - "Почему это важно:" - практическое значение темы
  - "Структура урока:" - краткое описание пяти блоков
- ВСЕ ключевые понятия из исходного контента должны быть упомянуты
- Разбивка на короткие абзацы с визуальными разделителями
- Выделение ключевых терминов

Адаптация (adaptation):
- Тип элемента: "diagram" (концептуальная карта урока)
- Структура данных (ОБЯЗАТЕЛЬНО):
  - nodes: массив узлов (ОБЯЗАТЕЛЬНО непустой массив, минимум 6 элементов: 1 центральный + 5 для блоков)
    Каждый узел: {id: "уникальный_id", label: "Название узла", position: {x: число, y: число}, color: "#hex" (опционально)}
  - connections: массив связей (ОБЯЗАТЕЛЬНО непустой массив)
    Каждая связь: {from: "id_узла_источника", to: "id_узла_назначения", label: "текст_связи" (опционально)}
  - центральный узел содержит название темы
  - от него расходятся пять ветвей (блоки урока)
  - каждая ветвь содержит ключевые понятия этого блока
  - цветовое кодирование показывает уровень сложности
- КРИТИЧЕСКИ ВАЖНО:
  * nodes ДОЛЖЕН быть непустым массивом с минимум 6 элементами
  * Каждый узел ДОЛЖЕН иметь id (строка), label (строка), position (объект с x и y - числа)
  * connections ДОЛЖЕН быть непустым массивом
  * Все from и to в connections ДОЛЖНЫ ссылаться на существующие id из nodes
  * Центральный узел ДОЛЖЕН быть связан со всеми остальными узлами
- Пример правильной структуры:
  {
    "nodes": [
      {"id": "center", "label": "Тема урока", "position": {"x": 400, "y": 300}},
      {"id": "block1", "label": "Обзор", "position": {"x": 200, "y": 100}},
      {"id": "block2", "label": "Основы", "position": {"x": 600, "y": 100}},
      {"id": "block3", "label": "Практика", "position": {"x": 200, "y": 500}},
      {"id": "block4", "label": "Углубление", "position": {"x": 600, "y": 500}},
      {"id": "block5", "label": "Итог", "position": {"x": 400, "y": 600}}
    ],
    "connections": [
      {"from": "center", "to": "block1"},
      {"from": "center", "to": "block2"},
      {"from": "center", "to": "block3"},
      {"from": "center", "to": "block4"},
      {"from": "center", "to": "block5"}
    ]
  }
- Описание: "Интерактивная концептуальная карта урока с центральным узлом '[тема]' и пятью ветвями, представляющими блоки урока."

БЛОК 2 - ОСНОВЫ ТЕМЫ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о ключевых концепциях
- Упоминание о таблице сравнения или схеме понятий
- Пример: "Теперь разберём ключевые концепции темы. Ниже вы увидите таблицу сравнения основных понятий, а затем их подробное объяснение с примерами."

Контент (content):
- Теория структурированная так:
  - "Ключевое понятие 1" (жирным шрифтом)
    - Определение (выделено цветом)
    - Объяснение простыми словами
    - Пример из жизни
  - "Ключевое понятие 2" (аналогично)
  - "Связь между понятиями" - объяснение, как концепции взаимодействуют
- ВСЕ основные понятия из исходного контента должны быть раскрыты
- Каждое понятие занимает отдельный визуальный блок

Адаптация (adaptation):
- Тип элемента: "table" (сравнительная таблица) или "diagram" (иерархическая схема)
- Если понятия связаны по принципу сравнения:
  - Структура данных для таблицы (ОБЯЗАТЕЛЬНО):
    - columns: массив названий колонок (ОБЯЗАТЕЛЬНО непустой массив, минимум 2 колонки)
      Пример: ["Понятие", "Определение", "Ключевые признаки", "Пример"]
    - rows: массив объектов с данными (ОБЯЗАТЕЛЬНО непустой массив, минимум 2 строки)
      Каждая строка: объект с ключами, соответствующими названиям колонок
  - КРИТИЧЕСКИ ВАЖНО:
    * columns ДОЛЖЕН быть непустым массивом строк
    * rows ДОЛЖЕН быть непустым массивом объектов
    * Каждая строка ДОЛЖНА содержать поля для всех колонок
  - Пример правильной структуры:
    {
      "columns": ["Понятие", "Определение", "Пример"],
      "rows": [
        {"Понятие": "Фотосинтез", "Определение": "Процесс образования органических веществ", "Пример": "Листья растений"},
        {"Понятие": "Дыхание", "Определение": "Процесс окисления органических веществ", "Пример": "Все живые организмы"}
      ]
    }
  - Описание: "Сравнительная таблица основных понятий с колонками 'Понятие', 'Определение', 'Ключевые признаки', 'Пример'."
- Если понятия связаны иерархически:
  - Структура данных для диаграммы (ОБЯЗАТЕЛЬНО):
    - nodes: массив узлов (ОБЯЗАТЕЛЬНО непустой массив, минимум 2 узла)
      Каждый узел: {id: "уникальный_id", label: "Название понятия", position: {x: число, y: число}}
    - connections: массив связей (ОБЯЗАТЕЛЬНО непустой массив)
      Каждая связь: {from: "id_родителя", to: "id_потомка"}
  - КРИТИЧЕСКИ ВАЖНО:
    * nodes ДОЛЖЕН быть непустым массивом с минимум 2 элементами
    * connections ДОЛЖЕН быть непустым массивом
    * Все from и to в connections ДОЛЖНЫ ссылаться на существующие id из nodes
  - Описание: "Иерархическая схема понятий с родительским понятием '[понятие]' и дочерними понятиями '[понятие1]', '[понятие2]'."

БЛОК 3 - ПРАКТИЧЕСКОЕ ЗАКРЕПЛЕНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о проверке понимания
- Упоминание о визуальном задании
- Пример: "Проверьте, как вы поняли основы. Ниже вы найдёте задание на соотнесение понятий, а затем объяснение правильных ответов."

Контент (content):
- Формулировка задания с чёткими критериями
- Инструкция к выполнению
- После описания задания - детальное объяснение каждого правильного ответа с отсылками к Блоку 2
- ВСЕ ключевые понятия из Блока 2 должны использоваться в задании

Адаптация (adaptation):
- Тип элемента: "interactive" (интерактивное задание)
- Варианты заданий:
  - Вариант А: Drag-and-drop соотнесение
    - Структура данных (ОБЯЗАТЕЛЬНО):
      - type: "drag-drop" (строго "drag-drop", не "drag-and-drop")
      - leftItems: массив карточек с понятиями (ОБЯЗАТЕЛЬНО непустой массив, минимум 3 элемента)
        Каждый элемент: {id: "уникальный_id_1", text: "Текст понятия"}
      - rightItems: массив карточек с определениями (ОБЯЗАТЕЛЬНО непустой массив, минимум 3 элемента)
        Каждый элемент: {id: "уникальный_id_2", text: "Текст определения"}
      - correctPairs: массив пар для проверки (ОБЯЗАТЕЛЬНО непустой массив)
        Каждая пара: {leftId: "id_из_leftItems", rightId: "id_из_rightItems"}
    - КРИТИЧЕСКИ ВАЖНО:
      * leftItems и rightItems ДОЛЖНЫ быть непустыми массивами
      * Количество элементов в leftItems и rightItems ДОЛЖНО совпадать
      * Каждый элемент ДОЛЖЕН иметь уникальный id (строка) и text (строка)
      * correctPairs ДОЛЖЕН содержать пары для ВСЕХ элементов из leftItems
      * Все leftId в correctPairs ДОЛЖНЫ существовать в leftItems
      * Все rightId в correctPairs ДОЛЖНЫ существовать в rightItems
    - Пример правильной структуры:
      {
        "type": "drag-drop",
        "leftItems": [
          {"id": "concept1", "text": "Фотосинтез"},
          {"id": "concept2", "text": "Дыхание"},
          {"id": "concept3", "text": "Транспирация"}
        ],
        "rightItems": [
          {"id": "def1", "text": "Процесс образования органических веществ из неорганических"},
          {"id": "def2", "text": "Процесс окисления органических веществ для получения энергии"},
          {"id": "def3", "text": "Испарение воды листьями растений"}
        ],
        "correctPairs": [
          {"leftId": "concept1", "rightId": "def1"},
          {"leftId": "concept2", "rightId": "def2"},
          {"leftId": "concept3", "rightId": "def3"}
        ]
      }
    - Описание: "Интерактивное задание на соотнесение понятий и определений через перетаскивание."
  - Вариант Б: Маркировка схемы
    - Структура данных (ОБЯЗАТЕЛЬНО):
      - type: "diagram-labeling"
      - diagram: объект со схемой (ОБЯЗАТЕЛЬНО)
        - nodes: массив узлов (ОБЯЗАТЕЛЬНО непустой массив)
          Каждый узел: {id: "уникальный_id", label: "", position: {x: число, y: число}}
        - connections: массив связей (опционально)
      - labels: массив карточек с названиями (ОБЯЗАТЕЛЬНО непустой массив)
        Каждая карточка: {id: "уникальный_id", text: "Название"}
      - correctPositions: массив позиций (ОБЯЗАТЕЛЬНО непустой массив)
        Каждая позиция: {labelId: "id_из_labels", nodeId: "id_из_diagram.nodes"}
    - КРИТИЧЕСКИ ВАЖНО:
      * diagram.nodes ДОЛЖЕН быть непустым массивом
      * labels ДОЛЖЕН быть непустым массивом
      * correctPositions ДОЛЖЕН содержать пары для ВСЕХ labels
      * Все labelId в correctPositions ДОЛЖНЫ существовать в labels
      * Все nodeId в correctPositions ДОЛЖНЫ существовать в diagram.nodes
    - Описание: "Интерактивное задание на маркировку схемы путём размещения названий в правильных местах."
  - Вариант В: Визуальная классификация
    - Структура данных (ОБЯЗАТЕЛЬНО):
      - type: "classification"
      - items: массив элементов для классификации (ОБЯЗАТЕЛЬНО непустой массив, минимум 3 элемента)
        Каждый элемент: {id: "уникальный_id", text: "Название", image: "url" (опционально)}
      - categories: массив категорий (ОБЯЗАТЕЛЬНО непустой массив, минимум 2 категории)
        Каждая категория: {id: "уникальный_id", name: "Название категории", color: "#hex"}
      - correctClassification: массив классификаций (ОБЯЗАТЕЛЬНО непустой массив)
        Каждая классификация: {itemId: "id_из_items", categoryId: "id_из_categories"}
    - КРИТИЧЕСКИ ВАЖНО:
      * items ДОЛЖЕН быть непустым массивом с минимум 3 элементами
      * categories ДОЛЖЕН быть непустым массивом с минимум 2 категориями
      * correctClassification ДОЛЖЕН содержать классификации для ВСЕХ items
      * Все itemId в correctClassification ДОЛЖНЫ существовать в items
      * Все categoryId в correctClassification ДОЛЖНЫ существовать в categories
    - Описание: "Интерактивное задание на классификацию элементов по категориям."

БЛОК 4 - УГЛУБЛЁННОЕ ИЗУЧЕНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения об углублении в тему
- Упоминание о многослойной инфографике или интерактивной схеме
- Пример: "Теперь углубимся в тему. Ниже вы найдёте многослойную инфографику, которая показывает, как изученные концепции работают в сложной системе. После изучения схемы прочитайте кейс, который демонстрирует эти принципы в действии."

Контент (content):
- Расширение теории: детали, которые не вошли в Блок 2
- Кейс или пример: реальная ситуация, где применяются изученные концепции
- Анализ кейса: пошаговое объяснение, как теория работает в примере
- Связь с практикой: где это можно применить
- ВСЕ сложные аспекты из исходного контента должны быть раскрыты
- Текст разбит на микроразделы с пронумерованными шагами анализа

Адаптация (adaptation):
- Тип элемента: "diagram" (многослойная инфографика) или "interactive" (интерактивная схема)
- Структура данных для многослойной схемы (ОБЯЗАТЕЛЬНО):
  - layers: массив слоёв (ОБЯЗАТЕЛЬНО непустой массив, минимум 2 слоя)
    Каждый слой: {
      id: "уникальный_id_слоя",
      name: "Название слоя",
      nodes: массив узлов (ОБЯЗАТЕЛЬНО непустой массив, минимум 2 узла)
        Каждый узел: {id: "уникальный_id", label: "Название", position: {x: число, y: число}},
      connections: массив связей (опционально)
        Каждая связь: {from: "id_узла", to: "id_узла"}
    }
  - interactions: массив взаимодействий (опционально)
    Каждое взаимодействие: {layerId: "id_слоя", nodeId: "id_узла", action: "click", reveals: "id_другого_слоя"}
  - colorCoding: объект с цветовым кодированием (опционально)
    {basic: "#hex", new: "#hex", connections: "#hex"}
- КРИТИЧЕСКИ ВАЖНО:
  * layers ДОЛЖЕН быть непустым массивом с минимум 2 слоями
  * Каждый слой ДОЛЖЕН иметь id (строка), name (строка), nodes (непустой массив)
  * Каждый узел в nodes ДОЛЖЕН иметь id (строка), label (строка), position (объект с x и y)
  * Если есть connections, все from и to ДОЛЖНЫ ссылаться на существующие id узлов в том же слое
- Пример правильной структуры:
  {
    "layers": [
      {
        "id": "outer",
        "name": "Внешний слой",
        "nodes": [
          {"id": "node1", "label": "Элемент 1", "position": {"x": 100, "y": 100}},
          {"id": "node2", "label": "Элемент 2", "position": {"x": 300, "y": 100}}
        ],
        "connections": [{"from": "node1", "to": "node2"}]
      },
      {
        "id": "inner",
        "name": "Внутренний слой",
        "nodes": [
          {"id": "node3", "label": "Деталь 1", "position": {"x": 100, "y": 200}},
          {"id": "node4", "label": "Деталь 2", "position": {"x": 300, "y": 200}}
        ]
      }
    ],
    "interactions": [
      {"layerId": "outer", "nodeId": "node1", "action": "click", "reveals": "inner"}
    ],
    "colorCoding": {"basic": "#3B82F6", "new": "#10B981", "connections": "#6B7280"}
  }
- Описание: "Многослойная инфографика с внешним слоем (общая система), средним слоем (детализация ключевых узлов) и внутренним слоем (механизмы работы). При клике на элемент раскрываются подпроцессы."

БЛОК 5 - ИТОГОВОЕ ЗАДАНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о создании собственной схемы
- Упоминание о конструкторе схемы
- Пример: "Теперь проверьте, как вы усвоили материал. Создайте собственную схему, которая показывает вашу интерпретацию темы. После выполнения прочитайте эталонную схему и сравните подходы."

Контент (content):
- Формулировка итогового ЗАДАНИЯ (НЕ теста)
- Критерии оценки результата
- Примеры хороших и плохих выполнений
- Рефлексивные вопросы: "Что было сложно?", "Как вы будете применять это знание?"
- ВСЕ ключевые концепции из урока должны использоваться в задании
- ВАЖНО: Это ЗАДАНИЕ на создание артефакта, а НЕ тест с вопросами и ответами

Адаптация (adaptation):
- Тип элемента: "interactive" (конструктор схемы)
- Структура данных (ОБЯЗАТЕЛЬНО):
  - type: "diagram-builder"
  - elements: массив доступных элементов (ОБЯЗАТЕЛЬНО непустой массив, минимум 3 элемента)
    Каждый элемент: {id: "уникальный_id", type: "node" | "connection", label: "Название", icon: "url" (опционально)}
  - concepts: массив понятий из урока (ОБЯЗАТЕЛЬНО непустой массив, минимум 3 понятия)
    Каждое понятие: {id: "уникальный_id", text: "Текст понятия"}
  - template: шаблон схемы (опционально)
    - nodes: массив узлов (если указан, должен быть массивом)
    - connections: массив связей (если указан, должен быть массивом)
  - validation: правила валидации (опционально)
    {requiredConcepts: массив_id_понятий, minNodes: число, minConnections: число}
- КРИТИЧЕСКИ ВАЖНО:
  * elements ДОЛЖЕН быть непустым массивом с минимум 3 элементами
  * concepts ДОЛЖЕН быть непустым массивом с минимум 3 понятиями
  * Каждый элемент в elements ДОЛЖЕН иметь id (строка), type ("node" или "connection"), label (строка)
  * Каждое понятие в concepts ДОЛЖНО иметь id (строка), text (строка)
  * Если указан template, nodes и connections ДОЛЖНЫ быть массивами
- Пример правильной структуры:
  {
    "type": "diagram-builder",
    "elements": [
      {"id": "rect", "type": "node", "label": "Прямоугольник"},
      {"id": "circle", "type": "node", "label": "Круг"},
      {"id": "arrow", "type": "connection", "label": "Стрелка"}
    ],
    "concepts": [
      {"id": "concept1", "text": "Понятие 1"},
      {"id": "concept2", "text": "Понятие 2"},
      {"id": "concept3", "text": "Понятие 3"}
    ],
    "template": {
      "nodes": [],
      "connections": []
    },
    "validation": {
      "requiredConcepts": ["concept1", "concept2"],
      "minNodes": 2,
      "minConnections": 1
    }
  }
- Описание: "Конструктор схемы с базовыми элементами (прямоугольники, круги, стрелки) и карточками с понятиями из урока. Задача: построить схему, которая отражает связи между понятиями."

ВАЖНО О ТЕСТАХ:
- Итоговые тесты с вопросами и ответами НЕ адаптируются под типы восприятия
- Итоговые тесты остаются одинаковыми для всех типов студентов
- Если в исходном контенте есть итоговый тест, он должен быть включен в контент БЛОКА 5 как текст, но НЕ как интерактивный элемент
- Тест может быть описан в тексте, но его содержание не изменяется в зависимости от типа восприятия

═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ВЫВОДА (ОБЯЗАТЕЛЬНО):
═══════════════════════════════════════════════════════════════════════════════

Верни результат в формате JSON со следующей структурой:

{
  "block1": {
    "intro": {
      "text": "Подводка из 2-3 предложений, объясняющая что будет происходить в блоке",
      "type": "intro"
    },
    "content": {
      "title": "Заголовок блока",
      "text": "ПОЛНЫЙ текст контента автора из исходного урока, структурированный для читабельности. Минимум 200 символов. ВСЕ ключевые понятия должны быть включены.",
      "sections": [
        {
          "title": "Подзаголовок секции",
          "content": "Содержание секции с детальным объяснением",
          "highlighted": ["ключевые", "термины", "для", "выделения"]
        }
      ],
      "type": "text"
    },
    "adaptation": {
      "type": "visual",
      "element": {
        "type": "diagram",
        "data": {
          "nodes": [
            {
              "id": "node1",
              "label": "Название узла",
              "position": {"x": 100, "y": 100},
              "color": "#3B82F6"
            }
          ],
          "connections": [
            {
              "from": "node1",
              "to": "node2",
              "label": "Название связи",
              "type": "solid"
            }
          ]
        },
        "description": "Детальное описание схемы и её назначения"
      }
    }
  },
  "block2": { /* аналогичная структура */ },
  "block3": { /* аналогичная структура */ },
  "block4": { /* аналогичная структура */ },
  "block5": { /* аналогичная структура */ }
}

КРИТИЧЕСКИ ВАЖНО:
1. Ты ДОЛЖЕН вернуть ВСЕ 5 блоков: block1, block2, block3, block4, block5. Отсутствие хотя бы одного блока приведет к ошибке.
2. Каждый блок ДОЛЖЕН содержать все три слоя: intro, content, adaptation
3. Поле content.text ДОЛЖНО содержать ВЕСЬ контент автора из исходного урока
4. Поле adaptation.element.data ДОЛЖНО быть конкретным и детальным, не абстрактным
5. Все ключевые термины из исходного контента ДОЛЖНЫ присутствовать в content.text
6. Адаптированный элемент ДОЛЖЕН отражать те же концепции, что и текст
7. Используй конкретные данные, основанные на исходном контенте урока
8. Если исходный урок содержит только один блок, распредели его содержание по всем 5 блокам адаптации логически

Верни ТОЛЬКО JSON без дополнительных комментариев. Убедись, что JSON содержит все 5 блоков полностью.
`

    case 'auditory':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
АДАПТАЦИЯ ДЛЯ АУДИАЛЬНОГО ТИПА ВОСПРИЯТИЯ
═══════════════════════════════════════════════════════════════════════════════

Аудиалы обрабатывают информацию через последовательное слушание, ритм речи, интонационные акценты, нарративные структуры.
Им нужно слышать логику рассуждения, внутренний монолог эксперта, истории и примеры в живой речи.

БЛОК 1 - ОБЗОР ТЕМЫ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения об аудио-анонсе урока
- Упоминание о том, что можно услышать, о чём будет говориться
- Пример: "Включите аудио-анонс урока, чтобы услышать, о чём мы будем говорить. После прослушивания вы сможете прочитать текстовую версию обзора."

Контент (content):
- Текст структурирован как транскрипт живой речи эксперта:
  - Вступление от первого лица: "Привет! Сегодня мы с тобой разберём [тема]. Я расскажу тебе..."
  - Риторические вопросы: "Почему это важно? Сейчас объясню"
  - Разговорные маркеры: "Во-первых... Во-вторых... И самое интересное..."
  - Анонс структуры: "Сначала мы разберём основы, затем попробуем на практике, а в конце ты создашь..."
- ВСЕ ключевые понятия из исходного контента должны быть упомянуты
- Текст читается как сценарий подкаста, а не как академическая статья
- Использование местоимений "ты", "мы" для создания эффекта присутствия

Адаптация (adaptation):
- Тип элемента: "audio" (аудио-анонс урока)
- Структура данных:
  - text: текст для озвучивания (3-5 минут чтения)
  - duration: примерная длительность в секундах (180-300)
  - format: "mp3" или "wav"
  - script: детальный сценарий с указанием интонаций, пауз, акцентов
  - markers: массив маркеров ключевых моментов {timestamp: number, text: string}
- Описание: "Аудио-анонс урока длительностью 3-5 минут с эмоциональными интонациями, паузами для осмысления и маркерами ключевых моментов."

БЛОК 2 - ОСНОВЫ ТЕМЫ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения об истории, которая объясняет концепции
- Упоминание о том, что можно услышать объяснение
- Пример: "Сейчас вы услышите историю, которая объясняет ключевые концепции темы. После прослушивания прочитайте текст, чтобы закрепить детали."

Контент (content):
- Теория структурированная как нарративное объяснение:
  - Вступление: "Представь себе ситуацию..."
  - История/метафора: концепции объясняются через сюжет
  - Ключевые понятия: выделены жирным и объяснены простыми словами
  - Связь с реальностью: "Это как когда ты..."
  - Резюме: краткое повторение ключевых мыслей
- ВСЕ основные понятия из исходного контента должны быть раскрыты через истории
- Текст написан так, чтобы его можно было произнести вслух естественным образом

Адаптация (adaptation):
- Тип элемента: "audio" (объяснение в аудиоформате) или "story" (история с персонажем)
- Вариант А: Экспертное объяснение
  - Структура данных (ОБЯЗАТЕЛЬНО):
    - text: текст для озвучивания (ОБЯЗАТЕЛЬНО непустая строка, минимум 500 символов, 5-10 минут чтения)
    - duration: примерная длительность в секундах (ОБЯЗАТЕЛЬНО число, 300-600)
    - format: формат файла (ОБЯЗАТЕЛЬНО "mp3" или "wav", строго один из этих вариантов)
    - script: детальный сценарий с метафорами и аналогиями (ОБЯЗАТЕЛЬНО непустая строка)
    - keyTerms: массив ключевых терминов с акцентом (ОБЯЗАТЕЛЬНО непустой массив)
      Каждый термин: {term: строка, explanation: строка, timestamp: число}
  - КРИТИЧЕСКИ ВАЖНО:
    * text ДОЛЖЕН быть непустой строкой минимум 500 символов
    * duration ДОЛЖНО быть числом от 300 до 600
    * format ДОЛЖЕН быть строго "mp3" или "wav"
    * script ДОЛЖЕН быть непустой строкой
    * keyTerms ДОЛЖЕН быть непустым массивом
  - Описание: "Экспертное объяснение теории в аудиоформате с использованием метафор и аналогий, ключевые термины произносятся с акцентом."
- Вариант Б: История с персонажем
  - Структура данных (ОБЯЗАТЕЛЬНО):
    - text: текст истории для озвучивания (ОБЯЗАТЕЛЬНО непустая строка, минимум 500 символов, 5-10 минут чтения)
    - duration: примерная длительность в секундах (ОБЯЗАТЕЛЬНО число, 300-600)
    - format: формат файла (ОБЯЗАТЕЛЬНО "mp3" или "wav", строго один из этих вариантов)
    - characters: массив персонажей (ОБЯЗАТЕЛЬНО непустой массив, минимум 1 персонаж)
      Каждый персонаж: {name: строка, role: строка}
    - plot: структура сюжета с ключевыми событиями (ОБЯЗАТЕЛЬНО объект)
    - concepts: массив концепций, которые раскрываются через историю (ОБЯЗАТЕЛЬНО непустой массив)
      Каждая концепция: {concept: строка, event: строка}
  - КРИТИЧЕСКИ ВАЖНО:
    * text ДОЛЖЕН быть непустой строкой минимум 500 символов
    * duration ДОЛЖНО быть числом от 300 до 600
    * format ДОЛЖЕН быть строго "mp3" или "wav"
    * characters ДОЛЖЕН быть непустым массивом с минимум 1 персонажем
    * plot ДОЛЖЕН быть объектом (не пустым)
    * concepts ДОЛЖЕН быть непустым массивом
  - Описание: "История с персонажем, который сталкивается с проблемой, решаемой через изучаемые концепции. Концепции вводятся как 'открытия' персонажа."

БЛОК 3 - ПРАКТИЧЕСКОЕ ЗАКРЕПЛЕНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения об аудио-диалоге
- Упоминание о вопросах с паузами для ответа
- Пример: "Проверьте понимание через аудио-диалог. Вы услышите вопросы с паузами для ответа, затем сможете прочитать объяснения."

Контент (content):
- Текстовая версия вопросов с вариантами ответа
- Детальное объяснение каждого правильного ответа
- Почему неправильные ответы не подходят
- ВСЕ ключевые понятия из Блока 2 должны использоваться в вопросах

Адаптация (adaptation):
- Тип элемента: "interactive" (интерактивный аудио-диалог)
- Структура данных (ОБЯЗАТЕЛЬНО):
  - type: "audio-dialog"
  - questions: массив вопросов (ОБЯЗАТЕЛЬНО непустой массив, минимум 3 вопроса)
    Каждый вопрос: {
      id: строка (уникальный),
      text: строка (непустая, текст вопроса),
      pauseDuration: число (10-15 секунд),
      hint: строка (опционально),
      answer: объект (ОБЯЗАТЕЛЬНО)
        {
          text: строка (непустая, текст ответа),
          explanation: строка (непустая, объяснение),
          timestamp: число (временная метка в секундах)
        }
    }
  - format: формат файла (ОБЯЗАТЕЛЬНО "mp3" или "wav", строго один из этих вариантов)
  - totalDuration: общая длительность в секундах (ОБЯЗАТЕЛЬНО число, больше 0)
- КРИТИЧЕСКИ ВАЖНО:
  * questions ДОЛЖЕН быть непустым массивом с минимум 3 вопросами
  * Каждый вопрос ДОЛЖЕН иметь id (строка), text (непустая строка), pauseDuration (число 10-15), answer (объект)
  * answer ДОЛЖЕН содержать text (непустая строка), explanation (непустая строка), timestamp (число)
  * format ДОЛЖЕН быть строго "mp3" или "wav"
  * totalDuration ДОЛЖНО быть положительным числом
- Пример правильной структуры:
  {
    "type": "audio-dialog",
    "questions": [
      {
        "id": "q1",
        "text": "Что такое фотосинтез?",
        "pauseDuration": 12,
        "hint": "Подумайте о процессе в листьях растений",
        "answer": {
          "text": "Фотосинтез - это процесс образования органических веществ",
          "explanation": "Фотосинтез происходит в хлоропластах растений",
          "timestamp": 45
        }
      },
      {
        "id": "q2",
        "text": "Где происходит фотосинтез?",
        "pauseDuration": 10,
        "answer": {
          "text": "В хлоропластах листьев",
          "explanation": "Хлоропласты содержат хлорофилл, необходимый для фотосинтеза",
          "timestamp": 120
        }
      }
    ],
    "format": "mp3",
    "totalDuration": 300
  }
- Описание: "Интерактивный аудио-диалог с вопросами, паузами для мысленного ответа и объяснениями правильных ответов."

БЛОК 4 - УГЛУБЛЁННОЕ ИЗУЧЕНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о реальном кейсе
- Упоминание о том, что можно послушать разбор кейса
- Пример: "Теперь послушайте реальный кейс, в котором эксперт разбирает сложную ситуацию. После прослушивания вы сможете прочитать анализ кейса."

Контент (content):
- Кейс структурированный как развёрнутый рассказ:
  - Описание ситуации: контекст, действующие лица, проблема
  - Пошаговый анализ: как применялись изученные концепции
  - Ключевые решения: почему были выбраны определённые действия
  - Результаты: что получилось
  - Выводы: какие принципы можно извлечь
- ВСЕ сложные аспекты из исходного контента должны быть раскрыты через кейс
- Текст написан как развёрнутый рассказ, а не сухой разбор

Адаптация (adaptation):
- Тип элемента: "audio" (аудио-кейс в формате мини-подкаста)
- Структура данных:
  - text: текст для озвучивания (10-15 минут чтения)
  - duration: примерная длительность в секундах (600-900)
  - format: "mp3" или "wav"
  - type: "interview" (интервью с экспертом) или "narrative" (нарративный разбор)
  - script: детальный сценарий с диалогами или повествованием
  - markers: массив маркеров, где применяются концепции {timestamp: number, concept: string, explanation: string}
- Описание: "Аудио-кейс в формате мини-подкаста (10-15 минут) с разбором реальной ситуации, где применяются изученные концепции. Маркеры показывают, где используется каждая концепция."

БЛОК 5 - ИТОГОВОЕ ЗАДАНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о создании аудио-пересказа
- Упоминание о том, что можно создать свой пересказ или прослушать эталонный
- Пример: "Теперь ваша очередь. Создайте аудио-пересказ темы своими словами или прослушайте итоговый подкаст с ключевыми выводами."

Контент (content):
- Инструкция к заданию (НЕ тесту)
- Критерии хорошего пересказа
- Шаблон структуры (если нужна помощь)
- Рефлексивные вопросы в текстовом виде
- ВСЕ ключевые концепции из урока должны использоваться в задании
- ВАЖНО: Это ЗАДАНИЕ на создание аудио-артефакта, а НЕ тест с вопросами и ответами
- Если в исходном контенте есть итоговый тест, он должен быть включен в текст, но его содержание не изменяется

Адаптация (adaptation):
- Тип элемента: "interactive" (задание на создание аудио-пересказа) или "audio" (итоговый подкаст)
- Вариант А: Свободный пересказ
  - Структура данных:
    - type: "audio-recording"
    - instructions: инструкция к заданию
    - template: шаблон структуры (опционально) {sections: [{title: string, duration: number}]}
    - criteria: критерии оценки {clarity: string, completeness: string, structure: string}
    - maxDuration: максимальная длительность в секундах (180-300)
  - Описание: "Задание на создание аудио-пересказа темы своими словами (3-5 минут) с возможностью использования текстовых заметок как опоры."
- Вариант Б: Итоговый мини-подкаст
  - Структура данных:
    - text: текст для озвучивания (7-10 минут чтения)
    - duration: примерная длительность в секундах (420-600)
    - format: "mp3" или "wav"
    - script: детальный сценарий с резюме изученного, инсайтами и советами
    - summary: краткое резюме ключевых моментов
  - Описание: "Итоговый мини-подкаст (7-10 минут) с резюме изученного, инсайтами эксперта и советами по применению."

ВАЖНО О ТЕСТАХ:
- Итоговые тесты с вопросами и ответами НЕ адаптируются под типы восприятия
- Итоговые тесты остаются одинаковыми для всех типов студентов
- Если в исходном контенте есть итоговый тест, он должен быть включен в контент БЛОКА 5 как текст, но НЕ как интерактивный элемент
- Тест может быть описан в тексте, но его содержание не изменяется в зависимости от типа восприятия

═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ВЫВОДА (ОБЯЗАТЕЛЬНО):
═══════════════════════════════════════════════════════════════════════════════

Верни результат в формате JSON со следующей структурой:

{
  "block1": {
    "intro": {
      "text": "Подводка из 2-3 предложений, объясняющая что будет происходить в блоке",
      "type": "intro"
    },
    "content": {
      "title": "Заголовок блока",
      "text": "ПОЛНЫЙ текст контента автора, структурированный как транскрипт живой речи эксперта. Минимум 200 символов. Используй местоимения 'ты', 'мы' для создания эффекта присутствия. ВСЕ ключевые понятия должны быть включены.",
      "sections": [
        {
          "title": "Подзаголовок секции",
          "content": "Содержание секции с нарративным объяснением",
          "highlighted": ["ключевые", "термины", "для", "выделения"]
        }
      ],
      "type": "text"
    },
    "adaptation": {
      "type": "auditory",
      "element": {
        "type": "audio",
        "data": {
          "text": "Детальный текст для озвучивания с указанием интонаций, пауз, акцентов",
          "duration": 300,
          "format": "mp3",
          "script": "Детальный сценарий с указанием эмоциональных интонаций, пауз для осмысления, изменений темпа речи",
          "markers": [
            {
              "timestamp": 30,
              "text": "Ключевой момент 1"
            }
          ]
        },
        "description": "Детальное описание аудио-контента и его назначения"
      }
    }
  },
  "block2": { /* аналогичная структура */ },
  "block3": { /* аналогичная структура */ },
  "block4": { /* аналогичная структура */ },
  "block5": { /* аналогичная структура */ }
}

КРИТИЧЕСКИ ВАЖНО:
1. Ты ДОЛЖЕН вернуть ВСЕ 5 блоков: block1, block2, block3, block4, block5. Отсутствие хотя бы одного блока приведет к ошибке.
2. Каждый блок ДОЛЖЕН содержать все три слоя: intro, content, adaptation
3. Поле content.text ДОЛЖНО содержать ВЕСЬ контент автора из исходного урока, но написанный как живая речь
4. Поле adaptation.element.data.text ДОЛЖНО содержать детальный текст для озвучивания
5. Все ключевые термины из исходного контента ДОЛЖНЫ присутствовать в content.text
6. Аудио-элемент ДОЛЖЕН отражать те же концепции, что и текст
7. Используй конкретные данные, основанные на исходном контенте урока
8. Для аудио-диалогов указывай конкретные вопросы, паузы и объяснения
9. Если исходный урок содержит только один блок, распредели его содержание по всем 5 блокам адаптации логически

Верни ТОЛЬКО JSON без дополнительных комментариев. Убедись, что JSON содержит все 5 блоков полностью.
`

    case 'kinesthetic':
      return basePrompt + `
═══════════════════════════════════════════════════════════════════════════════
АДАПТАЦИЯ ДЛЯ КИНЕСТЕТИЧЕСКОГО ТИПА ВОСПРИЯТИЯ
═══════════════════════════════════════════════════════════════════════════════

Кинестетики обрабатывают информацию через действие, манипуляцию объектами, создание артефактов, телесный опыт.
Им нужно не просто увидеть/услышать, а сделать руками, получить немедленную обратную связь, создать что-то работающее.

БЛОК 1 - ОБЗОР ТЕМЫ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о конкретном результате, который будет создан
- Упоминание о чек-листе задач
- Пример: "В этом уроке вы создадите [конкретный результат]. Ниже вы увидите, что именно вы сделаете и по каким критериям будет оцениваться результат."

Контент (content):
- Текст структурирован как техническое задание на проект:
  - "Ваша задача:" - чёткая формулировка конечного продукта
  - "Ожидаемый результат:" - конкретные критерии
  - "Что вы будете делать:" - список действий по блокам
  - "Зачем это нужно:" - практическое применение результата
- ВСЕ ключевые понятия из исходного контента должны быть упомянуты
- Текст отвечает на вопросы: что делать, как делать, зачем делать

Адаптация (adaptation):
- Тип элемента: "checklist" (интерактивный чек-лист результата)
- Структура данных:
  - items: массив задач [
      {
        id: string,
        text: string,
        completed: boolean (false),
        icon: string (опционально, тип действия: "assembly", "experiment", "analysis"),
        description: string (опционально, краткое описание задачи)
      }
    ]
  - progress: объект с информацией о прогрессе {total: number, completed: number}
  - finalResult: описание итогового результата
- Описание: "Интерактивный чек-лист результата с задачами урока, индикатором прогресса и описанием итогового продукта."

БЛОК 2 - ОСНОВЫ ТЕМЫ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о теории перед сборкой модели
- Упоминание о пошаговом упражнении
- Пример: "Прежде чем собрать модель, разберёмся с теорией. Ниже вы прочитаете, как устроен [объект], а затем соберёте его из частей."

Контент (content):
- Теория структурированная как инструкция с встроенными объяснениями:
  - "Что мы будем собирать:" - название и назначение объекта
  - "Из каких частей состоит:" - список компонентов с функциями
  - "Как части связаны:" - описание взаимодействия
  - "Важные детали:" - на что обратить внимание при сборке
- ВСЕ основные понятия из исходного контента должны быть раскрыты
- Текст написан в формате: "Сейчас возьмём часть X. Она отвечает за функцию Y. Разместим её так-то"

Адаптация (adaptation):
- Тип элемента: "interactive" (пошаговое упражнение "Собери сам")
- Структура данных:
  - type: "assembly"
  - workspace: рабочая область {width: number, height: number}
  - parts: массив частей [
      {
        id: string,
        label: string,
        type: string (тип части),
        position: {x: number, y: number} (начальная позиция),
        correctPosition: {x: number, y: number} (правильная позиция),
        function: string (функция части),
        hint: string (подсказка при размещении)
      }
    ]
  - steps: массив шагов [
      {
        stepNumber: number,
        instruction: string,
        partId: string,
        feedback: string (обратная связь после размещения)
      }
    ]
  - animation: объект с информацией об анимации (опционально) {enabled: boolean, onComplete: string}
- Описание: "Пошаговое упражнение 'Собери сам' с рабочей областью, частями для сборки и пошаговыми инструкциями. После размещения каждой части появляется обратная связь."

БЛОК 3 - ПРАКТИЧЕСКОЕ ЗАКРЕПЛЕНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о запуске процесса в модели
- Упоминание об интерактивной симуляции
- Пример: "Теперь запустите процесс в вашей модели. Ниже вы прочитаете, что должно произойти, а затем сами управляете реакцией."

Контент (content):
- Описание процесса световой фазы
- Что происходит на каждом этапе
- Как управлять симуляцией
- Что наблюдать
- ВСЕ ключевые понятия из Блока 2 должны использоваться в описании

Адаптация (adaptation):
- Тип элемента: "simulation" (интерактивная симуляция процесса)
- Структура данных:
  - type: "process-simulation"
  - model: модель объекта {components: [...], initialState: {...}}
  - controls: массив управляющих элементов [
      {
        id: string,
        label: string,
        type: "button" | "slider" | "toggle",
        action: string (действие при использовании),
        min: number (опционально, для slider),
        max: number (опционально, для slider),
        defaultValue: number | boolean
      }
    ]
  - process: описание процесса {
      stages: [
        {
          id: string,
          name: string,
          description: string,
          triggers: [{controlId: string, action: string}],
          effects: [{componentId: string, change: string}],
          duration: number (опционально, длительность в секундах)
        }
      ],
      feedback: массив сообщений обратной связи {stageId: string, message: string}
    }
  - experiments: массив экспериментов (опционально) [
      {
        id: string,
        name: string,
        description: string,
        variables: [{name: string, range: {min: number, max: number}}],
        observations: [{variable: string, effect: string}]
      }
    ]
- Описание: "Интерактивная симуляция процесса с моделью объекта, управляющими элементами и описанием этапов процесса. При использовании элементов управления происходят визуальные изменения в модели."

БЛОК 4 - УГЛУБЛЁННОЕ ИЗУЧЕНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения об эксперименте с переменными
- Упоминание о том, что можно менять условия и наблюдать результаты
- Пример: "Теперь усложним задачу. Проведите эксперимент: меняйте условия и наблюдайте, как это влияет на [процесс]."

Контент (content):
- Теория факторов, влияющих на процесс
- Как каждый фактор работает
- Что вы будете делать в эксперименте
- Как интерпретировать результаты
- ВСЕ сложные аспекты из исходного контента должны быть раскрыты

Адаптация (adaptation):
- Тип элемента: "simulation" (эксперимент с переменными)
- Структура данных:
  - type: "experiment"
  - model: модель объекта с переменными {components: [...], variables: [{name: string, value: number, range: {min: number, max: number}}]}
  - controls: массив слайдеров для управления переменными [
      {
        id: string,
        label: string,
        variable: string,
        min: number,
        max: number,
        step: number,
        unit: string (опционально, единица измерения),
        defaultValue: number
      }
    ]
  - graph: объект с информацией о графике (опционально) {
      type: "line" | "bar" | "scatter",
      xAxis: {label: string, unit: string},
      yAxis: {label: string, unit: string},
      realTime: boolean (обновление в реальном времени)
    }
  - observations: массив наблюдений [
      {
        variable: string,
        value: number,
        effect: string (эффект на процесс),
        explanation: string (объяснение эффекта)
      }
    ]
  - goal: объект с целью эксперимента {
      description: string,
      optimalValues: [{variable: string, value: number}],
      explanation: string (почему эти значения оптимальны)
    }
  - results: объект для сохранения результатов (опционально) {save: boolean, format: "table" | "graph"}
- Описание: "Эксперимент с переменными, где можно менять параметры через слайдеры, наблюдать изменения в модели в реальном времени и видеть результаты на графике. Цель: найти оптимальное сочетание параметров."

БЛОК 5 - ИТОГОВОЕ ЗАДАНИЕ:
───────────────────────────────────────────────────────────────────────────────
Подводка (intro):
- 2-3 предложения о создании финального продукта
- Упоминание о чек-листе для проверки
- Пример: "Теперь создайте финальный продукт: [продукт]. Используйте чек-лист, чтобы убедиться, что всё учли."

Контент (content):
- Что должно быть в итоговом продукте (НЕ тест)
- Критерии оценки
- Примеры хороших продуктов
- Поле для рефлексии
- ВСЕ ключевые концепции из урока должны использоваться в задании
- ВАЖНО: Это ЗАДАНИЕ на создание продукта, а НЕ тест с вопросами и ответами
- Если в исходном контенте есть итоговый тест, он должен быть включен в текст, но его содержание не изменяется

Адаптация (adaptation):
- Тип элемента: "interactive" (создание итогового продукта)
- Структура данных:
  - type: "product-creation"
  - components: массив доступных компонентов [
      {
        id: string,
        label: string,
        type: string,
        description: string,
        fromBlock: number (из какого блока взят компонент)
      }
    ]
  - checklist: массив пунктов для проверки [
      {
        id: string,
        text: string,
        completed: boolean,
        required: boolean,
        componentId: string (опционально, связанный компонент)
      }
    ]
  - workspace: рабочая область для создания продукта {width: number, height: number, tools: [...]}
  - template: шаблон продукта (опционально) {structure: {...}, example: string}
  - validation: правила валидации {
      requiredComponents: [string],
      minComponents: number,
      criteria: [{name: string, description: string, weight: number}]
    }
  - reflection: объект для рефлексии {
      questions: [
        {
          id: string,
          question: string,
          type: "text" | "textarea",
          required: boolean
        }
      ]
    }
  - export: объект для экспорта (опционально) {format: "png" | "pdf" | "json", enabled: boolean}
- Описание: "Конструктор итогового продукта с доступными компонентами из всех блоков урока, чек-листом для проверки и возможностью экспорта результата."

ВАЖНО О ТЕСТАХ:
- Итоговые тесты с вопросами и ответами НЕ адаптируются под типы восприятия
- Итоговые тесты остаются одинаковыми для всех типов студентов
- Если в исходном контенте есть итоговый тест, он должен быть включен в контент БЛОКА 5 как текст, но НЕ как интерактивный элемент
- Тест может быть описан в тексте, но его содержание не изменяется в зависимости от типа восприятия

═══════════════════════════════════════════════════════════════════════════════
ФОРМАТ ВЫВОДА (ОБЯЗАТЕЛЬНО):
═══════════════════════════════════════════════════════════════════════════════

Верни результат в формате JSON со следующей структурой:

{
  "block1": {
    "intro": {
      "text": "Подводка из 2-3 предложений, объясняющая что будет происходить в блоке",
      "type": "intro"
    },
    "content": {
      "title": "Заголовок блока",
      "text": "ПОЛНЫЙ текст контента автора, структурированный как техническое задание на проект. Минимум 200 символов. ВСЕ ключевые понятия должны быть включены. Текст отвечает на вопросы: что делать, как делать, зачем делать.",
      "sections": [
        {
          "title": "Подзаголовок секции",
          "content": "Содержание секции с инструкциями и объяснениями",
          "highlighted": ["ключевые", "термины", "для", "выделения"]
        }
      ],
      "type": "text"
    },
    "adaptation": {
      "type": "kinesthetic",
      "element": {
        "type": "checklist",
        "data": {
          "items": [
            {
              "id": "item1",
              "text": "Конкретная задача из урока",
              "completed": false,
              "icon": "assembly",
              "description": "Краткое описание задачи"
            }
          ],
          "progress": {
            "total": 5,
            "completed": 0
          },
          "finalResult": "Описание итогового результата"
        },
        "description": "Детальное описание чек-листа и его назначения"
      }
    }
  },
  "block2": { /* аналогичная структура */ },
  "block3": { /* аналогичная структура */ },
  "block4": { /* аналогичная структура */ },
  "block5": { /* аналогичная структура */ }
}

КРИТИЧЕСКИ ВАЖНО:
1. Ты ДОЛЖЕН вернуть ВСЕ 5 блоков: block1, block2, block3, block4, block5. Отсутствие хотя бы одного блока приведет к ошибке.
2. Каждый блок ДОЛЖЕН содержать все три слоя: intro, content, adaptation
3. Поле content.text ДОЛЖНО содержать ВЕСЬ контент автора из исходного урока
4. Поле adaptation.element.data ДОЛЖНО быть конкретным и детальным, не абстрактным
5. Все ключевые термины из исходного контента ДОЛЖНЫ присутствовать в content.text
6. Интерактивные элементы ДОЛЖНЫ отражать те же концепции, что и текст
7. Используй конкретные данные, основанные на исходном контенте урока
8. Для симуляций и экспериментов указывай конкретные значения параметров
9. Если исходный урок содержит только один блок, распредели его содержание по всем 5 блокам адаптации логически

Верни ТОЛЬКО JSON без дополнительных комментариев. Убедись, что JSON содержит все 5 блоков полностью.
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

