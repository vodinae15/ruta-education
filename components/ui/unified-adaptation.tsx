"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  XIcon,
  VolumeIcon,
  HandIcon,
  EyeIcon,
  EarIcon,
  BookOpenIcon,
  LightbulbIcon,
  TargetIcon,
  UsersIcon,
  ClockIcon,
  StarIcon,
  EditIcon,
  PlusIcon,
  TrashIcon
} from "@/components/ui/icons"
import { 
  AdaptationContent, 
  AdaptationBlock,
  type AdaptationType,
  type AdaptationMode
} from "@/lib/adaptation-logic"
import { AdaptationElementRenderer } from "@/components/ui/adaptation-elements/adaptation-element-renderer"
import { TestPlayer } from "@/components/test-player"
import { AudioPlayer } from "@/components/ui/adaptation-elements/audio-player"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Новые template-компоненты
import { FlipCards } from "@/components/adaptation/templates/original/FlipCards"
import { StructuredText } from "@/components/adaptation/templates/original/StructuredText"
import { MermaidDiagram } from "@/components/adaptation/templates/visual/MermaidDiagram"
import { ComparisonTable } from "@/components/adaptation/templates/visual/ComparisonTable"
import { AudioUploadBlock } from "@/components/adaptation/templates/auditory/AudioUploadBlock"
import { AudioCards } from "@/components/adaptation/templates/auditory/AudioCards"
import { GoalsChecklist } from "@/components/adaptation/templates/kinesthetic/GoalsChecklist"
import { PracticalText } from "@/components/adaptation/templates/kinesthetic/PracticalText"
import { PracticeBlock } from "@/components/adaptation/blocks/PracticeBlock"
import { AttachmentsBlock } from "@/components/adaptation/blocks/AttachmentsBlock"
import { TestBlock } from "@/components/adaptation/blocks/TestBlock"

interface UnifiedAdaptationProps {
  mode: AdaptationMode
  lessonTitle: string
  adaptedContent?: AdaptationContent
  originalContent?: {
    blocks: Array<{
      title: string
      content: string
      type: string
    }>
  }
  isStudent?: boolean
  courseId?: string
  lessonId?: string
  lessonBlocks?: Array<{ id: string; type: string; title?: string }>
  onProgressUpdate?: (progress: number, completedBlocks: string[]) => void
  onSaveProgress?: (data: any) => void
  materialsAnalysis?: {
    has_audio: boolean
    has_video: boolean
    has_images: boolean
    has_practice: boolean
    recommendations: Array<{
      type: string
      message: string
      priority?: 'low' | 'medium' | 'high'
    }>
  }
  studentType?: string // Для автоподстановки режима представления материала (старый пропс, оставляем для совместимости)
  isEditing?: boolean // Режим inline-редактирования
  onAdaptedContentChange?: (content: AdaptationContent) => void // Callback для изменений контента
}

interface StudentProgress {
  completedBlocks: string[]
  timeSpent: number
  testResults: { [key: string]: string }
  lastSaved: Date
}

export function UnifiedAdaptation({
  mode,
  lessonTitle,
  adaptedContent,
  originalContent,
  isStudent = false,
  courseId,
  lessonId,
  lessonBlocks = [],
  onProgressUpdate,
  onSaveProgress,
  materialsAnalysis,
  studentType, // Для совместимости со старым кодом
  isEditing = false, // Режим inline-редактирования
  onAdaptedContentChange // Callback для изменений контента
}: UnifiedAdaptationProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>(['block1'])
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([])
  const [startTime] = useState(Date.now())
  const [progress, setProgress] = useState<StudentProgress>({
    completedBlocks: [],
    timeSpent: 0,
    testResults: {},
    lastSaved: new Date()
  })
  const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({})
  const [blockViewTimes, setBlockViewTimes] = useState<Record<string, number>>({})
  const [completedInteractiveElements, setCompletedInteractiveElements] = useState<Set<string>>(new Set())
  const [interactiveElementResults, setInteractiveElementResults] = useState<Record<string, any>>({})

  // Локальная копия контента для inline-редактирования
  const [localAdaptedContent, setLocalAdaptedContent] = useState<AdaptationContent | undefined>(adaptedContent)

  // Синхронизация с внешним контентом
  useEffect(() => {
    if (adaptedContent) {
      setLocalAdaptedContent(adaptedContent)
    }
  }, [adaptedContent])

  // Обработчик изменений контента блока
  const handleBlockContentChange = useCallback((blockId: keyof AdaptationContent, updates: Partial<AdaptationBlock>) => {
    if (!localAdaptedContent) return

    const updatedContent = {
      ...localAdaptedContent,
      [blockId]: {
        ...localAdaptedContent[blockId],
        ...updates
      }
    }

    setLocalAdaptedContent(updatedContent)
    onAdaptedContentChange?.(updatedContent)
  }, [localAdaptedContent, onAdaptedContentChange])

  // Refs для отслеживания блоков и времени просмотра
  const trackedBlocksRef = useRef<Set<string>>(new Set())
  const blockViewTimesRef = useRef<Record<string, number>>({})
  
  // Refs для колбэков - предотвращают проблемы с замыканиями и обновлениями во время рендеринга
  const onProgressUpdateRef = useRef(onProgressUpdate)
  const onSaveProgressRef = useRef(onSaveProgress)
  
  // Обновляем ссылки на колбэки при их изменении
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate
  }, [onProgressUpdate])
  
  useEffect(() => {
    onSaveProgressRef.current = onSaveProgress
  }, [onSaveProgress])

  // Определяем нормализованный тип для совместимости
  // Используем безопасную проверку с проверкой на undefined/null
  // Вычисляем значение напрямую, без useMemo, чтобы избежать проблем с порядком инициализации
  let normalizedType: AdaptationType
  if (mode === 'original') {
    if (studentType?.includes('visual')) {
      normalizedType = 'visual'
    } else if (studentType?.includes('auditory')) {
      normalizedType = 'auditory'
    } else if (studentType?.includes('kinesthetic')) {
      normalizedType = 'kinesthetic'
    } else {
      normalizedType = 'visual' // Значение по умолчанию
    }
  } else {
    normalizedType = (mode as AdaptationType) || 'visual' // Гарантируем значение по умолчанию
  }

  // Проверяем, нужно ли показывать базовый контент при недостатке материалов
  const shouldShowBasicContent = (): boolean => {
    if (!materialsAnalysis || mode === 'original') return false
    
    if (mode === 'auditory' && !materialsAnalysis.has_audio) return true
    if (mode === 'visual' && !materialsAnalysis.has_diagrams && !materialsAnalysis.has_images) return true
    if (mode === 'kinesthetic' && !materialsAnalysis.has_practice) return true
    
    return false
  }

  const showBasicContent = shouldShowBasicContent()

  // Маппинг между адаптированными блоками (block1, block2, etc.) и реальными блоками урока
  // Используем useCallback для стабильности функции в зависимостях других функций
  // Перемещаем выше, чтобы использовать в updateBlockViewTime
  const getLessonBlockForAdaptedBlock = useCallback((adaptedBlockId: string): { blockId: string; blockType: string } | null => {
    // block1 -> первый блок урока, block2 -> второй, и т.д.
    const blockIndex = parseInt(adaptedBlockId.replace('block', '')) - 1
    
    // Проверяем, есть ли блоки урока
    if (lessonBlocks && Array.isArray(lessonBlocks) && lessonBlocks.length > 0) {
      if (blockIndex >= 0 && blockIndex < lessonBlocks.length && lessonBlocks[blockIndex]) {
        const lessonBlock = lessonBlocks[blockIndex]
        
        // Извлекаем id и type из блока
        // Блок может быть объектом с полями id и type
        const blockId = lessonBlock.id || adaptedBlockId
        const blockType = lessonBlock.type || 'introduction'
        
        return {
          blockId: blockId,
          blockType: blockType
        }
      }
    }
    
    // Fallback: если блоков урока нет, используем типы по умолчанию
    const defaultBlockTypes = [
      'introduction',
      'navigation', 
      'main_block_1',
      'intermediate_practice',
      'main_block_2',
      'intermediate_test',
      'main_block_3',
      'conclusion',
      'bonus_support'
    ]
    const defaultBlockType = defaultBlockTypes[blockIndex] || 'introduction'
    
    return {
      blockId: adaptedBlockId,
      blockType: defaultBlockType
    }
  }, [lessonBlocks])

  // Функция для обновления времени просмотра блока
  // Используем useCallback для стабильности функции в зависимостях useEffect
  // Перемещаем выше, чтобы использовать в useEffect
  const updateBlockViewTime = useCallback(async (adaptedBlockId: string, shouldClearTime: boolean = false) => {
    if (!isStudent || !courseId || !lessonId) return

    // Используем ref для получения текущего времени просмотра (актуально в интервалах)
    const viewStartTime = blockViewTimesRef.current[adaptedBlockId] || blockViewTimes[adaptedBlockId]
    if (!viewStartTime) return

    const timeSpent = Math.floor((Date.now() - viewStartTime) / 1000)
    
    // Минимальное время 1 секунда, чтобы не обновлять слишком часто
    if (timeSpent < 1) return

    const lessonBlock = getLessonBlockForAdaptedBlock(adaptedBlockId)
    if (!lessonBlock) return

    try {
      const response = await fetch('/api/update-block-view-time', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          blockId: lessonBlock.blockId,
          timeSpent
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [Track] Ошибка обновления времени просмотра блока:', error)
      } else {
        const result = await response.json()
        console.log('✅ [Track] Время просмотра блока обновлено:', {
          blockId: lessonBlock.blockId,
          blockType: lessonBlock.blockType,
          timeSpent: result.timeSpent
        })
        
        // Очищаем время начала просмотра, если блок закрыт
        if (shouldClearTime) {
          setBlockViewTimes(prev => {
            const newTimes = { ...prev }
            delete newTimes[adaptedBlockId]
            // Обновляем ref
            blockViewTimesRef.current = newTimes
            return newTimes
          })
        }
      }
    } catch (error) {
      console.error('❌ [Track] Ошибка при обновлении времени просмотра блока:', error)
    }
  }, [isStudent, courseId, lessonId, blockViewTimes, getLessonBlockForAdaptedBlock])

  // Обновляем прогресс
  useEffect(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    setProgress(prevProgress => ({
      ...prevProgress,
      completedBlocks,
      timeSpent,
      testResults: userAnswers
    }))
  }, [completedBlocks, startTime, userAnswers])

  // Вызываем onProgressUpdate отдельно, чтобы избежать обновления во время рендеринга
  // Используем отдельный useEffect для вызова колбэка, чтобы избежать проблем с порядком выполнения
  useEffect(() => {
    // Проверяем, что колбэк существует
    const callback = onProgressUpdateRef.current
    if (!callback) return
    
    // Сохраняем значения в локальные переменные перед асинхронным вызовом
    // Это предотвращает проблемы с замыканиями и неинициализированными переменными
    const blocks = [...completedBlocks]
    const progressPercentage = (blocks.length / 5) * 100
    
    // Используем setTimeout с минимальной задержкой для гарантированного выполнения после рендеринга
    // Это более надежно, чем queueMicrotask, так как гарантирует выполнение в следующем тике event loop
    const timeoutId = setTimeout(() => {
      const currentCallback = onProgressUpdateRef.current
      if (currentCallback) {
        try {
          currentCallback(progressPercentage, blocks)
        } catch (error) {
          console.error('❌ [UnifiedAdaptation] Error in onProgressUpdate callback:', error)
        }
      }
    }, 0)
    
    return () => clearTimeout(timeoutId)
  }, [completedBlocks])

  // Автосохранение для студентов
  useEffect(() => {
    if (!isStudent || !onSaveProgressRef.current) return

    const saveInterval = setInterval(() => {
      // Получаем актуальное состояние через функциональное обновление
      // НЕ вызываем колбэк внутри setProgress, чтобы избежать обновлений во время рендеринга
      setProgress(currentProgress => {
        // Сохраняем ссылку на колбэк и данные перед асинхронным вызовом
        const callback = onSaveProgressRef.current
        const progressData = { ...currentProgress }
        
        // Вызываем колбэк асинхронно, используя setTimeout для гарантированного выполнения после рендеринга
        setTimeout(() => {
          const currentCallback = onSaveProgressRef.current
          if (currentCallback) {
            try {
              currentCallback(progressData)
            } catch (error) {
              console.error('❌ [UnifiedAdaptation] Error in onSaveProgress callback:', error)
            }
          }
        }, 0)
        
        return currentProgress
      })
    }, 30000) // Сохраняем каждые 30 секунд

    return () => clearInterval(saveInterval)
  }, [isStudent])

  // Обновление времени просмотра блоков при размонтировании компонента
  useEffect(() => {
    return () => {
      // При размонтировании компонента обновляем время для всех открытых блоков
      if (isStudent && courseId && lessonId) {
        Object.keys(blockViewTimesRef.current).forEach(blockId => {
          const viewStartTime = blockViewTimesRef.current[blockId]
          if (viewStartTime) {
            const timeSpent = Math.floor((Date.now() - viewStartTime) / 1000)
            if (timeSpent >= 1) {
              // Обновляем время без очистки (компонент размонтируется)
              updateBlockViewTime(blockId, false).catch(error => {
                console.error('❌ [Track] Ошибка при обновлении времени при размонтировании:', error)
              })
            }
          }
        })
      }
    }
  }, [isStudent, courseId, lessonId, updateBlockViewTime])

  // Автоматическое отслеживание просмотра первого блока при загрузке (только один раз)
  useEffect(() => {
    if (!isStudent || !courseId || !lessonId || expandedBlocks.length === 0) return
    
    // Отслеживаем первый блок, если он раскрыт при загрузке
    if (expandedBlocks.includes('block1')) {
      const firstBlockKey = `block1-${lessonId}`
      
      // Проверяем, был ли уже отслежен этот блок
      if (trackedBlocksRef.current.has(firstBlockKey)) return
      
      // Используем setTimeout для задержки и избежания дубликатов
      const timer = setTimeout(async () => {
        // Повторная проверка перед отправкой
        if (trackedBlocksRef.current.has(firstBlockKey)) return
        
        const blockIndex = 0
        let lessonBlock: { blockId: string; blockType: string } | null = null

        if (blockIndex >= 0 && blockIndex < lessonBlocks.length && lessonBlocks[blockIndex]) {
          const block = lessonBlocks[blockIndex]
          lessonBlock = {
            blockId: block.id || 'block1',
            blockType: block.type || 'introduction'
          }
        } else {
          lessonBlock = {
            blockId: 'block1',
            blockType: 'introduction'
          }
        }

        if (!lessonBlock) return

        try {
          const response = await fetch('/api/track-block-view', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              courseId,
              lessonId,
              blockId: lessonBlock.blockId,
              blockType: lessonBlock.blockType,
              timeSpent: 0
            }),
          })

          if (response.ok) {
            const result = await response.json()
            console.log('✅ [Track] Первый блок отслежен автоматически:', {
              blockId: lessonBlock.blockId,
              blockType: lessonBlock.blockType,
              isRepeat: result.isRepeat
            })
            // Помечаем блок как отслеженный
            trackedBlocksRef.current.add(firstBlockKey)
          }
        } catch (error) {
          console.error('❌ [Track] Ошибка автоматического отслеживания первого блока:', error)
        }
      }, 1500) // Задержка 1.5 секунды для избежания множественных вызовов
      
      return () => clearTimeout(timer)
    }
  }, [isStudent, courseId, lessonId, expandedBlocks, lessonBlocks]) // Запускаем при изменении этих параметров

  // Периодическое обновление времени просмотра для открытых блоков (каждые 30 секунд)
  // Используем ref для хранения текущих открытых блоков, чтобы избежать проблем с зависимостями
  const expandedBlocksRef = useRef<string[]>([])
  
  // Обновляем ref при изменении expandedBlocks
  useEffect(() => {
    expandedBlocksRef.current = expandedBlocks
  }, [expandedBlocks])

  useEffect(() => {
    if (!isStudent || !courseId || !lessonId) return

    // Обновляем время для всех открытых блоков каждые 30 секунд
    const updateInterval = setInterval(() => {
      // Используем ref для получения текущих открытых блоков
      const currentExpanded = expandedBlocksRef.current
      
      // Обновляем время для всех открытых блоков
      currentExpanded.forEach(blockId => {
        // Используем ref для получения текущего времени просмотра
        const viewStartTime = blockViewTimesRef.current[blockId]
        if (viewStartTime) {
          const timeSpent = Math.floor((Date.now() - viewStartTime) / 1000)
          // Минимальное время 5 секунд для периодического обновления (чтобы не обновлять слишком часто)
          // Это предотвращает обновление сразу после открытия блока
          if (timeSpent >= 5) {
            // Обновляем время без очистки, так как блок все еще открыт
            // Функция updateBlockViewTime сама проверит минимальное время (1 секунда)
            updateBlockViewTime(blockId, false).catch(error => {
              console.error('❌ [Track] Ошибка периодического обновления времени:', error)
            })
          }
        }
      })
    }, 30000) // Обновляем каждые 30 секунд

    return () => clearInterval(updateInterval)
  }, [isStudent, courseId, lessonId, updateBlockViewTime])

  // Функция для отслеживания просмотра блока
  const trackBlockView = async (adaptedBlockId: string) => {
    if (!isStudent || !courseId || !lessonId) return

    const lessonBlock = getLessonBlockForAdaptedBlock(adaptedBlockId)
    if (!lessonBlock) return

    // Проверяем, не был ли уже отслежен этот блок в этой сессии
    const blockKey = `${adaptedBlockId}-${lessonId}`
    if (trackedBlocksRef.current.has(blockKey)) {
      console.log('⚠️ [Track] Блок уже отслежен в этой сессии:', blockKey)
      // Блок уже отслежен, но это повторный просмотр - отправляем событие снова
      // Триггер в БД определит, что это повторный просмотр
    }

    // Засекаем время начала просмотра (если еще не засечено)
    if (!blockViewTimes[adaptedBlockId]) {
      const viewStartTime = Date.now()
      setBlockViewTimes(prev => {
        const newTimes = {
          ...prev,
          [adaptedBlockId]: viewStartTime
        }
        // Обновляем ref для использования в интервалах
        blockViewTimesRef.current = newTimes
        return newTimes
      })
    }

    try {
      const response = await fetch('/api/track-block-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          blockId: lessonBlock.blockId,
          blockType: lessonBlock.blockType,
          timeSpent: 0 // Время будет обновлено при закрытии блока или периодически
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [Track] Ошибка отслеживания просмотра блока:', error)
      } else {
        const result = await response.json()
        console.log('✅ [Track] Просмотр блока отслежен:', {
          blockId: lessonBlock.blockId,
          blockType: lessonBlock.blockType,
          isRepeat: result.isRepeat
        })
        // Помечаем блок как отслеженный (даже если это повторный просмотр)
        trackedBlocksRef.current.add(blockKey)
      }
    } catch (error) {
      console.error('❌ [Track] Ошибка при отслеживании просмотра блока:', error)
    }
  }

  const toggleBlockExpansion = (blockId: string) => {
    const isCurrentlyExpanded = expandedBlocks.includes(blockId)
    
    setExpandedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )

    // Отслеживаем просмотр блока при раскрытии
    if (isStudent && !isCurrentlyExpanded) {
      // Блок раскрывается - начинаем отслеживание
      trackBlockView(blockId)
    } else if (isStudent && isCurrentlyExpanded) {
      // Блок закрывается - обновляем время просмотра и очищаем время начала
      updateBlockViewTime(blockId, true)
    }
  }

  const toggleBlockCompletion = (blockId: string) => {
    setCompletedBlocks(prev => {
      const newCompletedBlocks = prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
      
      // Сохраняем прогресс при изменении статуса блока (асинхронно, чтобы избежать обновлений во время рендеринга)
      if (isStudent && onSaveProgressRef.current) {
        const currentProgress = {
          completedBlocks: newCompletedBlocks,
          timeSpent: Math.floor((Date.now() - startTime) / 1000),
          testResults: userAnswers,
          lastSaved: new Date()
        }
        
        // Вызываем callback асинхронно, чтобы избежать обновлений во время рендеринга
        setTimeout(() => {
          const callback = onSaveProgressRef.current
          if (callback) {
            try {
              callback(currentProgress)
            } catch (error) {
              console.error('❌ [UnifiedAdaptation] Error in onSaveProgress callback:', error)
            }
          }
        }, 0)
      }
      
      return newCompletedBlocks
    })
  }

  // Сохранение времени при закрытии страницы
  useEffect(() => {
    if (!isStudent || !onSaveProgressRef.current) return

    const handleBeforeUnload = () => {
      // Отправляем финальное время при закрытии страницы
      const finalTimeSpent = Math.floor((Date.now() - startTime) / 1000)
      
      const finalProgress = {
        ...progress,
        timeSpent: finalTimeSpent
      }
      
      // Вызываем callback для сохранения (обработка на странице) асинхронно
      const callback = onSaveProgressRef.current
      if (callback) {
        try {
          callback(finalProgress)
        } catch (error) {
          console.error('❌ [UnifiedAdaptation] Error in onSaveProgress callback:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Также сохраняем при размонтировании компонента
      if (isStudent && onSaveProgressRef.current) {
        const finalTimeSpent = Math.floor((Date.now() - startTime) / 1000)
        const finalProgress = {
          ...progress,
          timeSpent: finalTimeSpent
        }
        const callback = onSaveProgressRef.current
        if (callback) {
          setTimeout(() => {
            try {
              callback(finalProgress)
            } catch (error) {
              console.error('❌ [UnifiedAdaptation] Error in onSaveProgress callback:', error)
            }
          }, 0)
        }
      }
    }
  }, [isStudent, startTime, progress])

  // Функция для сохранения результатов интерактивных элементов на сервер
  const saveInteractiveElementResult = async (elementId: string, result: any, elementType: string) => {
    if (!isStudent || !courseId || !lessonId) return
    
    try {
      const response = await fetch('/api/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          progressData: {
            interactiveElements: {
              [elementId]: {
                type: elementType,
                result,
                completedAt: new Date().toISOString(),
                isCompleted: result.isAllCorrect || result.isCorrect || result.accuracy === 100
              }
            }
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [UnifiedAdaptation] Ошибка сохранения результата интерактивного элемента:', error)
      } else {
        console.log('✅ [UnifiedAdaptation] Результат интерактивного элемента сохранен:', elementId)
      }
    } catch (error) {
      console.error('❌ [UnifiedAdaptation] Ошибка при сохранении результата интерактивного элемента:', error)
    }
  }

  const recordInteraction = (type: string, data?: any) => {
    console.log(`Interaction recorded: ${type}`, data)
    
    // Определяем, является ли это завершением интерактивного элемента
    const interactiveElementTypes = [
      'drag_drop_complete',
      'diagram_labeling_complete',
      'classification_complete',
      'assembly_complete',
      'audio_dialog_complete',
      'diagram_builder_complete',
      'audio_recording_complete',
      'product_creation_complete',
      'test_complete',
      'final_test_complete'
    ]
    
    if (interactiveElementTypes.includes(type)) {
      const elementId = data?.elementId || `interactive-${type}-${Date.now()}`
      const result = data?.result || data
      
      // Сохраняем результат в локальное состояние
      setInteractiveElementResults(prev => ({
        ...prev,
        [elementId]: {
          type,
          result,
          timestamp: new Date().toISOString()
        }
      }))
      
      // Если элемент выполнен успешно, добавляем его в список выполненных
      const isCompleted = result?.isAllCorrect || result?.isCorrect || 
                         result?.accuracy === 100 || 
                         (result?.selectedAnswers && result?.isCorrect)
      
      if (isCompleted) {
        setCompletedInteractiveElements(prev => new Set([...prev, elementId]))
      }
      
      // Сохраняем результат на сервер
      if (isStudent && courseId && lessonId) {
        saveInteractiveElementResult(elementId, result, type).catch(error => {
          console.error('❌ [UnifiedAdaptation] Ошибка сохранения результата:', error)
        })
      }
    }
    
    // Сохраняем прогресс при взаимодействии
    if (isStudent && onSaveProgressRef.current) {
      const currentProgress = {
        completedBlocks,
        timeSpent: Math.floor((Date.now() - startTime) / 1000),
        testResults: userAnswers,
        interactiveElements: Object.fromEntries(completedInteractiveElements),
        interactiveElementResults,
        lastSaved: new Date()
      }
      
      // Вызываем callback для сохранения (обработка на странице) асинхронно
      const callback = onSaveProgressRef.current
      if (callback) {
        setTimeout(() => {
          try {
            callback(currentProgress)
          } catch (error) {
            console.error('❌ [UnifiedAdaptation] Error in onSaveProgress callback:', error)
          }
        }, 0)
      }
    }
  }

  const getPresentationModeInfo = () => {
    if (mode === 'original') {
      return {
        name: 'Оригинал',
        icon: <BookOpenIcon className="w-5 h-5" />,
        color: 'bg-[#5589a7] text-white',
        bgColor: 'bg-[#FDF8F3]',
        description: 'Оригинальный контент автора'
      }
    }

    switch (normalizedType) {
      case 'visual':
        return {
          name: 'Визуал',
          icon: <EyeIcon className="w-5 h-5" />,
          color: 'bg-[#659AB8] text-white',
          bgColor: 'bg-[#CDE6F9]',
          description: 'Структурированная подача с схемами и диаграммами'
        }
      case 'auditory':
        return {
          name: 'Аудиал',
          icon: <EarIcon className="w-5 h-5" />,
          color: 'bg-[#10B981] text-white',
          bgColor: 'bg-green-50',
          description: 'Истории и диалоги для лучшего восприятия'
        }
      case 'kinesthetic':
        return {
          name: 'Кинестетик',
          icon: <HandIcon className="w-5 h-5" />,
          color: 'bg-[#F59E0B] text-white',
          bgColor: 'bg-orange-50',
          description: 'Практические задания и интерактивные элементы'
        }
      default:
        return {
          name: 'Универсальный',
          icon: <BookOpenIcon className="w-5 h-5" />,
          color: 'bg-[#659AB8] text-white',
          bgColor: 'bg-[#F3FAFE]',
          description: 'Адаптированный контент'
        }
    }
  }

  const presentationModeInfo = getPresentationModeInfo()

  // Рендеринг template-компонента (слой 3) на основе типа адаптации и номера блока
  const renderTemplateComponent = (blockId: keyof AdaptationContent, block: AdaptationBlock, blockNumber: number) => {
    // Проверяем, что есть данные адаптации
    if (!block.adaptation || !block.adaptation.element) {
      return <div className="p-4 text-center text-slate-400">Шаблон не настроен</div>
    }

    const data = block.adaptation.element.data || {}
    const adaptationType = mode as AdaptationType

    // Обработчики изменений для inline-редактирования
    const handleDataChange = (newData: any) => {
      handleBlockContentChange(blockId, {
        adaptation: {
          ...block.adaptation,
          element: {
            ...block.adaptation.element,
            data: newData
          }
        }
      })
    }

    // Блоки 1-2: специфичные для каждого типа адаптации
    // НЕ передаем intro и mainText, так как они рендерятся в Слое 1 и Слое 2
    if (blockNumber === 1) {
      switch (adaptationType) {
        case 'original':
          return (
            <FlipCards
              isEmpty={!data.cards || data.cards.length === 0}
              cards={data.cards}
              isEditing={isEditing}
              onCardsChange={(cards) => handleDataChange({ ...data, cards })}
            />
          )
        case 'visual':
          return (
            <MermaidDiagram
              isEmpty={!data.mermaidCode}
              mermaidCode={data.mermaidCode}
              isEditing={isEditing}
              onMermaidCodeChange={(code) => handleDataChange({ ...data, mermaidCode: code })}
            />
          )
        case 'auditory':
          return (
            <AudioUploadBlock
              isEmpty={!data.audioUrl}
              audioUrl={data.audioUrl}
              isEditing={isEditing}
              onAudioUrlChange={(url) => handleDataChange({ ...data, audioUrl: url })}
              courseId={courseId}
              lessonId={lessonId}
            />
          )
        case 'kinesthetic':
          return (
            <GoalsChecklist
              isEmpty={!data.goals || data.goals.length === 0}
              goals={data.goals}
              isEditing={isEditing}
              onGoalsChange={(goals) => handleDataChange({ ...data, goals })}
            />
          )
      }
    }

    if (blockNumber === 2) {
      switch (adaptationType) {
        case 'original':
          return (
            <StructuredText
              isEmpty={!data.sections || data.sections.length === 0}
              sections={data.sections}
              isEditing={isEditing}
              onSectionsChange={(sections) => handleDataChange({ ...data, sections })}
            />
          )
        case 'visual':
          return (
            <ComparisonTable
              isEmpty={!data.rows || data.rows.length === 0}
              rows={data.rows}
              isEditing={isEditing}
              onRowsChange={(rows) => handleDataChange({ ...data, rows })}
            />
          )
        case 'auditory':
          return (
            <AudioCards
              isEmpty={!data.audioCards || data.audioCards.length === 0}
              audioCards={data.audioCards}
              isEditing={isEditing}
              onAudioCardsChange={(audioCards) => handleDataChange({ ...data, audioCards })}
            />
          )
        case 'kinesthetic':
          return (
            <PracticalText
              isEmpty={!data.sections || data.sections.length === 0}
              sections={data.sections}
              isEditing={isEditing}
              onSectionsChange={(sections) => handleDataChange({ ...data, sections })}
            />
          )
      }
    }

    // Блоки 3-5: общие для всех типов
    // Эти блоки используют BlockWrapper и получают mainText из block.content.text
    if (blockNumber === 3) {
      return (
        <PracticeBlock
          isEmpty={!data.tasks || data.tasks.length === 0}
          mainText={block.content?.text}
          tasks={data.tasks}
          isEditing={isEditing}
          onTasksChange={(tasks) => handleDataChange({ ...data, tasks })}
        />
      )
    }

    if (blockNumber === 4) {
      const mediaElements = (block.content?.elements || []).filter(el =>
        el.type === 'video' || el.type === 'audio' || el.type === 'image' || el.type === 'file'
      )

      return (
        <AttachmentsBlock
          isEmpty={
            (!data.attachments || data.attachments.length === 0) &&
            mediaElements.length === 0
          }
          mainText={block.content?.text}
          attachments={data.attachments}
          mediaElements={mediaElements as any[]}
          isEditing={isEditing}
          onAttachmentsChange={(attachments) => handleDataChange({ ...data, attachments })}
          courseId={courseId}
          lessonId={lessonId}
        />
      )
    }

    if (blockNumber === 5) {
      return (
        <TestBlock
          isEmpty={!data.questions || data.questions.length === 0}
          mainText={block.content?.text}
          questions={data.questions}
          isEditing={isEditing}
          onQuestionsChange={(questions) => handleDataChange({ ...data, questions })}
        />
      )
    }

    // Fallback на старый рендерер для неизвестных блоков
    return (
      <AdaptationElementRenderer
        element={block.adaptation.element}
        blockNumber={blockNumber}
        onInteraction={recordInteraction}
      />
    )
  }

  // Рендеринг блока с трехслойной структурой
  const renderAdaptationBlock = (blockId: string, block: AdaptationBlock, blockNumber: number) => {
    const isExpanded = expandedBlocks.includes(blockId)
    const isCompleted = completedBlocks.includes(blockId)

    return (
      <Card
        key={blockId}
        className={`border ${
          isCompleted
            ? 'border-[#10B981] bg-green-50'
            : 'border-[#E5E7EB]'
        }`}
      >
        <CardHeader
          className={!isEditing ? "cursor-pointer" : ""}
          onClick={() => !isEditing && toggleBlockExpansion(blockId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                isCompleted ? 'bg-[#10B981]' : 'bg-[#659AB8]'
              }`}>
                {isCompleted ? <CheckIcon className="w-4 h-4" /> : blockNumber}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={block.content.title || ''}
                    onChange={(e) => handleBlockContentChange(blockId as keyof AdaptationContent, {
                      content: {
                        ...block.content,
                        title: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#659AB8]"
                    placeholder="Заголовок блока"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <CardTitle className="text-lg text-[#1E293B]">
                    {block.content.title}
                  </CardTitle>
                )}
                {isStudent && !isEditing && (
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleBlockCompletion(blockId)}
                      className="data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981]"
                    />
                    <span className="text-sm text-[#64748B]">
                      {isCompleted ? 'Завершено' : 'Отметить как завершенное'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[#659AB8] hover:text-[#5a8ba8]"
              >
                {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </CardHeader>

        {(isExpanded || isEditing) && (
          <CardContent className="pt-0 space-y-6">
            {/* Слой 1: Подводка */}
            <div className="mb-6">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-700">Подводка (intro)</label>
                    <EditIcon className="w-3 h-3 text-slate-600" />
                  </div>
                  <textarea
                    value={block.intro.text || ''}
                    onChange={(e) => handleBlockContentChange(blockId as keyof AdaptationContent, {
                      intro: {
                        ...block.intro,
                        text: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#659AB8] min-h-[80px]"
                    placeholder="Введите текст подводки к блоку"
                  />
                </div>
              ) : (
                <p className="text-slate-600 text-lg leading-relaxed">{block.intro.text}</p>
              )}
            </div>

            {/* Слой 2: Улучшенная текстовая версия */}
            <div className="space-y-4">
              <div className="prose prose-slate max-w-none">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">Основной текст (mainText) - поддерживается Markdown</label>
                      <EditIcon className="w-3 h-3 text-slate-600" />
                    </div>
                    <textarea
                      value={block.content.text || ''}
                      onChange={(e) => handleBlockContentChange(blockId as keyof AdaptationContent, {
                        content: {
                          ...block.content,
                          text: e.target.value
                        }
                      })}
                      className="w-full px-4 py-3 border-2 border-[#659AB8] rounded text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#659AB8] min-h-[200px] font-mono"
                      placeholder="Введите основной текст блока (поддерживается Markdown: ##заголовки, **жирный**, *курсив*, списки, > цитаты)"
                    />
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-900 mt-5 mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="text-slate-700 leading-relaxed mb-4" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 text-slate-700 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 text-slate-700 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
                        a: ({node, ...props}) => <a className="text-[#659AB8] hover:text-[#5589a7] underline" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#659AB8] pl-4 italic text-slate-600 my-4" {...props} />,
                        code: ({node, inline, ...props}: any) =>
                          inline ?
                            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} /> :
                            <code className="block bg-slate-100 text-slate-800 p-4 rounded text-sm font-mono overflow-x-auto my-4" {...props} />
                      }}
                    >
                      {block.content.text || ''}
                    </ReactMarkdown>
                  </div>
                )}
                
                {block.content.sections && block.content.sections.map((section, index) => (
                  <div key={index} className="mt-4">
                    <h4 className="text-lg font-semibold text-[#1E293B] mb-2">{section.title}</h4>
                    <p className="text-[#64748B] leading-relaxed whitespace-pre-wrap">{section.content}</p>
                    {section.highlighted && section.highlighted.length > 0 && (
                      <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <p className="text-sm font-medium text-slate-800 mb-1">Ключевые термины:</p>
                        <div className="flex flex-wrap gap-2">
                          {section.highlighted.map((term, termIndex) => (
                            <Badge key={termIndex} variant="outline" className="text-slate-700 border-slate-300">
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Элементы контента (текст, видео, аудио, изображения, файлы, задания, тесты) */}
                {block.content.elements && block.content.elements.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {block.content.elements.map((element, elementIndex) => {
                      if (element.type === 'text') {
                        return (
                          <div key={element.id || elementIndex} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-[#1E293B] leading-relaxed whitespace-pre-wrap">{element.content}</p>
                          </div>
                        )
                      } else if (element.type === 'video') {
                        return (
                          <div key={element.id || elementIndex} className="rounded-lg overflow-hidden">
                            {element.caption && (
                              <p className="text-sm text-slate-600 mb-2">{element.caption}</p>
                            )}
                            {element.content ? (
                              element.content.includes('youtube.com') || element.content.includes('youtu.be') ? (
                                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                  <iframe
                                    src={element.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <video
                                  controls
                                  className="w-full rounded-lg"
                                  src={element.content}
                                >
                                  Ваш браузер не поддерживает видео.
                                </video>
                              )
                            ) : (
                              <p className="text-slate-500 p-4 bg-slate-50 rounded-lg border border-slate-200">Видео не добавлено</p>
                            )}
                          </div>
                        )
                      } else if (element.type === 'audio') {
                        return (
                          <div key={element.id || elementIndex} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h5 className="text-sm font-semibold text-[#659AB8] mb-2">Аудио</h5>
                            <p className="text-slate-600">{element.content || 'Аудио не добавлено'}</p>
                          </div>
                        )
                      } else if (element.type === 'image') {
                        return (
                          <div key={element.id || elementIndex} className="rounded-lg overflow-hidden">
                            {element.content ? (
                              <>
                                <img
                                  src={element.content}
                                  alt={element.caption || 'Изображение'}
                                  className="w-full h-auto rounded-lg"
                                  loading="lazy"
                                />
                                {element.caption && (
                                  <p className="text-sm text-slate-600 mt-2 italic">{element.caption}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-slate-500 p-4 bg-slate-50 rounded-lg border border-slate-200">Изображение не добавлено</p>
                            )}
                          </div>
                        )
                      } else if (element.type === 'file') {
                        return (
                          <div key={element.id || elementIndex} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h5 className="text-sm font-semibold text-[#659AB8] mb-2">Файл</h5>
                            <p className="text-slate-600">{element.content || 'Файл не добавлен'}</p>
                          </div>
                        )
                      } else if (element.type === 'task') {
                        return (
                          <div key={element.id || elementIndex} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h5 className="text-sm font-semibold text-blue-800 mb-2">Задание</h5>
                            <p className="text-blue-700 leading-relaxed whitespace-pre-wrap">{element.content}</p>
                          </div>
                        )
                      } else if (element.type === 'test') {
                        try {
                          if (!element.content) {
                            console.warn('Test element has no content:', element.id)
                            return (
                              <div key={element.id || elementIndex} className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-sm text-slate-800">
                                  ⚠️ Тест не содержит данных. Обратитесь к автору курса.
                                </p>
                              </div>
                            )
                          }
                          
                          const testData = JSON.parse(element.content)
                          if (testData) {
                            return (
                              <div key={element.id || elementIndex} className="mt-6">
                                <h4 className="text-lg font-semibold text-[#1E293B] mb-4">Тест</h4>
                                <TestPlayer
                                  testData={testData}
                                  onComplete={(result) => {
                                    recordInteraction('test_complete', { 
                                      elementId: element.id, 
                                      result,
                                      timestamp: new Date().toISOString()
                                    })
                                  }}
                                  studentId={isStudent ? undefined : undefined}
                                />
                              </div>
                            )
                          }
                        } catch (err) {
                          console.error('Error parsing test data:', err, element)
                          return (
                            <div key={element.id || elementIndex} className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-semibold text-red-800 mb-2">Ошибка загрузки теста</p>
                              <p className="text-xs text-red-600">
                                Не удалось загрузить тест. Пожалуйста, обратитесь к автору курса.
                              </p>
                              {process.env.NODE_ENV === 'development' && (
                                <details className="mt-2">
                                  <summary className="text-xs text-red-600 cursor-pointer">Детали ошибки</summary>
                                  <pre className="text-xs text-red-500 mt-2 overflow-auto">
                                    {err instanceof Error ? err.message : String(err)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          )
                        }
                      }
                      return null
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Слой 3: Адаптированный элемент (template-компоненты) */}
            <div className="relative">
              {renderTemplateComponent(blockId as keyof AdaptationContent, block, blockNumber)}
            </div>

            {/* Отображение тестов из оригинального контента (только для блока 5) */}
            {blockNumber === 5 && originalContent && originalContent.blocks && (
              <div className="mt-6 space-y-4">
                {originalContent.blocks.map((originalBlock: any, blockIndex: number) => {
                  // Ищем тесты в элементах блока
                  if (originalBlock.elements && originalBlock.elements.length > 0) {
                    return originalBlock.elements.map((element: any, elementIndex: number) => {
                      if (element.type === 'test' && element.content) {
                        try {
                          const testData = JSON.parse(element.content)
                          if (!testData) {
                            return (
                              <div key={`test-${blockIndex}-${elementIndex}`} className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-sm text-slate-800">
                                  ⚠️ Итоговый тест не содержит данных. Обратитесь к автору курса.
                                </p>
                              </div>
                            )
                          }
                          
                          return (
                            <div key={`test-${blockIndex}-${elementIndex}`} className="mt-6">
                              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                                <h4 className="text-lg font-semibold text-blue-800 mb-2">
                                  Итоговый тест
                                </h4>
                                <p className="text-sm text-blue-600 mb-4">
                                  Итоговые тесты одинаковы для всех типов восприятия. Вы можете пройти тест ниже.
                                </p>
                              </div>
                              <TestPlayer
                                testData={testData}
                                onComplete={(result) => {
                                  recordInteraction('final_test_complete', { 
                                    elementId: element.id, 
                                    result,
                                    timestamp: new Date().toISOString(),
                                    blockNumber: 5
                                  })
                                }}
                                studentId={isStudent ? undefined : undefined}
                              />
                              {/* Добавляем озвучку для аудиалов */}
                              {mode === 'auditory' && testData.question && testData.answers && (
                                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                  <p className="text-sm text-green-700 mb-2">
                                    💡 Для лучшего восприятия вы можете прослушать текст теста
                                  </p>
                                  <AudioPlayer
                                    data={{
                                      text: `${testData.question}\n\n${testData.answers.map((a: any, idx: number) => `${String.fromCharCode(65 + idx)}) ${a.text}`).join('\n')}`,
                                      duration: Math.ceil((testData.question.length + (testData.answers || []).reduce((sum: number, a: any) => sum + (a.text?.length || 0), 0)) / 10),
                                      format: 'mp3'
                                    }}
                                    description="Озвучка текста теста"
                                    onInteraction={recordInteraction}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        } catch (err) {
                          console.error('Error parsing test data from original content:', err, element)
                          return (
                            <div key={`test-error-${blockIndex}-${elementIndex}`} className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-semibold text-red-800 mb-2">Ошибка загрузки итогового теста</p>
                              <p className="text-xs text-red-600">
                                Не удалось загрузить тест из оригинального контента. Пожалуйста, обратитесь к автору курса.
                              </p>
                              {process.env.NODE_ENV === 'development' && (
                                <details className="mt-2">
                                  <summary className="text-xs text-red-600 cursor-pointer">Детали ошибки</summary>
                                  <pre className="text-xs text-red-500 mt-2 overflow-auto">
                                    {err instanceof Error ? err.message : String(err)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          )
                        }
                      }
                      return null
                    })
                  }
                  return null
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  // Рендеринг базового контента при недостатке материалов
  const renderBasicContent = () => {
    if (!originalContent || !originalContent.blocks || originalContent.blocks.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Контент недоступен</p>
        </div>
      )
    }

    // Для визуального режима структурируем текст (списки, заголовки)
    if (mode === 'visual') {
      return (
        <div className="space-y-6">
          {originalContent.blocks.map((block, index) => (
            <Card key={index} className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E293B]">{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  {/* Структурируем текст: разбиваем на абзацы, выделяем списки */}
                  {block.content.split('\n').map((paragraph, pIndex) => {
                    const trimmed = paragraph.trim()
                    if (!trimmed) return null
                    
                    // Проверяем, является ли строка списком
                    if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/)) {
                      return (
                        <ul key={pIndex} className="list-disc list-inside mb-2 text-[#1E293B]">
                          <li>{trimmed.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '')}</li>
                        </ul>
                      )
                    }
                    
                    // Проверяем, является ли строка заголовком
                    if (trimmed.match(/^#{1,3}\s/)) {
                      const level = trimmed.match(/^#+/)?.[0].length || 1
                      const text = trimmed.replace(/^#+\s/, '')
                      const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
                      return (
                        <HeadingTag key={pIndex} className={`font-bold text-[#1E293B] mb-2 ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg'}`}>
                          {text}
                        </HeadingTag>
                      )
                    }
                    
                    return (
                      <p key={pIndex} className="text-[#1E293B] leading-relaxed mb-2">
                        {trimmed}
                      </p>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // Для аудиального режима показываем текст
    if (mode === 'auditory') {
      return (
        <div className="space-y-6">
          {originalContent.blocks.map((block, index) => (
            <Card key={index} className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E293B]">{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <p className="text-[#1E293B] leading-relaxed whitespace-pre-wrap">{block.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // Для кинестетического режима показываем базовый контент + минимальную проверку (если есть)
    if (mode === 'kinesthetic') {
      return (
        <div className="space-y-6">
          {originalContent.blocks.map((block, index) => (
            <Card key={index} className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E293B]">{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <p className="text-[#1E293B] leading-relaxed whitespace-pre-wrap">{block.content}</p>
                </div>
                {/* Показываем минимальную проверку, если есть тесты в элементах */}
                {block.elements && block.elements.some((el: any) => el.type === 'test') && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 Доступна проверка знаний. Пройдите тест для закрепления материала.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // Fallback: обычный рендеринг
    return renderOriginalContent()
  }

  // Рендеринг оригинального контента
  const renderOriginalContent = () => {
    if (!originalContent || !originalContent.blocks || originalContent.blocks.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Оригинальный контент недоступен</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {originalContent.blocks.map((block, index) => (
          <Card key={index} className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">{block.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                <p className="text-[#1E293B] leading-relaxed whitespace-pre-wrap">{block.content}</p>
              </div>
              {/* Отображение тестов из элементов блока (если есть) */}
              {block.elements && block.elements.length > 0 && (
                <div className="mt-6 space-y-4">
                  {block.elements.map((element: any, elementIndex: number) => {
                    if (element.type === 'test' && element.content) {
                      try {
                        const testData = JSON.parse(element.content)
                        return (
                          <div key={elementIndex} className="mt-6">
                            <h4 className="text-lg font-semibold text-[#1E293B] mb-4">Тест</h4>
                            <TestPlayer
                              testData={testData}
                              onComplete={(result) => {
                                recordInteraction('test_complete', { elementId: element.id, result })
                              }}
                              studentId={isStudent ? undefined : undefined}
                            />
                            {/* Добавляем озвучку для аудиалов, если режим не оригинал */}
                            {mode === 'auditory' && (
                              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-700 mb-2">
                                  💡 Для лучшего восприятия вы можете прослушать текст теста
                                </p>
                                <AudioPlayer
                                  data={{
                                    text: `${testData.question} ${testData.answers.map((a: any) => a.text).join('. ')}`,
                                    duration: Math.ceil((testData.question.length + testData.answers.reduce((sum: number, a: any) => sum + a.text.length, 0)) / 10),
                                    format: 'mp3'
                                  }}
                                  description="Озвучка текста теста"
                                  onInteraction={recordInteraction}
                                />
                              </div>
                            )}
                          </div>
                        )
                      } catch (err) {
                        console.error('Error parsing test data:', err)
                        return null
                      }
                    }
                    return null
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Базовое отображение при недостатке материалов или отсутствии адаптации
  const renderBasicContentOld = () => {
    const missingMaterials = materialsAnalysis?.recommendations || []
    const showRecommendations = !isStudent && missingMaterials.length > 0

    // Для студентов показываем подсказку о недоступности адаптации
    if (isStudent && mode !== 'original' && !adaptedContent) {
      return (
        <div className="space-y-6">
          {/* Показываем оригинальный контент */}
          {renderOriginalContent()}

          {/* Показываем подсказку для студентов */}
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LightbulbIcon className="w-5 h-5 text-slate-600" />
                <CardTitle className="text-slate-800">
                  Адаптированный контент недоступен
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-slate-700">
                  Для этого урока еще не создана адаптация в режиме "{mode === 'visual' ? 'Визуал' : mode === 'auditory' ? 'Аудиал' : 'Кинестетик'}".
                </p>
                <p className="text-slate-600 text-sm">
                  Вы можете просмотреть оригинальный контент автора выше или переключиться на другой режим.
                </p>
                <div className="bg-white border border-slate-300 rounded-lg p-3 mt-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    💡 Что делать:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                    <li>Используйте оригинальный контент автора (режим "Оригинал")</li>
                    <li>Попробуйте другой режим адаптации (если доступен)</li>
                    <li>Свяжитесь с автором курса, чтобы узнать о планах по адаптации</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Для авторов показываем рекомендации
    return (
      <div className="space-y-6">
        {/* Показываем оригинальный контент */}
        {renderOriginalContent()}

        {/* Показываем рекомендации для автора (только для автора, не для студента) */}
        {showRecommendations && (
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <LightbulbIcon className="w-5 h-5" />
                Рекомендации по улучшению контента
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {missingMaterials.map((rec: any, index: number) => {
                  const priority = rec.priority || 'medium'
                  // Все плашки с рекомендациями теперь желтые
                  const priorityColors = {
                    high: 'text-yellow-800 bg-yellow-50 border-yellow-200',
                    medium: 'text-yellow-800 bg-yellow-50 border-yellow-200',
                    low: 'text-yellow-800 bg-yellow-50 border-yellow-200'
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border ${priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium}`}
                    >
                      <div className="flex items-start gap-2">
                        <LightbulbIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{rec.message}</p>
                          {rec.type && (
                            <p className="text-xs mt-1 opacity-75">
                              Тип материала: {rec.type === 'audio' ? 'Аудио' : rec.type === 'visual' ? 'Визуальный' : rec.type === 'practice' ? 'Практика' : rec.type}
                            </p>
                          )}
                        </div>
                        {priority === 'high' && (
                          <Badge className="bg-yellow-600 text-white text-xs">Важно</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Старая функция renderBlock для совместимости (будет удалена после миграции)
  const renderBlock = (blockId: string, blockData: any, blockNumber: number) => {
    const isExpanded = expandedBlocks.includes(blockId)
    const isCompleted = completedBlocks.includes(blockId)
    
    return (
      <Card
        key={blockId}
        className={`border ${
          isCompleted
            ? 'border-[#10B981] bg-green-50'
            : 'border-[#E5E7EB]'
        }`}
      >
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleBlockExpansion(blockId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                isCompleted ? 'bg-[#10B981]' : 'bg-[#659AB8]'
              }`}>
                {isCompleted ? <CheckIcon className="w-4 h-4" /> : blockNumber}
              </div>
              <div>
                <CardTitle className="text-lg text-[#1E293B]">
                  {blockData.title}
                </CardTitle>
                {isStudent && (
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleBlockCompletion(blockId)}
                      className="data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981]"
                    />
                    <span className="text-sm text-[#64748B]">
                      {isCompleted ? 'Завершено' : 'Отметить как завершенное'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#659AB8] hover:text-[#5a8ba8]"
            >
              {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Контент блока */}
              {blockData.content && (
                <div className="text-[#1E293B] leading-relaxed">
                  {blockData.content}
                </div>
              )}

              {/* Списки */}
              {blockData.items && (
                <ul className="space-y-2">
                  {blockData.items.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#659AB8] mt-2 flex-shrink-0" />
                      <span className="text-[#1E293B]">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Секции */}
              {blockData.sections && (
                <div className="space-y-4">
                  {blockData.sections.map((section: any, index: number) => (
                    <div key={index} className="p-4 bg-[#F3FAFE] rounded-lg border border-[#CDE6F9]">
                      <h4 className="font-semibold text-[#1E293B] mb-2">{section.title}</h4>
                      <p className="text-[#64748B]">{section.content}</p>
                      
                      {/* Интерактивные кнопки для кинестетиков */}
                      {normalizedType === 'kinesthetic' && section.interactiveButtons && (
                        <div className="mt-3 space-y-2">
                          {section.interactiveButtons.map((btn: any, btnIndex: number) => (
                            <Button
                              key={btnIndex}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B] hover:text-white"
                              onClick={() => recordInteraction('interactive_button', { buttonText: btn.text, sectionTitle: section.title })}
                            >
                              <HandIcon className="w-4 h-4 mr-2" />
                              {btn.text}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Соотнесение понятий */}
              {blockData.pairs && (
                <ConceptMatching 
                  pairs={blockData.pairs} 
                  studentType={normalizedType}
                  onInteraction={recordInteraction}
                />
              )}

              {/* Аудио элементы для аудиалов */}
              {normalizedType === 'auditory' && blockData.atmosphericText && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <VolumeIcon className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Аудио-элемент</span>
                  </div>
                  <p className="text-green-700 italic">{blockData.atmosphericText}</p>
                  {isStudent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-green-300 text-green-700 hover:bg-green-100"
                      onClick={() => recordInteraction('audio_play', { text: blockData.atmosphericText })}
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Воспроизвести
                    </Button>
                  )}
                </div>
              )}

              {/* Чек-лист для кинестетиков */}
              {normalizedType === 'kinesthetic' && blockData.checklist && (
                <div className="space-y-2">
                  <h4 className="font-medium text-[#1E293B]">Чек-лист:</h4>
                  {blockData.checklist.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Checkbox
                        className="data-[state=checked]:bg-[#F59E0B] data-[state=checked]:border-[#F59E0B]"
                        onCheckedChange={(checked) => recordInteraction('checklist_item', { item: item.item, checked, index })}
                      />
                      <span className="text-[#1E293B]">{item.item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Схема урока */}
              {blockData.elements && (
                <div className="p-4 bg-[#F3FAFE] rounded-lg border border-[#CDE6F9]">
                  <h4 className="font-medium text-[#1E293B] mb-3">Схема урока:</h4>
                  {blockData.description && (
                    <p className="text-[#64748B] mb-4">{blockData.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {blockData.elements.map((element: string, index: number) => (
                      <div key={index} className="p-3 bg-white rounded-lg border border-[#CDE6F9] text-center">
                        <div className="w-8 h-8 bg-[#659AB8] text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                          {index + 1}
                        </div>
                        <span className="text-[#1E293B] text-sm">{element}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Практические задания */}
              {blockData.practiceTasks && (
                <div className="space-y-4">
                  <h4 className="font-medium text-[#1E293B]">Практические задания:</h4>
                  {blockData.practiceTasks.map((task: any, index: number) => (
                    <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h5 className="font-medium text-orange-800 mb-2">{task.title}</h5>
                      <p className="text-orange-700 mb-3">{task.description}</p>
                      {isStudent && (
                        <div className="space-y-2">
                          <textarea
                            placeholder="Введите ваш ответ..."
                            className="w-full p-3 border border-orange-300 rounded-lg resize-none"
                            rows={3}
                            value={userAnswers[`task_${index}`] || ''}
                            onChange={(e) => {
                              setUserAnswers(prev => ({
                                ...prev,
                                [`task_${index}`]: e.target.value
                              }))
                              recordInteraction('practice_answer', { taskIndex: index, answer: e.target.value })
                            }}
                          />
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() => recordInteraction('practice_save', { taskIndex: index })}
                          >
                            Сохранить ответ
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Тесты */}
              {blockData.tests && (
                <div className="space-y-4">
                  <h4 className="font-medium text-[#1E293B]">Тестирование:</h4>
                  {blockData.tests.map((test: any, testIndex: number) => (
                    <div key={testIndex} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-3">{test.question}</h5>
                      <div className="space-y-2">
                        {test.options.map((option: string, optionIndex: number) => (
                          <label key={optionIndex} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`test_${testIndex}`}
                              value={option}
                              className="text-blue-600"
                              onChange={(e) => {
                                setUserAnswers(prev => ({
                                  ...prev,
                                  [`test_${testIndex}`]: e.target.value
                                }))
                                recordInteraction('test_answer', { testIndex, answer: e.target.value })
                              }}
                            />
                            <span className="text-blue-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Голосовое резюме для аудиалов */}
              {normalizedType === 'auditory' && blockData.voiceSummary && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Голосовое резюме:</h4>
                  <p className="text-green-700 italic">{blockData.voiceSummary}</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  // Вспомогательная функция для проверки, что блок не пустой
  const isBlockValid = (block: any): boolean => {
    if (!block) return false
    if (typeof block !== 'object') return false
    
    // Проверяем, что блок имеет хотя бы одно из обязательных полей
    const hasIntro = block.intro && (
      (typeof block.intro === 'string' && block.intro.trim().length > 0) ||
      (typeof block.intro === 'object' && block.intro.text && block.intro.text.trim().length > 0)
    )
    
    const hasContent = block.content && (
      (typeof block.content === 'string' && block.content.trim().length > 0) ||
      (typeof block.content === 'object' && (
        (block.content.title && block.content.title.trim().length > 0) ||
        (block.content.text && block.content.text.trim().length > 0) ||
        (block.content.sections && Array.isArray(block.content.sections) && block.content.sections.length > 0) ||
        (block.content.elements && Array.isArray(block.content.elements) && block.content.elements.length > 0)
      ))
    )
    
    const hasAdaptation = block.adaptation && (
      (typeof block.adaptation === 'object' && block.adaptation.element && (
        block.adaptation.element.type ||
        (block.adaptation.element.data && Object.keys(block.adaptation.element.data).length > 0) ||
        (block.adaptation.element.description && block.adaptation.element.description.trim().length > 0)
      ))
    )
    
    return !!(hasIntro || hasContent || hasAdaptation)
  }

  // Определяем, что показывать
  // Используем localAdaptedContent для inline-редактирования, иначе adaptedContent
  const contentToDisplay = isEditing ? localAdaptedContent : adaptedContent

  // Для режима 'original' показываем адаптацию (5 блоков), если она есть, иначе показываем исходные блоки
  // Проверяем, что адаптация существует И что хотя бы один блок не пустой
  const hasValidAdaptedContent = contentToDisplay && (
    isBlockValid(contentToDisplay.block1) ||
    isBlockValid(contentToDisplay.block2) ||
    isBlockValid(contentToDisplay.block3) ||
    isBlockValid(contentToDisplay.block4) ||
    isBlockValid(contentToDisplay.block5)
  )

  // Для автора (не студента) показываем адаптацию, даже если блоки пустые, чтобы он мог видеть структуру
  const showAdaptedContent = !!(
    (hasValidAdaptedContent || (!isStudent && contentToDisplay)) &&
    !showBasicContent
  ) // Показываем адаптацию, если она есть и не нужно базовое отображение

  const showOriginalContent = mode === 'original' && !hasValidAdaptedContent && originalContent && !showBasicContent // Для 'original' без адаптации показываем исходные блоки
  // showBasicContent уже определен выше через shouldShowBasicContent()

  // Логирование для отладки (только в режиме разработки)
  if (process.env.NODE_ENV === 'development' && contentToDisplay) {
    console.log('🔍 [UnifiedAdaptation] Content check:', {
      mode,
      isStudent,
      isEditing,
      hasAdaptedContent: !!contentToDisplay,
      hasValidAdaptedContent,
      showAdaptedContent,
      showOriginalContent,
      showBasicContent,
      block1Valid: isBlockValid(contentToDisplay.block1),
      block2Valid: isBlockValid(contentToDisplay.block2),
      block3Valid: isBlockValid(contentToDisplay.block3),
      block4Valid: isBlockValid(contentToDisplay.block4),
      block5Valid: isBlockValid(contentToDisplay.block5),
      hasOriginalContent: !!originalContent,
      originalBlocksCount: originalContent?.blocks?.length || 0
    })
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с режимом представления материала */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={presentationModeInfo.color}>
            {presentationModeInfo.icon}
            <span className="ml-2">{presentationModeInfo.name}</span>
          </Badge>
          <span className="text-sm text-[#64748B]">{presentationModeInfo.description}</span>
        </div>
        
        {isStudent && (
          <div className="flex items-center gap-4 text-sm text-[#64748B]">
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{Math.floor(progress.timeSpent / 60)}м {progress.timeSpent % 60}с</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSaveProgress?.(progress)}
              className="border-[#659AB8] text-[#659AB8] hover:bg-[#659AB8] hover:text-white"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Сохранить
            </Button>
          </div>
        )}
      </div>

      {/* Прогресс-бар для студентов */}
      {isStudent && (
        <div className="p-4 bg-white rounded-lg border border-[#CDE6F9]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#1E293B]">Прогресс урока</span>
            <span className="text-sm text-[#64748B]">
              {Math.floor((Date.now() - startTime) / 1000)}с
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Завершено блоков</span>
              <span className="text-sm font-medium text-[#659AB8]">
                {completedBlocks.length} из {showAdaptedContent ? 5 : (originalContent?.blocks?.length || 0)}
              </span>
            </div>
            <Progress 
              value={
                showAdaptedContent 
                  ? (completedBlocks.length / 5) * 100
                  : originalContent?.blocks?.length 
                    ? (completedBlocks.length / originalContent.blocks.length) * 100
                    : 0
              } 
              className="h-2 bg-[#F3FAFE]"
            />
          </div>
        </div>
      )}

      {/* Блоки контента */}
      {/* Приоритет: адаптированный контент > базовый контент при недостатке материалов > оригинальный контент */}
      {showAdaptedContent && contentToDisplay ? (
        <div className="space-y-4">
          {/* В режиме редактирования показываем все блоки, даже пустые */}
          {(isEditing || isBlockValid(contentToDisplay.block1)) && renderAdaptationBlock('block1', contentToDisplay.block1, 1)}
          {(isEditing || isBlockValid(contentToDisplay.block2)) && renderAdaptationBlock('block2', contentToDisplay.block2, 2)}
          {(isEditing || isBlockValid(contentToDisplay.block3)) && renderAdaptationBlock('block3', contentToDisplay.block3, 3)}
          {(isEditing || isBlockValid(contentToDisplay.block4)) && renderAdaptationBlock('block4', contentToDisplay.block4, 4)}
          {(isEditing || isBlockValid(contentToDisplay.block5)) && renderAdaptationBlock('block5', contentToDisplay.block5, 5)}
          {/* Если все блоки пустые и не в режиме редактирования, показываем сообщение */}
          {!isEditing && !isBlockValid(contentToDisplay.block1) && !isBlockValid(contentToDisplay.block2) && !isBlockValid(contentToDisplay.block3) && !isBlockValid(contentToDisplay.block4) && !isBlockValid(contentToDisplay.block5) && (
            <div className="p-8 text-center text-gray-500">
              <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2">Адаптация создана, но контент пуст</p>
              <p className="text-sm">Попробуйте перегенерировать адаптацию или обратитесь к администратору</p>
            </div>
          )}
        </div>
      ) : showBasicContent ? (
        renderBasicContent()
      ) : showOriginalContent ? (
        renderOriginalContent()
      ) : null}

      {/* Сообщение, если контент отсутствует */}
      {!showAdaptedContent && !showOriginalContent && !showBasicContent && (
        <div className="p-8 text-center text-gray-500">
          <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Контент недоступен</p>
        </div>
      )}
    </div>
  )
}

// Компонент для соотнесения понятий
function ConceptMatching({ 
  pairs, 
  studentType, 
  onInteraction 
}: { 
  pairs: any[], 
  studentType: string, 
  onInteraction: (type: string, data?: any) => void 
}) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<{[key: string]: string}>({})
  const [shuffledLeft, setShuffledLeft] = useState<string[]>([])
  const [shuffledRight, setShuffledRight] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    // Перемешиваем понятия и определения отдельно
    const leftItems = pairs.map(p => p.left)
    const rightItems = pairs.map(p => p.right)
    setShuffledLeft([...leftItems].sort(() => Math.random() - 0.5))
    setShuffledRight([...rightItems].sort(() => Math.random() - 0.5))
  }, [pairs])

  const handleLeftSelection = (left: string) => {
    if (matchedPairs[left]) return // Уже сопоставлено
    
    if (selectedLeft === left) {
      setSelectedLeft(null)
    } else {
      setSelectedLeft(left)
      setSelectedRight(null) // Сбрасываем правый выбор
    }
  }

  const handleRightSelection = (right: string) => {
    if (Object.values(matchedPairs).includes(right)) return // Уже сопоставлено
    
    if (selectedRight === right) {
      setSelectedRight(null)
    } else {
      setSelectedRight(right)
      
      // Если есть выбранное левое понятие, проверяем соответствие
      if (selectedLeft) {
        const correctPair = pairs.find(p => p.left === selectedLeft && p.right === right)
        if (correctPair) {
          // Правильное сопоставление
          setMatchedPairs(prev => ({ ...prev, [selectedLeft]: right }))
          onInteraction('correct_match', { left: selectedLeft, right })
        } else {
          // Неправильное сопоставление
          onInteraction('incorrect_match', { left: selectedLeft, right })
        }
        setSelectedLeft(null)
        setSelectedRight(null)
      }
    }
  }

  const isMatched = (left: string) => matchedPairs[left]
  const isRightMatched = (right: string) => Object.values(matchedPairs).includes(right)
  const isLeftSelected = (left: string) => selectedLeft === left
  const isRightSelected = (right: string) => selectedRight === right

  const getLeftButtonClass = (left: string) => {
    if (isMatched(left)) return 'border-[#10B981] bg-green-50 text-[#10B981]'
    if (isLeftSelected(left)) return 'border-[#659AB8] bg-[#CDE6F9] text-[#659AB8]'
    return 'border-[#CDE6F9] bg-white text-[#1E293B] hover:border-[#659AB8]/40'
  }

  const getRightButtonClass = (right: string) => {
    if (isRightMatched(right)) return 'border-[#10B981] bg-green-50 text-[#10B981]'
    if (isRightSelected(right)) return 'border-[#659AB8] bg-[#CDE6F9] text-[#659AB8]'
    return 'border-[#CDE6F9] bg-white text-[#1E293B] hover:border-[#659AB8]/40'
  }

  const checkCompletion = () => {
    if (Object.keys(matchedPairs).length === pairs.length) {
      setShowResult(true)
      onInteraction('matching_completed', { totalPairs: pairs.length })
    }
  }

  useEffect(() => {
    checkCompletion()
  }, [matchedPairs, pairs.length])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[#1E293B]">Соотнесение понятий:</h4>
        <div className="text-sm text-[#64748B]">
          {Object.keys(matchedPairs).length} из {pairs.length} сопоставлено
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Левая колонка - Понятия */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-[#64748B] mb-3">Понятия:</h5>
          {shuffledLeft.map((left, index) => (
            <button
              key={`left-${index}`}
              onClick={() => handleLeftSelection(left)}
              disabled={isMatched(left)}
              className={`w-full p-3 text-left rounded-lg border-2 transition-colors duration-200 ${
                getLeftButtonClass(left)
              }`}
            >
              {left}
            </button>
          ))}
        </div>

        {/* Правая колонка - Определения */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-[#64748B] mb-3">Определения:</h5>
          {shuffledRight.map((right, index) => (
            <button
              key={`right-${index}`}
              onClick={() => handleRightSelection(right)}
              disabled={isRightMatched(right)}
              className={`w-full p-3 text-left rounded-lg border-2 transition-colors duration-200 ${
                getRightButtonClass(right)
              }`}
            >
              {right}
            </button>
          ))}
        </div>
      </div>

      {/* Инструкция */}
      <div className="p-3 bg-[#F3FAFE] rounded-lg border border-[#CDE6F9]">
        <p className="text-sm text-[#64748B]">
          <strong>Инструкция:</strong> Выберите понятие слева, затем соответствующее ему определение справа. 
          Правильные пары будут выделены зеленым цветом.
        </p>
      </div>

      {/* Результат */}
      {showResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              Отлично! Все понятия соотнесены правильно.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
