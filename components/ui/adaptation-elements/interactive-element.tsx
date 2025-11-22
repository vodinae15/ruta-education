"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HandIcon, CheckIcon, XIcon, PlayIcon, PauseIcon, AlertTriangleIcon } from "@/components/ui/icons"

interface InteractiveElementProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

interface DragDropPair {
  leftId: string
  rightId: string
  isCorrect: boolean
}

export function InteractiveElement({ data, description, onInteraction }: InteractiveElementProps) {
  const [interactionState, setInteractionState] = useState<any>({})
  
  // Состояние для drag-drop
  const [draggedItem, setDraggedItem] = useState<{id: string, type: 'left' | 'right'} | null>(null)
  const [pairs, setPairs] = useState<DragDropPair[]>([])
  const [leftItems, setLeftItems] = useState<any[]>([])
  const [rightItems, setRightItems] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  
  // Состояние для diagram-labeling
  const [diagramLabels, setDiagramLabels] = useState<any[]>([])
  const [labelPlacements, setLabelPlacements] = useState<Record<string, string>>({}) // nodeId -> labelId
  const [showDiagramResults, setShowDiagramResults] = useState(false)
  
  // Состояние для classification
  const [classificationItems, setClassificationItems] = useState<any[]>([])
  const [itemClassifications, setItemClassifications] = useState<Record<string, string>>({}) // itemId -> categoryId
  const [showClassificationResults, setShowClassificationResults] = useState(false)
  
  // Состояние для assembly
  const [assemblyParts, setAssemblyParts] = useState<any[]>([])
  const [placedParts, setPlacedParts] = useState<Record<string, {x: number, y: number}>>({}) // partId -> position
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [stepFeedback, setStepFeedback] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  
  // Состояние для audio-dialog
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [pauseTimeLeft, setPauseTimeLeft] = useState<number>(0)
  const [showAnswer, setShowAnswer] = useState<boolean>(false)
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set())
  
  // Состояние для diagram-builder
  const [diagramNodes, setDiagramNodes] = useState<any[]>([]) // Размещенные узлы на схеме
  const [diagramConnections, setDiagramConnections] = useState<any[]>([]) // Соединения между узлами
  const [selectedNode, setSelectedNode] = useState<string | null>(null) // Выбранный узел для соединения
  const [showDiagramValidation, setShowDiagramValidation] = useState<boolean>(false)
  
  // Состояние для audio-recording
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [notes, setNotes] = useState<string>('')
  
  // Состояние для product-creation
  const [productComponents, setProductComponents] = useState<any[]>([]) // Использованные компоненты
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({}) // Состояние чек-листа
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({}) // Ответы на рефлексию
  const [showReflection, setShowReflection] = useState<boolean>(false)
  const [showValidation, setShowValidation] = useState<boolean>(false)
  
  // Состояние для touch-событий (мобильные устройства) - для drag-drop
  const [touchStartItem, setTouchStartItem] = useState<{id: string, type: 'left' | 'right', element: any} | null>(null)
  const [touchTargetItem, setTouchTargetItem] = useState<{id: string, type: 'left' | 'right', element: any} | null>(null)

  const handleInteraction = (action: string, value?: any) => {
    const newState = {
      ...interactionState,
      [action]: value || true
    }
    setInteractionState(newState)
    onInteraction?.('interactive_element', { action, value, state: newState })
  }

  // Инициализация данных для drag-drop
  const initializeDragDrop = useCallback(() => {
    if (data?.type === 'drag-drop' || data?.type === 'drag-and-drop') {
      const left = data.leftItems || data.items || []
      const right = data.rightItems || []
      const correctPairs = data.correctPairs || []
      
      setLeftItems(left)
      setRightItems(right)
      setPairs([])
      setShowResults(false)
      
      // Сохраняем правильные пары для валидации
      setInteractionState((prev: any) => ({
        ...prev,
        correctPairs: correctPairs
      }))
    }
  }, [data])

  // Инициализация при монтировании или изменении данных
  useEffect(() => {
    initializeDragDrop()
    
    // Инициализация для diagram-labeling
    if (data?.type === 'diagram-labeling') {
      const labels = data.labels || []
      if (labels.length > 0) {
        setDiagramLabels(labels)
        setLabelPlacements({})
        setShowDiagramResults(false)
      }
    }
    
    // Инициализация для classification
    if (data?.type === 'classification') {
      const items = data.items || []
      if (items.length > 0) {
        setClassificationItems(items)
        setItemClassifications({})
        setShowClassificationResults(false)
      }
    }
    
    // Инициализация для assembly
    if (data?.type === 'assembly') {
      const parts = data.parts || []
      if (parts.length > 0) {
        setAssemblyParts(parts)
        setPlacedParts({})
        setCurrentStep(1)
        setStepFeedback(null)
        setCompletedSteps(new Set())
      }
    }
    
    // Инициализация для audio-dialog
    if (data?.type === 'audio-dialog') {
      const questions = data.questions || []
      if (questions.length > 0) {
        setCurrentQuestionIndex(0)
        setIsPaused(false)
        setPauseTimeLeft(0)
        setShowAnswer(false)
        setCompletedQuestions(new Set())
      }
    }
    
    // Инициализация для diagram-builder
    if (data?.type === 'diagram-builder') {
      const template = data.template
      if (template) {
        setDiagramNodes(template.nodes || [])
        setDiagramConnections(template.connections || [])
      } else {
        setDiagramNodes([])
        setDiagramConnections([])
      }
      setSelectedNode(null)
      setShowDiagramValidation(false)
    }
    
    // Инициализация для audio-recording
    if (data?.type === 'audio-recording') {
      setIsRecording(false)
      setRecordedAudio(null)
      setAudioUrl(null)
      setRecordingTime(0)
      setNotes('')
    }
    
    // Инициализация для product-creation
    if (data?.type === 'product-creation') {
      setProductComponents([])
      const checklist = data.checklist || []
      const initialChecklist: Record<string, boolean> = {}
      checklist.forEach((item: any) => {
        initialChecklist[item.id || item] = item.completed || false
      })
      setChecklistItems(initialChecklist)
      setReflectionAnswers({})
      setShowReflection(false)
      setShowValidation(false)
    }
  }, [initializeDragDrop, data])
  
  // Эффект для таймера записи
  useEffect(() => {
    if (isRecording && data?.type === 'audio-recording' && mediaRecorder) {
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          const maxDuration = data.maxDuration || 300
          if (prev >= maxDuration) {
            // Останавливаем запись при достижении лимита
            if (mediaRecorder && isRecording) {
              mediaRecorder.stop()
              setIsRecording(false)
              setMediaRecorder(null)
            }
            return maxDuration
          }
          return prev + 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isRecording, data?.type, data?.maxDuration, mediaRecorder])
  
  // Эффект для таймера паузы в audio-dialog
  useEffect(() => {
    if (data?.type === 'audio-dialog' && isPaused && pauseTimeLeft > 0) {
      const timer = setInterval(() => {
        setPauseTimeLeft(prev => {
          if (prev <= 1) {
            setIsPaused(false)
            setShowAnswer(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [data?.type, isPaused, pauseTimeLeft])

  return (
    <Card className="bg-white border-2 border-purple-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-purple-700">
            <HandIcon className="w-5 h-5" />
            <span className="font-semibold">Интерактивный элемент</span>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 italic">{description}</p>
          )}

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            {/* Поддержка обоих вариантов для обратной совместимости. Предпочтительный: "drag-drop" */}
            {(data?.type === 'drag-drop' || data?.type === 'drag-and-drop') && (() => {
              // Fallback для некорректных данных
              if (!data.leftItems || !Array.isArray(data.leftItems) || data.leftItems.length === 0) {
                return (
                  <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                    <div className="flex items-start gap-3">
                      <AlertTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 mb-1">Ошибка: отсутствуют элементы слева</p>
                        <p className="text-sm text-yellow-800">
                          Для drag-drop задания необходимо наличие элементов в leftItems. Пожалуйста, пересоздайте адаптацию.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              if (!data.rightItems || !Array.isArray(data.rightItems) || data.rightItems.length === 0) {
                return (
                  <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                    <div className="flex items-start gap-3">
                      <AlertTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 mb-1">Ошибка: отсутствуют элементы справа</p>
                        <p className="text-sm text-yellow-800">
                          Для drag-drop задания необходимо наличие элементов в rightItems. Пожалуйста, пересоздайте адаптацию.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              const correctPairs = interactionState.correctPairs || data?.correctPairs || []
              
              // Получаем оставшиеся элементы (не в парах)
              const usedLeftIds = pairs.map(p => p.leftId)
              const usedRightIds = pairs.map(p => p.rightId)
              const availableLeftItems = leftItems.filter(item => !usedLeftIds.includes(item.id || item))
              const availableRightItems = rightItems.filter(item => !usedRightIds.includes(item.id || item))

              // Подсчет результатов
              const correctCount = pairs.filter(p => p.isCorrect).length
              const totalCount = correctPairs.length
              const isComplete = pairs.length === totalCount && availableLeftItems.length === 0 && availableRightItems.length === 0

              // Обработчики drag-and-drop (для десктопа)
              const handleDragStart = (e: React.DragEvent, item: any, type: 'left' | 'right') => {
                setDraggedItem({ id: item.id || item, type })
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id || item, text: item.text || item.label || item, type }))
              }

              const handleDragOver = (e: React.DragEvent) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }

              const handleDrop = (e: React.DragEvent, targetItem: any, targetType: 'left' | 'right') => {
                e.preventDefault()
                
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'))
                
                // Проверяем, что перетаскиваем из противоположной колонки
                if (draggedData.type === targetType) return

                // Определяем ID элементов
                const leftId = draggedData.type === 'left' ? draggedData.id : (targetItem.id || targetItem)
                const rightId = draggedData.type === 'right' ? draggedData.id : (targetItem.id || targetItem)

                // Проверяем, не создана ли уже пара с этими элементами
                const existingPair = pairs.find(p => 
                  (p.leftId === leftId && p.rightId === rightId) ||
                  (p.leftId === leftId || p.rightId === rightId)
                )
                if (existingPair) return

                // Проверяем правильность пары
                const isCorrect = correctPairs.some((pair: any) => 
                  pair.leftId === leftId && pair.rightId === rightId
                )

                // Создаем новую пару
                const newPair: DragDropPair = {
                  leftId,
                  rightId,
                  isCorrect
                }

                setPairs(prev => {
                  const updatedPairs = [...prev, newPair]
                  
                  // Обновляем списки доступных элементов
                  setLeftItems(prevLeft => prevLeft.filter(item => (item.id || item) !== leftId))
                  setRightItems(prevRight => prevRight.filter(item => (item.id || item) !== rightId))
                  
                  // Отправляем результат
                  onInteraction?.('drag_drop_pair', {
                    leftId,
                    rightId,
                    isCorrect,
                    totalPairs: updatedPairs.length,
                    correctPairs: updatedPairs.filter(p => p.isCorrect).length
                  })
                  
                  return updatedPairs
                })
                
                setDraggedItem(null)
              }

              // Обработчики touch-событий (для мобильных устройств)
              const handleTouchStart = (e: React.TouchEvent, item: any, type: 'left' | 'right') => {
                e.preventDefault()
                setTouchStartItem({ id: item.id || item, type, element: item })
              }

              const handleTouchMove = (e: React.TouchEvent) => {
                e.preventDefault()
                // Находим элемент под пальцем
                const touch = e.touches[0]
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)
                if (targetElement) {
                  const itemElement = targetElement.closest('[data-item-id]')
                  if (itemElement) {
                    const itemId = itemElement.getAttribute('data-item-id')
                    const itemType = itemElement.getAttribute('data-item-type') as 'left' | 'right'
                    const itemData = itemType === 'left' 
                      ? availableLeftItems.find((i: any) => (i.id || i) === itemId)
                      : availableRightItems.find((i: any) => (i.id || i) === itemId)
                    
                    if (itemData && touchStartItem && touchStartItem.type !== itemType) {
                      setTouchTargetItem({ id: itemId || '', type: itemType, element: itemData })
                    }
                  }
                }
              }

              const handleTouchEnd = (e: React.TouchEvent) => {
                e.preventDefault()
                
                if (!touchStartItem) return

                // Находим элемент под пальцем
                const touch = e.changedTouches[0]
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)
                
                if (targetElement) {
                  const itemElement = targetElement.closest('[data-item-id]')
                  if (itemElement) {
                    const targetId = itemElement.getAttribute('data-item-id')
                    const targetType = itemElement.getAttribute('data-item-type') as 'left' | 'right'
                    
                    // Проверяем, что перетаскиваем из противоположной колонки
                    if (touchStartItem.type === targetType) {
                      setTouchStartItem(null)
                      setTouchTargetItem(null)
                      return
                    }

                    // Определяем ID элементов
                    const leftId = touchStartItem.type === 'left' ? touchStartItem.id : targetId
                    const rightId = touchStartItem.type === 'right' ? touchStartItem.id : targetId

                    // Проверяем, не создана ли уже пара с этими элементами
                    const existingPair = pairs.find(p => 
                      (p.leftId === leftId && p.rightId === rightId) ||
                      (p.leftId === leftId || p.rightId === rightId)
                    )
                    if (existingPair) {
                      setTouchStartItem(null)
                      setTouchTargetItem(null)
                      return
                    }

                    // Проверяем правильность пары
                    const isCorrect = correctPairs.some((pair: any) => 
                      pair.leftId === leftId && pair.rightId === rightId
                    )

                    // Создаем новую пару
                    const newPair: DragDropPair = {
                      leftId,
                      rightId,
                      isCorrect
                    }

                    setPairs(prev => {
                      const updatedPairs = [...prev, newPair]
                      
                      // Обновляем списки доступных элементов
                      setLeftItems(prevLeft => prevLeft.filter(item => (item.id || item) !== leftId))
                      setRightItems(prevRight => prevRight.filter(item => (item.id || item) !== rightId))
                      
                      // Отправляем результат
                      onInteraction?.('drag_drop_pair', {
                        leftId,
                        rightId,
                        isCorrect,
                        totalPairs: updatedPairs.length,
                        correctPairs: updatedPairs.filter(p => p.isCorrect).length
                      })
                      
                      return updatedPairs
                    })
                  }
                }
                
                setTouchStartItem(null)
                setTouchTargetItem(null)
              }

              const handleRemovePair = (pair: DragDropPair) => {
                setPairs(prev => prev.filter(p => p !== pair))
                
                // Возвращаем элементы в списки из исходных данных
                const allLeftItems = data.leftItems || data.items || []
                const allRightItems = data.rightItems || []
                
                const leftItem = allLeftItems.find((item: any) => (item.id || item) === pair.leftId) || 
                               { id: pair.leftId, text: pair.leftId }
                const rightItem = allRightItems.find((item: any) => (item.id || item) === pair.rightId) || 
                                { id: pair.rightId, text: pair.rightId }
                
                setLeftItems(prev => [...prev, leftItem])
                setRightItems(prev => [...prev, rightItem])
              }

              const handleCheckResults = () => {
                setShowResults(true)
                const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0
                const isAllCorrect = correctCount === totalCount && pairs.length === totalCount
                
                // Сохраняем результат в состояние
                setInteractionState((prev: any) => ({
                  ...prev,
                  dragDropResult: {
                    totalPairs: pairs.length,
                    correctPairs: correctCount,
                    incorrectPairs: pairs.length - correctCount,
                    isComplete,
                    accuracy,
                    isAllCorrect,
                    timestamp: new Date().toISOString()
                  }
                }))
                
                onInteraction?.('drag_drop_complete', {
                  totalPairs: pairs.length,
                  correctPairs: correctCount,
                  incorrectPairs: pairs.length - correctCount,
                  isComplete,
                  accuracy,
                  isAllCorrect,
                  timestamp: new Date().toISOString()
                })
              }

              const handleReset = () => {
                initializeDragDrop()
                setShowResults(false)
                onInteraction?.('drag_drop_reset', {})
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">Задание: Перетащите элементы для сопоставления</p>
                    {isComplete && (
                      <Button
                        onClick={handleCheckResults}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Проверить
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Левая колонка - понятия */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Понятия:</p>
                      <div className="min-h-[200px] space-y-2">
                        {availableLeftItems.map((item: any, index: number) => {
                          const itemId = item.id || item
                          const itemText = item.text || item.label || item
                          const isTouching = touchStartItem?.id === itemId && touchStartItem.type === 'left'
                          return (
                            <div
                              key={itemId || index}
                              data-item-id={itemId}
                              data-item-type="left"
                              draggable
                              onDragStart={(e) => handleDragStart(e, item, 'left')}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, item, 'left')}
                              onTouchStart={(e) => handleTouchStart(e, item, 'left')}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              className={`p-3 bg-white border-2 border-purple-300 rounded-lg cursor-move hover:bg-purple-50 hover:border-purple-400 transition-colors touch-none select-none ${
                                isTouching ? 'bg-purple-100 border-purple-500 scale-105' : ''
                              }`}
                              style={{ touchAction: 'none' }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{itemText}</span>
                                <HandIcon className="w-4 h-4 text-purple-500" />
                              </div>
                            </div>
                          )
                        })}
                        {availableLeftItems.length === 0 && (
                          <div className="p-4 text-center text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                            Все элементы использованы
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Правая колонка - определения */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Определения:</p>
                      <div className="min-h-[200px] space-y-2">
                        {availableRightItems.map((item: any, index: number) => {
                          const itemId = item.id || item
                          const itemText = item.text || item.label || item
                          const isTouching = touchStartItem?.id === itemId && touchStartItem.type === 'right'
                          return (
                            <div
                              key={itemId || index}
                              data-item-id={itemId}
                              data-item-type="right"
                              draggable
                              onDragStart={(e) => handleDragStart(e, item, 'right')}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, item, 'right')}
                              onTouchStart={(e) => handleTouchStart(e, item, 'right')}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              className={`p-3 bg-white border-2 border-green-300 rounded-lg cursor-move hover:bg-green-50 hover:border-green-400 transition-colors touch-none select-none ${
                                isTouching ? 'bg-green-100 border-green-500 scale-105' : ''
                              }`}
                              style={{ touchAction: 'none' }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{itemText}</span>
                                <HandIcon className="w-4 h-4 text-green-500" />
                              </div>
                            </div>
                          )
                        })}
                        {availableRightItems.length === 0 && (
                          <div className="p-4 text-center text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                            Все элементы использованы
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Область для создания пар */}
                  {pairs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Созданные пары:</p>
                      <div className="space-y-2">
                        {pairs.map((pair, index) => {
                          // Ищем элементы в исходных данных
                          const allLeftItems = data.leftItems || data.items || []
                          const allRightItems = data.rightItems || []
                          
                          const leftItem = allLeftItems.find((item: any) => (item.id || item) === pair.leftId) || 
                                         { id: pair.leftId, text: pair.leftId }
                          const rightItem = allRightItems.find((item: any) => (item.id || item) === pair.rightId) || 
                                          { id: pair.rightId, text: pair.rightId }
                          
                          const leftText = leftItem.text || leftItem.label || leftItem.id || leftItem
                          const rightText = rightItem.text || rightItem.label || rightItem.id || rightItem

                          return (
                            <div
                              key={`${pair.leftId}-${pair.rightId}-${index}`}
                              className={`p-3 rounded-lg border-2 flex items-center justify-between ${
                                showResults
                                  ? pair.isCorrect
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-red-50 border-red-500'
                                  : 'bg-white border-purple-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm font-medium text-gray-700">{leftText}</span>
                                <span className="text-purple-500">→</span>
                                <span className="text-sm text-gray-700">{rightText}</span>
                                {showResults && (
                                  <span className="ml-2">
                                    {pair.isCorrect ? (
                                      <CheckIcon className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <XIcon className="w-5 h-5 text-red-600" />
                                    )}
                                  </span>
                                )}
                              </div>
                              {!showResults && (
                                <Button
                                  onClick={() => handleRemovePair(pair)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Удалить
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Результаты с детальной обратной связью */}
                  {showResults && (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${
                      correctCount === totalCount
                        ? 'bg-green-50 border-green-500'
                        : correctCount > 0
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {correctCount === totalCount ? (
                            <CheckIcon className="w-6 h-6 text-green-600" />
                          ) : (
                            <XIcon className="w-6 h-6 text-red-600" />
                          )}
                          <p className="text-sm font-semibold text-gray-900">
                            Результат: {correctCount} из {totalCount} правильно
                          </p>
                        </div>
                        <span className={`text-lg font-bold ${
                          correctCount === totalCount ? 'text-green-600' : 
                          correctCount > 0 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0}%
                        </span>
                      </div>
                      
                      {correctCount === totalCount ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-800">🎉 Отлично! Все пары сопоставлены правильно!</p>
                          <p className="text-xs text-green-700">
                            Вы успешно выполнили задание. Все понятия правильно сопоставлены с определениями.
                          </p>
                        </div>
                      ) : correctCount > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-yellow-800">
                            Частично правильно: {correctCount} из {totalCount} пар верны
                          </p>
                          <p className="text-xs text-yellow-700">
                            Проверьте неправильные пары (отмечены красным цветом) и попробуйте исправить их. 
                            Правильные пары отмечены зеленым цветом.
                          </p>
                          {pairs.filter(p => !p.isCorrect).length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                              <p className="text-xs font-medium text-red-800 mb-1">Неправильные пары:</p>
                              <ul className="text-xs text-red-700 space-y-1">
                                {pairs.filter(p => !p.isCorrect).map((pair, idx) => {
                                  const allLeftItems = data.leftItems || data.items || []
                                  const allRightItems = data.rightItems || []
                                  const leftItem = allLeftItems.find((item: any) => (item.id || item) === pair.leftId)
                                  const rightItem = allRightItems.find((item: any) => (item.id || item) === pair.rightId)
                                  const leftText = leftItem?.text || leftItem?.label || pair.leftId
                                  const rightText = rightItem?.text || rightItem?.label || pair.rightId
                                  return (
                                    <li key={idx}>• {leftText} → {rightText}</li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-red-800">
                            Нет правильных ответов
                          </p>
                          <p className="text-xs text-red-700">
                            Все пары сопоставлены неправильно. Попробуйте еще раз, внимательно изучив материал.
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={handleReset}
                        size="sm"
                        variant="outline"
                        className="mt-3 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Начать заново
                      </Button>
                    </div>
                  )}

                  {/* Статистика */}
                  {!showResults && pairs.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Создано пар: {pairs.length} из {totalCount}
                    </div>
                  )}
                </div>
              )
            })()}

            {data?.type === 'button' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-900 mb-2">{data.label || 'Интерактивная кнопка'}</p>
                <Button
                  onClick={() => handleInteraction('button_click', data.action)}
                  variant="outline"
                  className="border-purple-500 text-purple-700 hover:bg-purple-50"
                >
                  {data.buttonText || 'Нажмите'}
                </Button>
                {interactionState.button_click && (
                  <p className="text-sm text-gray-600 mt-2">{data.result || 'Действие выполнено'}</p>
                )}
              </div>
            )}

            {data?.buttons && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-900 mb-2">Интерактивные кнопки:</p>
                <div className="flex flex-wrap gap-2">
                  {data.buttons.map((button: any, index: number) => (
                    <Button
                      key={index}
                      onClick={() => handleInteraction('button_click', button.action)}
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                    >
                      {button.label || button.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Поддержка типа "diagram-labeling" - маркировка схемы */}
            {data?.type === 'diagram-labeling' && (() => {
              // Инициализация данных
              const diagram = data.diagram || { nodes: [], connections: [] }
              const labels = data.labels || []
              const correctPositions = data.correctPositions || []
              
              // Получаем узлы с размещенными метками
              const nodesWithLabels = diagram.nodes?.map((node: any) => {
                const labelId = labelPlacements[node.id || node]
                const label = labels.find((l: any) => (l.id || l) === labelId)
                return {
                  ...node,
                  placedLabel: label,
                  labelId: labelId
                }
              }) || []
              
              // Получаем неиспользованные метки
              const usedLabelIds = Object.values(labelPlacements)
              const availableLabels = diagramLabels.filter((label: any) => 
                !usedLabelIds.includes(label.id || label)
              )
              
              // Подсчет результатов
              const correctCount = correctPositions.filter((pos: any) => 
                labelPlacements[pos.nodeId] === pos.labelId
              ).length
              const totalCount = correctPositions.length
              const isComplete = Object.keys(labelPlacements).length === totalCount && availableLabels.length === 0
              
              // Обработчики drag-and-drop для меток
              const handleLabelDragStart = (e: React.DragEvent, label: any) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', JSON.stringify({ 
                  type: 'label', 
                  id: label.id || label,
                  text: label.text || label.label || label
                }))
              }
              
              const handleNodeDragOver = (e: React.DragEvent) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }
              
              const handleNodeDrop = (e: React.DragEvent, node: any) => {
                e.preventDefault()
                
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (draggedData.type !== 'label') return
                
                const nodeId = node.id || node
                const labelId = draggedData.id
                
                // Проверяем, не размещена ли уже метка на этом узле
                if (labelPlacements[nodeId]) {
                  // Удаляем старую метку и возвращаем её в список
                  const oldLabelId = labelPlacements[nodeId]
                  setDiagramLabels(prev => {
                    const oldLabel = labels.find((l: any) => (l.id || l) === oldLabelId)
                    return oldLabel ? [...prev, oldLabel] : prev
                  })
                }
                
                // Размещаем новую метку
                setLabelPlacements(prev => ({
                  ...prev,
                  [nodeId]: labelId
                }))
                
                // Удаляем метку из списка доступных
                setDiagramLabels(prev => prev.filter((l: any) => (l.id || l) !== labelId))
                
                // Отправляем событие
                const isCorrect = correctPositions.some((pos: any) => 
                  pos.nodeId === nodeId && pos.labelId === labelId
                )
                
                onInteraction?.('diagram_label_placed', {
                  nodeId,
                  labelId,
                  isCorrect,
                  totalPlaced: Object.keys(labelPlacements).length + 1
                })
              }
              
              const handleRemoveLabel = (nodeId: string) => {
                const labelId = labelPlacements[nodeId]
                if (!labelId) return
                
                // Возвращаем метку в список
                const label = labels.find((l: any) => (l.id || l) === labelId)
                if (label) {
                  setDiagramLabels(prev => [...prev, label])
                }
                
                // Удаляем размещение
                setLabelPlacements(prev => {
                  const newPlacements = { ...prev }
                  delete newPlacements[nodeId]
                  return newPlacements
                })
              }
              
              const handleCheckDiagramResults = () => {
                setShowDiagramResults(true)
                
                const correctCount = correctPositions.filter((pos: any) => 
                  labelPlacements[pos.nodeId] === pos.labelId
                ).length
                
                onInteraction?.('diagram_labeling_complete', {
                  totalNodes: totalCount,
                  correctPlacements: correctCount,
                  incorrectPlacements: totalCount - correctCount,
                  accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0
                })
              }
              
              const handleResetDiagram = () => {
                setDiagramLabels(labels)
                setLabelPlacements({})
                setShowDiagramResults(false)
                onInteraction?.('diagram_labeling_reset', {})
              }
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">
                      Задание: Разместите метки на схеме в правильных местах
                    </p>
                    {isComplete && !showDiagramResults && (
                      <Button
                        onClick={handleCheckDiagramResults}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Проверить
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Схема с узлами */}
                    <div className="lg:col-span-2 space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Схема:</p>
                      <div className="bg-white p-4 rounded-lg border-2 border-blue-200 min-h-[300px]">
                        {nodesWithLabels.length > 0 ? (
                          <div className="space-y-3">
                            {nodesWithLabels.map((node: any, index: number) => {
                              const nodeId = node.id || node
                              const isCorrect = showDiagramResults && correctPositions.some((pos: any) => 
                                pos.nodeId === nodeId && pos.labelId === node.labelId
                              )
                              const isIncorrect = showDiagramResults && node.labelId && !isCorrect
                              
                              return (
                                <div
                                  key={nodeId || index}
                                  onDragOver={handleNodeDragOver}
                                  onDrop={(e) => handleNodeDrop(e, node)}
                                  className={`p-4 rounded-lg border-2 transition-colors ${
                                    showDiagramResults
                                      ? isCorrect
                                        ? 'bg-green-50 border-green-500'
                                        : isIncorrect
                                        ? 'bg-red-50 border-red-500'
                                        : 'bg-gray-50 border-gray-300'
                                      : node.placedLabel
                                      ? 'bg-blue-50 border-blue-400'
                                      : 'bg-blue-50 border-blue-300 hover:border-blue-400 cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                        showDiagramResults
                                          ? isCorrect
                                            ? 'bg-green-600 text-white'
                                            : isIncorrect
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-400 text-white'
                                          : 'bg-blue-600 text-white'
                                      }`}>
                                        {index + 1}
                                      </div>
                                      <div className="flex-1">
                                        {node.placedLabel ? (
                                          <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                              {node.placedLabel.text || node.placedLabel.label || node.placedLabel}
                                            </p>
                                            {node.label && (
                                              <p className="text-xs text-gray-500 mt-1">{node.label}</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="text-sm text-gray-500 italic">
                                              Перетащите метку сюда
                                            </p>
                                            {node.label && (
                                              <p className="text-xs text-gray-400 mt-1">{node.label}</p>
                                            )}
                                          </div>
                                        )}
                                        {node.description && (
                                          <p className="text-xs text-gray-600 mt-1">{node.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    {showDiagramResults && node.labelId && (
                                      <span className="ml-2">
                                        {isCorrect ? (
                                          <CheckIcon className="w-5 h-5 text-green-600" />
                                        ) : (
                                          <XIcon className="w-5 h-5 text-red-600" />
                                        )}
                                      </span>
                                    )}
                                    {!showDiagramResults && node.placedLabel && (
                                      <Button
                                        onClick={() => handleRemoveLabel(nodeId)}
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        Удалить
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            Схема не загружена
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Список меток для перетаскивания */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Метки:</p>
                      <div className="bg-white p-3 rounded-lg border-2 border-purple-200 min-h-[300px]">
                        {availableLabels.length > 0 ? (
                          <div className="space-y-2">
                            {availableLabels.map((label: any, index: number) => {
                              const labelId = label.id || label
                              const labelText = label.text || label.label || label
                              return (
                                <div
                                  key={labelId || index}
                                  draggable
                                  onDragStart={(e) => handleLabelDragStart(e, label)}
                                  className="p-3 bg-purple-50 border-2 border-purple-300 rounded-lg cursor-move hover:bg-purple-100 hover:border-purple-400 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{labelText}</span>
                                    <HandIcon className="w-4 h-4 text-purple-500" />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-sm text-gray-500 py-8">
                            Все метки размещены
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Результаты */}
                  {showDiagramResults && (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${
                      correctCount === totalCount
                        ? 'bg-green-50 border-green-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          Результат: {correctCount} из {totalCount} правильно
                        </p>
                        <span className={`text-lg font-bold ${
                          correctCount === totalCount ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0}%
                        </span>
                      </div>
                      {correctCount === totalCount ? (
                        <p className="text-sm text-green-700">🎉 Отлично! Все метки размещены правильно!</p>
                      ) : (
                        <p className="text-sm text-yellow-700">
                          Есть ошибки. Проверьте неправильные размещения и попробуйте снова.
                        </p>
                      )}
                      <Button
                        onClick={handleResetDiagram}
                        size="sm"
                        variant="outline"
                        className="mt-3 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Начать заново
                      </Button>
                    </div>
                  )}
                  
                  {/* Статистика */}
                  {!showDiagramResults && Object.keys(labelPlacements).length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Размещено меток: {Object.keys(labelPlacements).length} из {totalCount}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Поддержка типа "classification" - визуальная классификация */}
            {data?.type === 'classification' && (() => {
              const items = data.items || []
              const categories = data.categories || []
              const correctClassification = data.correctClassification || []
              
              // Получаем неклассифицированные элементы
              const classifiedItemIds = Object.keys(itemClassifications)
              const allItems = items.length > 0 ? items : classificationItems
              const unclassifiedItems = allItems.filter((item: any) => 
                !classifiedItemIds.includes(item.id || item)
              )
              
              // Группируем элементы по категориям
              const itemsByCategory = categories.map((category: any) => {
                const categoryId = category.id || category
                const categoryItems = allItems.filter((item: any) => 
                  itemClassifications[item.id || item] === categoryId
                )
                return {
                  ...category,
                  items: categoryItems
                }
              })
              
              // Подсчет результатов
              const correctCount = correctClassification.filter((classification: any) => 
                itemClassifications[classification.itemId] === classification.categoryId
              ).length
              const totalCount = correctClassification.length
              const isComplete = classifiedItemIds.length === totalCount && unclassifiedItems.length === 0
              
              // Обработчики drag-and-drop для классификации
              const handleItemDragStart = (e: React.DragEvent, item: any) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', JSON.stringify({ 
                  type: 'classification-item', 
                  id: item.id || item,
                  text: item.text || item.label || item
                }))
              }
              
              const handleCategoryDragOver = (e: React.DragEvent) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }
              
              const handleCategoryDrop = (e: React.DragEvent, category: any) => {
                e.preventDefault()
                
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (draggedData.type !== 'classification-item') return
                
                const itemId = draggedData.id
                const categoryId = category.id || category
                
                // Если элемент уже классифицирован в эту же категорию, ничего не делаем
                if (itemClassifications[itemId] === categoryId) return
                
                // Классифицируем элемент (если уже был в другой категории, перемещаем)
                setItemClassifications(prev => ({
                  ...prev,
                  [itemId]: categoryId
                }))
                
                // Отправляем событие
                const isCorrect = correctClassification.some((classification: any) => 
                  classification.itemId === itemId && classification.categoryId === categoryId
                )
                
                onInteraction?.('classification_item_placed', {
                  itemId,
                  categoryId,
                  isCorrect,
                  totalClassified: Object.keys(itemClassifications).length + (itemClassifications[itemId] ? 0 : 1)
                })
              }
              
              const handleRemoveClassification = (itemId: string) => {
                setItemClassifications(prev => {
                  const newClassifications = { ...prev }
                  delete newClassifications[itemId]
                  return newClassifications
                })
              }
              
              const handleCheckClassificationResults = () => {
                setShowClassificationResults(true)
                
                const correctCount = correctClassification.filter((classification: any) => 
                  itemClassifications[classification.itemId] === classification.categoryId
                ).length
                
                onInteraction?.('classification_complete', {
                  totalItems: totalCount,
                  correctClassifications: correctCount,
                  incorrectClassifications: totalCount - correctCount,
                  accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0
                })
              }
              
              const handleResetClassification = () => {
                const itemsToReset = items.length > 0 ? items : classificationItems
                setClassificationItems(itemsToReset)
                setItemClassifications({})
                setShowClassificationResults(false)
                onInteraction?.('classification_reset', {})
              }
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">
                      Задание: Классифицируйте элементы по категориям
                    </p>
                    {isComplete && !showClassificationResults && (
                      <Button
                        onClick={handleCheckClassificationResults}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Проверить
                      </Button>
                    )}
                  </div>
                  
                  {/* Неклассифицированные элементы */}
                  {unclassifiedItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Элементы для классификации:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {unclassifiedItems.map((item: any, index: number) => {
                          const itemId = item.id || item
                          const itemText = item.text || item.label || item
                          const itemImage = item.image
                          
                          return (
                            <div
                              key={itemId || index}
                              draggable
                              onDragStart={(e) => handleItemDragStart(e, item)}
                              className="p-3 bg-white border-2 border-purple-300 rounded-lg cursor-move hover:bg-purple-50 hover:border-purple-400 transition-colors"
                            >
                              {itemImage && (
                                <img 
                                  src={itemImage} 
                                  alt={itemText}
                                  className="w-full h-24 object-cover rounded mb-2"
                                />
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700 text-center flex-1">{itemText}</span>
                                <HandIcon className="w-4 h-4 text-purple-500 ml-2" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Категории с размещенными элементами */}
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Категории:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {itemsByCategory.map((category: any, categoryIndex: number) => {
                        const categoryId = category.id || category
                        const categoryName = category.name || category.label || category
                        const categoryColor = category.color || '#8B5CF6'
                        
                        // Проверяем правильность элементов в категории
                        const categoryItemsWithValidation = category.items.map((item: any) => {
                          const itemId = item.id || item
                          const isCorrect = showClassificationResults && correctClassification.some((classification: any) => 
                            classification.itemId === itemId && classification.categoryId === categoryId
                          )
                          const isIncorrect = showClassificationResults && !isCorrect && itemClassifications[itemId] === categoryId
                          return {
                            ...item,
                            isCorrect,
                            isIncorrect
                          }
                        })
                        
                        return (
                          <div
                            key={categoryId || categoryIndex}
                            onDragOver={handleCategoryDragOver}
                            onDrop={(e) => handleCategoryDrop(e, category)}
                            className="p-4 rounded-lg border-2 min-h-[200px] transition-colors bg-gray-50"
                            style={{
                              borderColor: categoryColor || '#D1D5DB'
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 
                                className="text-sm font-semibold"
                                style={{ color: categoryColor }}
                              >
                                {categoryName}
                              </h4>
                              {category.items.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {category.items.length}
                                </span>
                              )}
                            </div>
                            
                            {categoryItemsWithValidation.length > 0 ? (
                              <div className="space-y-2">
                                {categoryItemsWithValidation.map((item: any, itemIndex: number) => {
                                  const itemId = item.id || item
                                  const itemText = item.text || item.label || item
                                  const itemImage = item.image
                                  
                                  return (
                                    <div
                                      key={itemId || itemIndex}
                                      className={`p-2 rounded border-2 flex items-center justify-between ${
                                        showClassificationResults
                                          ? item.isCorrect
                                            ? 'bg-green-50 border-green-500'
                                            : item.isIncorrect
                                            ? 'bg-red-50 border-red-500'
                                            : 'bg-white border-gray-300'
                                          : 'bg-white border-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        {itemImage && (
                                          <img 
                                            src={itemImage} 
                                            alt={itemText}
                                            className="w-8 h-8 object-cover rounded"
                                          />
                                        )}
                                        <span className="text-xs text-gray-700 flex-1">{itemText}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {showClassificationResults && item.isCorrect && (
                                          <CheckIcon className="w-4 h-4 text-green-600" />
                                        )}
                                        {showClassificationResults && item.isIncorrect && (
                                          <XIcon className="w-4 h-4 text-red-600" />
                                        )}
                                        {!showClassificationResults && (
                                          <Button
                                            onClick={() => handleRemoveClassification(itemId)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <XIcon className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed rounded"
                                   style={{ borderColor: categoryColor }}>
                                Перетащите элементы сюда
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Результаты */}
                  {showClassificationResults && (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${
                      correctCount === totalCount
                        ? 'bg-green-50 border-green-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          Результат: {correctCount} из {totalCount} правильно
                        </p>
                        <span className={`text-lg font-bold ${
                          correctCount === totalCount ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0}%
                        </span>
                      </div>
                      {correctCount === totalCount ? (
                        <p className="text-sm text-green-700">🎉 Отлично! Все элементы классифицированы правильно!</p>
                      ) : (
                        <p className="text-sm text-yellow-700">
                          Есть ошибки. Проверьте неправильные классификации и попробуйте снова.
                        </p>
                      )}
                      <Button
                        onClick={handleResetClassification}
                        size="sm"
                        variant="outline"
                        className="mt-3 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Начать заново
                      </Button>
                    </div>
                  )}
                  
                  {/* Статистика */}
                  {!showClassificationResults && classifiedItemIds.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Классифицировано элементов: {classifiedItemIds.length} из {totalCount}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Поддержка типа "assembly" - пошаговое упражнение "Собери сам" */}
            {data?.type === 'assembly' && (() => {
              const workspace = data.workspace || { width: 600, height: 400 }
              const parts = data.parts || []
              const steps = data.steps || []
              
              // Получаем текущий шаг
              const currentStepData = steps.find((s: any) => s.stepNumber === currentStep)
              
              // Получаем части для текущего шага
              const currentStepPartId = currentStepData?.partId
              const availableParts = parts.filter((part: any) => {
                const partId = part.id || part
                // Показываем части, которые еще не размещены, или часть для текущего шага
                return !placedParts[partId] || partId === currentStepPartId
              })
              
              // Получаем размещенные части
              const placedPartsList = Object.keys(placedParts).map(partId => {
                const part = parts.find((p: any) => (p.id || p) === partId)
                return {
                  ...part,
                  position: placedParts[partId]
                }
              })
              
              // Обработчики drag-and-drop для сборки
              const handlePartDragStart = (e: React.DragEvent, part: any) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', JSON.stringify({ 
                  type: 'assembly-part', 
                  id: part.id || part,
                  label: part.label || part
                }))
              }
              
              const handleWorkspaceDragOver = (e: React.DragEvent) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }
              
              const handleWorkspaceDrop = (e: React.DragEvent) => {
                e.preventDefault()
                
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (draggedData.type !== 'assembly-part') return
                
                const partId = draggedData.id
                const part = parts.find((p: any) => (p.id || p) === partId)
                if (!part) return
                
                // Получаем позицию клика относительно рабочей области
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top
                
                // Проверяем правильность размещения (с допуском 50px)
                const correctPos = part.correctPosition || { x: 0, y: 0 }
                const distance = Math.sqrt(
                  Math.pow(x - correctPos.x, 2) + Math.pow(y - correctPos.y, 2)
                )
                const isCorrect = distance < 50 // Допуск 50 пикселей
                
                // Размещаем часть
                setPlacedParts(prev => ({
                  ...prev,
                  [partId]: { x, y }
                }))
                
                // Проверяем, является ли это частью текущего шага
                if (currentStepData && currentStepData.partId === partId) {
                  // Показываем обратную связь
                  const feedback = isCorrect 
                    ? currentStepData.feedback || `Отлично! Часть "${part.label || part}" размещена правильно.`
                    : `Часть размещена не совсем точно. ${part.hint || 'Попробуйте переместить её в правильное место.'}`
                  
                  setStepFeedback(feedback)
                  
                  // Если правильно, отмечаем шаг как выполненный
                  if (isCorrect) {
                    setCompletedSteps(prev => new Set([...prev, currentStep]))
                    
                    // Переходим к следующему шагу через 2 секунды
                    setTimeout(() => {
                      if (currentStep < steps.length) {
                        setCurrentStep(prev => prev + 1)
                        setStepFeedback(null)
                      }
                    }, 2000)
                  }
                }
                
                // Отправляем событие
                onInteraction?.('assembly_part_placed', {
                  partId,
                  position: { x, y },
                  isCorrect,
                  stepNumber: currentStep,
                  completedSteps: completedSteps.size + (isCorrect && currentStepData?.partId === partId ? 1 : 0)
                })
              }
              
              const handleRemovePart = (partId: string) => {
                setPlacedParts(prev => {
                  const newPlaced = { ...prev }
                  delete newPlaced[partId]
                  return newPlaced
                })
                setStepFeedback(null)
              }
              
              const handleNextStep = () => {
                if (currentStep < steps.length) {
                  setCurrentStep(prev => prev + 1)
                  setStepFeedback(null)
                }
              }
              
              const handlePreviousStep = () => {
                if (currentStep > 1) {
                  setCurrentStep(prev => prev - 1)
                  setStepFeedback(null)
                }
              }
              
              const handleResetAssembly = () => {
                setPlacedParts({})
                setCurrentStep(1)
                setStepFeedback(null)
                setCompletedSteps(new Set())
                onInteraction?.('assembly_reset', {})
              }
              
              const isStepCompleted = completedSteps.has(currentStep)
              const allStepsCompleted = completedSteps.size === steps.length
              
              // Отправляем событие завершения при завершении всех шагов
              useEffect(() => {
                if (allStepsCompleted && steps.length > 0) {
                  onInteraction?.('assembly_complete', {
                    totalSteps: steps.length,
                    completedSteps: completedSteps.size,
                    isAllCorrect: true,
                    accuracy: 100,
                    timestamp: new Date().toISOString()
                  })
                }
              }, [allStepsCompleted, steps.length, completedSteps.size, onInteraction])
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">
                      Задание: Соберите модель по шагам
                    </p>
                    {allStepsCompleted && (
                      <Button
                        onClick={handleResetAssembly}
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Начать заново
                      </Button>
                    )}
                  </div>
                  
                  {/* Пошаговые инструкции */}
                  {currentStepData && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            {currentStep}
                          </span>
                          <span className="text-sm font-semibold text-blue-900">
                            Шаг {currentStep} из {steps.length}
                          </span>
                          {isStepCompleted && (
                            <CheckIcon className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div className="flex gap-2">
                          {currentStep > 1 && (
                            <Button
                              onClick={handlePreviousStep}
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              ← Назад
                            </Button>
                          )}
                          {currentStep < steps.length && isStepCompleted && (
                            <Button
                              onClick={handleNextStep}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Далее →
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-blue-800 mb-2">{currentStepData.instruction}</p>
                      {stepFeedback && (
                        <div className={`mt-2 p-2 rounded ${
                          isStepCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <p className="text-xs">{stepFeedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Рабочая область */}
                    <div className="lg:col-span-2 space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Рабочая область:</p>
                      <div
                        onDragOver={handleWorkspaceDragOver}
                        onDrop={handleWorkspaceDrop}
                        className="bg-white border-2 border-purple-300 rounded-lg relative"
                        style={{
                          width: `${workspace.width}px`,
                          height: `${workspace.height}px`,
                          minHeight: '400px'
                        }}
                      >
                        {/* Размещенные части */}
                        {placedPartsList.map((part: any) => {
                          const partId = part.id || part
                          const position = part.position || { x: 0, y: 0 }
                          const correctPos = part.correctPosition || { x: 0, y: 0 }
                          const distance = Math.sqrt(
                            Math.pow(position.x - correctPos.x, 2) + Math.pow(position.y - correctPos.y, 2)
                          )
                          const isCorrect = distance < 50
                          
                          return (
                            <div
                              key={partId}
                              className="absolute cursor-move"
                              style={{
                                left: `${position.x}px`,
                                top: `${position.y}px`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <div className={`p-3 bg-white border-2 rounded-lg ${
                                isCorrect ? 'border-green-500' : 'border-purple-400'
                              }`}>
                                <p className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                  {part.label || part}
                                </p>
                                {part.function && (
                                  <p className="text-xs text-gray-500 mt-1">{part.function}</p>
                                )}
                              </div>
                              {!allStepsCompleted && (
                                <Button
                                  onClick={() => handleRemovePart(partId)}
                                  size="sm"
                                  variant="ghost"
                                  className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white hover:bg-red-600 rounded-full"
                                >
                                  <XIcon className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )
                        })}
                        
                        {/* Подсказка для пустой области */}
                        {placedPartsList.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-gray-400 text-center">
                              Перетащите части сюда
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Части для сборки */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Части для сборки:</p>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {availableParts.map((part: any, index: number) => {
                          const partId = part.id || part
                          const isPlaced = placedParts[partId]
                          const isCurrentStepPart = currentStepData?.partId === partId
                          
                          return (
                            <div
                              key={partId || index}
                              draggable={!isPlaced}
                              onDragStart={(e) => !isPlaced && handlePartDragStart(e, part)}
                              className={`p-3 rounded-lg border-2 ${
                                isPlaced
                                  ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                                  : isCurrentStepPart
                                  ? 'bg-purple-50 border-purple-400 cursor-move hover:bg-purple-100'
                                  : 'bg-white border-purple-300 cursor-move hover:bg-purple-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${
                                    isCurrentStepPart ? 'text-purple-900' : 'text-gray-700'
                                  }`}>
                                    {part.label || part}
                                  </p>
                                  {part.function && (
                                    <p className="text-xs text-gray-500 mt-1">{part.function}</p>
                                  )}
                                  {isCurrentStepPart && !isPlaced && (
                                    <p className="text-xs text-purple-600 mt-1 font-semibold">
                                      ← Текущий шаг
                                    </p>
                                  )}
                                </div>
                                {!isPlaced && (
                                  <HandIcon className="w-4 h-4 text-purple-500 ml-2" />
                                )}
                                {isPlaced && (
                                  <CheckIcon className="w-4 h-4 text-green-600 ml-2" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Прогресс */}
                  {steps.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Прогресс сборки:</p>
                        <span className="text-sm font-semibold text-purple-700">
                          {completedSteps.size} / {steps.length} шагов
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Завершение */}
                  {allStepsCompleted && (
                    <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckIcon className="w-6 h-6 text-green-600" />
                        <p className="text-sm font-semibold text-green-900">
                          🎉 Поздравляем! Модель собрана!
                        </p>
                      </div>
                      <p className="text-sm text-green-700">
                        Вы успешно выполнили все шаги сборки.
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Поддержка типа "audio-dialog" - интерактивный аудио-диалог */}
            {data?.type === 'audio-dialog' && (() => {
              const questions = data.questions || []
              const currentQuestion = questions[currentQuestionIndex]
              const format = data.format || 'mp3'
              const totalDuration = data.totalDuration || 0
              
              const handleStartPause = () => {
                if (currentQuestion) {
                  const pauseDuration = currentQuestion.pauseDuration || 10
                  setIsPaused(true)
                  setPauseTimeLeft(pauseDuration)
                  setShowAnswer(false)
                  onInteraction?.('audio_dialog_pause_started', {
                    questionId: currentQuestion.id,
                    pauseDuration
                  })
                }
              }
              
              const handleShowAnswer = () => {
                setShowAnswer(true)
                setIsPaused(false)
                setPauseTimeLeft(0)
                onInteraction?.('audio_dialog_answer_shown', {
                  questionId: currentQuestion.id
                })
              }
              
              const handleNextQuestion = () => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1)
                  setIsPaused(false)
                  setPauseTimeLeft(0)
                  setShowAnswer(false)
                  setCompletedQuestions(prev => new Set([...prev, currentQuestionIndex]))
                  onInteraction?.('audio_dialog_next_question', {
                    currentIndex: currentQuestionIndex,
                    nextIndex: currentQuestionIndex + 1
                  })
                } else {
                  // Завершение диалога
                  setCompletedQuestions(prev => new Set([...prev, currentQuestionIndex]))
                  onInteraction?.('audio_dialog_complete', {
                    totalQuestions: questions.length,
                    completedQuestions: completedQuestions.size + 1
                  })
                }
              }
              
              const handlePreviousQuestion = () => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(prev => prev - 1)
                  setIsPaused(false)
                  setPauseTimeLeft(0)
                  setShowAnswer(false)
                }
              }
              
              const handleResetDialog = () => {
                setCurrentQuestionIndex(0)
                setIsPaused(false)
                setPauseTimeLeft(0)
                setShowAnswer(false)
                setCompletedQuestions(new Set())
                onInteraction?.('audio_dialog_reset', {})
              }
              
              const isLastQuestion = currentQuestionIndex === questions.length - 1
              const allQuestionsCompleted = completedQuestions.size === questions.length
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-green-900">
                      Аудио-диалог: Вопросы с паузами для ответа
                    </p>
                    {allQuestionsCompleted && (
                      <Button
                        onClick={handleResetDialog}
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        Начать заново
                      </Button>
                    )}
                  </div>
                  
                  {/* Прогресс */}
                  {questions.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Вопрос {currentQuestionIndex + 1} из {questions.length}</p>
                        <span className="text-sm font-semibold text-green-700">
                          Завершено: {completedQuestions.size} / {questions.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Текущий вопрос */}
                  {currentQuestion && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                            {currentQuestionIndex + 1}
                          </span>
                          <span className="text-sm font-semibold text-green-900">Вопрос</span>
                        </div>
                        <div className="flex gap-2">
                          {currentQuestionIndex > 0 && (
                            <Button
                              onClick={handlePreviousQuestion}
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                            >
                              ← Назад
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Текст вопроса */}
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-800 leading-relaxed">{currentQuestion.text}</p>
                      </div>
                      
                      {/* Подсказка (если есть) */}
                      {currentQuestion.hint && !showAnswer && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-800">
                            💡 Подсказка: {currentQuestion.hint}
                          </p>
                        </div>
                      )}
                      
                      {/* Пауза для ответа */}
                      {!isPaused && !showAnswer && (
                        <div className="flex items-center justify-center">
                          <Button
                            onClick={handleStartPause}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Начать паузу для ответа ({currentQuestion.pauseDuration || 10} сек)
                          </Button>
                        </div>
                      )}
                      
                      {/* Таймер паузы */}
                      {isPaused && (
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
                          <div className="mb-4">
                            <div className="text-4xl font-bold text-blue-600 mb-2">
                              {pauseTimeLeft}
                            </div>
                            <p className="text-sm text-blue-800">
                              Подумайте над ответом...
                            </p>
                          </div>
                          <Button
                            onClick={handleShowAnswer}
                            size="sm"
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            Показать ответ сейчас
                          </Button>
                        </div>
                      )}
                      
                      {/* Ответ и объяснение */}
                      {showAnswer && currentQuestion.answer && (
                        <div className="bg-white border-2 border-green-400 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckIcon className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-semibold text-green-900">Ответ:</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <p className="text-sm text-gray-800 font-medium mb-2">
                              {currentQuestion.answer.text}
                            </p>
                            {currentQuestion.answer.explanation && (
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {currentQuestion.answer.explanation}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={handleNextQuestion}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isLastQuestion ? 'Завершить' : 'Следующий вопрос →'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Завершение диалога */}
                  {allQuestionsCompleted && (
                    <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckIcon className="w-6 h-6 text-green-600" />
                        <p className="text-sm font-semibold text-green-900">
                          🎉 Поздравляем! Вы завершили аудио-диалог!
                        </p>
                      </div>
                      <p className="text-sm text-green-700">
                        Вы ответили на все вопросы. Отличная работа!
                      </p>
                    </div>
                  )}
                  
                  {/* Информация о формате */}
                  {format && totalDuration > 0 && (
                    <div className="text-xs text-gray-500 text-center">
                      Формат: {format.toUpperCase()} | Общая длительность: {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Поддержка типа "diagram-builder" - конструктор схемы */}
            {data?.type === 'diagram-builder' && (() => {
              const elements = data.elements || []
              const concepts = data.concepts || []
              const validation = data.validation || { requiredConcepts: [], minNodes: 0, minConnections: 0 }
              const template = data.template
              
              // Разделяем элементы на узлы и соединения
              const nodeElements = elements.filter((el: any) => el.type === 'node')
              const connectionElements = elements.filter((el: any) => el.type === 'connection')
              
              // Обработчики для конструктора схемы
              const handleElementDragStart = (e: React.DragEvent, element: any) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', JSON.stringify({ 
                  type: 'diagram-element', 
                  id: element.id || element,
                  elementType: element.type,
                  label: element.label || element
                }))
              }
              
              const handleWorkspaceDragOver = (e: React.DragEvent) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }
              
              const handleWorkspaceDrop = (e: React.DragEvent) => {
                e.preventDefault()
                
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (draggedData.type !== 'diagram-element') return
                
                // Получаем позицию клика относительно рабочей области
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top
                
                // Если это узел, добавляем его на схему
                if (draggedData.elementType === 'node') {
                  const newNode = {
                    id: `node-${Date.now()}`,
                    type: 'node',
                    label: draggedData.label,
                    position: { x, y },
                    conceptId: null as string | null
                  }
                  
                  setDiagramNodes(prev => [...prev, newNode])
                  
                  onInteraction?.('diagram_builder_node_added', {
                    nodeId: newNode.id,
                    position: { x, y },
                    totalNodes: diagramNodes.length + 1
                  })
                }
              }
              
              const handleNodeClick = (nodeId: string) => {
                if (selectedNode === nodeId) {
                  setSelectedNode(null)
                } else if (selectedNode) {
                  // Создаем соединение между выбранным узлом и текущим
                  const connection = {
                    id: `connection-${Date.now()}`,
                    from: selectedNode,
                    to: nodeId,
                    type: 'connection'
                  }
                  
                  setDiagramConnections(prev => [...prev, connection])
                  setSelectedNode(null)
                  
                  onInteraction?.('diagram_builder_connection_added', {
                    connectionId: connection.id,
                    from: selectedNode,
                    to: nodeId,
                    totalConnections: diagramConnections.length + 1
                  })
                } else {
                  setSelectedNode(nodeId)
                }
              }
              
              const handleNodeDelete = (nodeId: string) => {
                setDiagramNodes(prev => prev.filter(n => n.id !== nodeId))
                setDiagramConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId))
                if (selectedNode === nodeId) {
                  setSelectedNode(null)
                }
              }
              
              const handleConceptAssign = (nodeId: string, conceptId: string) => {
                setDiagramNodes(prev => prev.map(node => 
                  node.id === nodeId ? { ...node, conceptId } : node
                ))
              }
              
              const handleValidateDiagram = () => {
                setShowDiagramValidation(true)
                
                // Проверка валидации
                const usedConcepts = diagramNodes
                  .filter(n => n.conceptId)
                  .map(n => n.conceptId)
                const requiredConcepts = validation.requiredConcepts || []
                const hasRequiredConcepts = requiredConcepts.every((conceptId: string) => 
                  usedConcepts.includes(conceptId)
                )
                const hasMinNodes = diagramNodes.length >= (validation.minNodes || 0)
                const hasMinConnections = diagramConnections.length >= (validation.minConnections || 0)
                
                const isValid = hasRequiredConcepts && hasMinNodes && hasMinConnections
                
                onInteraction?.('diagram_builder_validated', {
                  isValid,
                  hasRequiredConcepts,
                  hasMinNodes,
                  hasMinConnections,
                  nodesCount: diagramNodes.length,
                  connectionsCount: diagramConnections.length,
                  usedConcepts: usedConcepts.length
                })
                
                // Отправляем событие завершения при успешной валидации
                if (isValid) {
                  onInteraction?.('diagram_builder_complete', {
                    isValid,
                    nodesCount: diagramNodes.length,
                    connectionsCount: diagramConnections.length,
                    usedConcepts: usedConcepts.length,
                    isAllCorrect: true,
                    accuracy: 100,
                    timestamp: new Date().toISOString()
                  })
                }
              }
              
              const handleResetDiagram = () => {
                if (template) {
                  setDiagramNodes(template.nodes || [])
                  setDiagramConnections(template.connections || [])
                } else {
                  setDiagramNodes([])
                  setDiagramConnections([])
                }
                setSelectedNode(null)
                setShowDiagramValidation(false)
                onInteraction?.('diagram_builder_reset', {})
              }
              
              // Проверка валидации
              const usedConcepts = diagramNodes
                .filter(n => n.conceptId)
                .map(n => n.conceptId)
              const requiredConcepts = validation.requiredConcepts || []
              const hasRequiredConcepts = requiredConcepts.every((conceptId: string) => 
                usedConcepts.includes(conceptId)
              )
              const hasMinNodes = diagramNodes.length >= (validation.minNodes || 0)
              const hasMinConnections = diagramConnections.length >= (validation.minConnections || 0)
              const isValid = hasRequiredConcepts && hasMinNodes && hasMinConnections
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-900">
                      Конструктор схемы: Постройте схему, отражающую связи между понятиями
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleValidateDiagram}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Проверить схему
                      </Button>
                      <Button
                        onClick={handleResetDiagram}
                        size="sm"
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Очистить
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Панель элементов */}
                    <div className="lg:col-span-1 space-y-4">
                      {/* Элементы узлов */}
                      {nodeElements.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">Элементы:</p>
                          <div className="space-y-2">
                            {nodeElements.map((element: any, index: number) => (
                              <div
                                key={element.id || index}
                                draggable
                                onDragStart={(e) => handleElementDragStart(e, element)}
                                className="p-3 bg-white border-2 border-blue-300 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-400 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded ${
                                    element.label?.toLowerCase().includes('прямоугольник') || element.label?.toLowerCase().includes('rect')
                                      ? 'bg-blue-500'
                                      : 'bg-blue-300 rounded-full'
                                  }`} />
                                  <span className="text-xs text-gray-700">{element.label || element}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Понятия */}
                      {concepts.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">Понятия:</p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {concepts.map((concept: any, index: number) => {
                              const conceptId = concept.id || concept
                              const conceptText = concept.text || concept.label || concept
                              const isUsed = usedConcepts.includes(conceptId)
                              
                              return (
                                <div
                                  key={conceptId || index}
                                  className={`p-2 rounded border-2 ${
                                    isUsed
                                      ? 'bg-gray-100 border-gray-300 opacity-50'
                                      : 'bg-white border-blue-200 hover:border-blue-400'
                                  }`}
                                >
                                  <span className="text-xs text-gray-700">{conceptText}</span>
                                  {isUsed && (
                                    <CheckIcon className="w-3 h-3 text-green-600 inline-block ml-2" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Рабочая область */}
                    <div className="lg:col-span-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Рабочая область:</p>
                      <div
                        onDragOver={handleWorkspaceDragOver}
                        onDrop={handleWorkspaceDrop}
                        className="bg-white border-2 border-blue-300 rounded-lg relative"
                        style={{
                          width: '100%',
                          height: '500px',
                          minHeight: '500px'
                        }}
                      >
                        {/* Размещенные узлы */}
                        {diagramNodes.map((node: any) => {
                          const isSelected = selectedNode === node.id
                          const position = node.position || { x: 100, y: 100 }
                          
                          return (
                            <div
                              key={node.id}
                              onClick={() => handleNodeClick(node.id)}
                              className={`absolute cursor-pointer transition-all ${
                                isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                              }`}
                              style={{
                                left: `${position.x}px`,
                                top: `${position.y}px`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <div className={`p-3 bg-white border-2 rounded-lg ${
                                isSelected ? 'border-blue-600' : 'border-blue-400'
                              }`}>
                                <p className="text-xs font-medium text-gray-700 whitespace-nowrap mb-1">
                                  {node.label || 'Узел'}
                                </p>
                                {node.conceptId ? (
                                  <p className="text-xs text-blue-600">
                                    {concepts.find((c: any) => (c.id || c) === node.conceptId)?.text || node.conceptId}
                                  </p>
                                ) : (
                                  <select
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleConceptAssign(node.id, e.target.value)
                                      }
                                    }}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 mt-1"
                                    value={node.conceptId || ''}
                                  >
                                    <option value="">Выберите понятие</option>
                                    {concepts
                                      .filter((c: any) => !usedConcepts.includes(c.id || c) || (c.id || c) === node.conceptId)
                                      .map((concept: any) => (
                                        <option key={concept.id || concept} value={concept.id || concept}>
                                          {concept.text || concept.label || concept}
                                        </option>
                                      ))}
                                  </select>
                                )}
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNodeDelete(node.id)
                                }}
                                size="sm"
                                variant="ghost"
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white hover:bg-red-600 rounded-full"
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          )
                        })}
                        
                        {/* Соединения */}
                        {diagramConnections.map((connection: any) => {
                          const fromNode = diagramNodes.find(n => n.id === connection.from)
                          const toNode = diagramNodes.find(n => n.id === connection.to)
                          
                          if (!fromNode || !toNode) return null
                          
                          const fromPos = fromNode.position || { x: 0, y: 0 }
                          const toPos = toNode.position || { x: 0, y: 0 }
                          
                          // Вычисляем координаты для стрелки
                          const dx = toPos.x - fromPos.x
                          const dy = toPos.y - fromPos.y
                          const length = Math.sqrt(dx * dx + dy * dy)
                          const angle = Math.atan2(dy, dx) * 180 / Math.PI
                          
                          return (
                            <div
                              key={connection.id}
                              className="absolute pointer-events-none"
                              style={{
                                left: `${fromPos.x}px`,
                                top: `${fromPos.y}px`,
                                width: `${length}px`,
                                transform: `rotate(${angle}deg)`,
                                transformOrigin: '0 50%'
                              }}
                            >
                              <div className="relative w-full h-0.5 bg-blue-500 mt-2">
                                <div 
                                  className="absolute right-0 top-1/2 transform -translate-y-1/2"
                                  style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: '8px solid #3B82F6',
                                    borderTop: '4px solid transparent',
                                    borderBottom: '4px solid transparent'
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Подсказка для пустой области */}
                        {diagramNodes.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-gray-400 text-center">
                              Перетащите элементы сюда для построения схемы
                            </p>
                          </div>
                        )}
                        
                        {/* Инструкция по соединению */}
                        {selectedNode && (
                          <div className="absolute top-4 left-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-3 z-10">
                            <p className="text-xs text-blue-800">
                              Выбран узел. Кликните на другой узел для соединения.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Статистика */}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Узлов: {diagramNodes.length}</span>
                        <span>Соединений: {diagramConnections.length}</span>
                        <span>Понятий использовано: {usedConcepts.length} / {concepts.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Результаты валидации */}
                  {showDiagramValidation && (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${
                      isValid
                        ? 'bg-green-50 border-green-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          Результат проверки схемы
                        </p>
                        {isValid ? (
                          <CheckIcon className="w-6 h-6 text-green-600" />
                        ) : (
                          <XIcon className="w-6 h-6 text-yellow-600" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 ${hasRequiredConcepts ? 'text-green-700' : 'text-yellow-700'}`}>
                          {hasRequiredConcepts ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <XIcon className="w-4 h-4" />
                          )}
                          <span className="text-xs">
                            Все обязательные понятия использованы: {usedConcepts.length} / {requiredConcepts.length}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 ${hasMinNodes ? 'text-green-700' : 'text-yellow-700'}`}>
                          {hasMinNodes ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <XIcon className="w-4 h-4" />
                          )}
                          <span className="text-xs">
                            Минимум узлов: {diagramNodes.length} / {validation.minNodes || 0}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 ${hasMinConnections ? 'text-green-700' : 'text-yellow-700'}`}>
                          {hasMinConnections ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <XIcon className="w-4 h-4" />
                          )}
                          <span className="text-xs">
                            Минимум соединений: {diagramConnections.length} / {validation.minConnections || 0}
                          </span>
                        </div>
                      </div>
                      {isValid ? (
                        <p className="text-sm text-green-700 mt-3">🎉 Отлично! Схема соответствует требованиям!</p>
                      ) : (
                        <p className="text-sm text-yellow-700 mt-3">
                          Схема не соответствует требованиям. Проверьте критерии выше.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Поддержка типа "audio-recording" - создание аудио-пересказа */}
            {data?.type === 'audio-recording' && (() => {
              const instructions = data.instructions || 'Создайте аудио-пересказ темы своими словами'
              const template = data.template
              const criteria = data.criteria || {}
              const maxDuration = data.maxDuration || 300 // 5 минут по умолчанию
              
              const formatTime = (seconds: number) => {
                const mins = Math.floor(seconds / 60)
                const secs = seconds % 60
                return `${mins}:${secs.toString().padStart(2, '0')}`
              }
              
              const handleStartRecording = async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                  const recorder = new MediaRecorder(stream)
                  const chunks: Blob[] = []
                  
                  recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                      chunks.push(e.data)
                    }
                  }
                  
                  recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' })
                    setRecordedAudio(blob)
                    const url = URL.createObjectURL(blob)
                    setAudioUrl(url)
                    stream.getTracks().forEach(track => track.stop())
                    
                    // Используем текущее значение recordingTime из замыкания
                    setRecordingTime(currentTime => {
                      onInteraction?.('audio_recording_complete', {
                        duration: currentTime,
                        blobSize: blob.size,
                        hasNotes: notes.length > 0
                      })
                      return currentTime
                    })
                  }
                  
                  recorder.start()
                  setMediaRecorder(recorder)
                  setIsRecording(true)
                  setRecordingTime(0)
                  setRecordedAudio(null)
                  setAudioUrl(null)
                  
                  onInteraction?.('audio_recording_started', {})
                } catch (error) {
                  console.error('Error starting recording:', error)
                  alert('Не удалось начать запись. Проверьте разрешения микрофона.')
                }
              }
              
              const handleStopRecording = () => {
                if (mediaRecorder && isRecording) {
                  mediaRecorder.stop()
                  setIsRecording(false)
                  setMediaRecorder(null)
                  setRecordingTime(currentTime => {
                    onInteraction?.('audio_recording_stopped', {
                      duration: currentTime
                    })
                    return currentTime
                  })
                }
              }
              
              const handleDeleteRecording = () => {
                if (audioUrl) {
                  URL.revokeObjectURL(audioUrl)
                }
                setRecordedAudio(null)
                setAudioUrl(null)
                setRecordingTime(0)
                onInteraction?.('audio_recording_deleted', {})
              }
              
              const handleSaveRecording = () => {
                if (recordedAudio) {
                  // Здесь можно отправить запись на сервер
                  onInteraction?.('audio_recording_saved', {
                    duration: recordingTime,
                    hasNotes: notes.length > 0,
                    notesLength: notes.length
                  })
                }
              }
              
              const timeRemaining = maxDuration - recordingTime
              const isTimeLimitReached = recordingTime >= maxDuration
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-green-900">
                      Задание: Создайте аудио-пересказ темы
                    </p>
                  </div>
                  
                  {/* Инструкции */}
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <p className="text-sm text-green-800 leading-relaxed">{instructions}</p>
                    <div className="mt-2 text-xs text-green-600">
                      Максимальная длительность: {formatTime(maxDuration)}
                    </div>
                  </div>
                  
                  {/* Шаблон структуры */}
                  {template && template.sections && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Структура пересказа:</p>
                      <div className="space-y-2">
                        {template.sections.map((section: any, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                            <span className="text-xs text-gray-700">{section.title}</span>
                            <span className="text-xs text-blue-600">{formatTime(section.duration || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Критерии оценки */}
                  {Object.keys(criteria).length > 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">Критерии оценки:</p>
                      <div className="space-y-1 text-xs text-yellow-800">
                        {criteria.clarity && (
                          <div>• <strong>Ясность:</strong> {criteria.clarity}</div>
                        )}
                        {criteria.completeness && (
                          <div>• <strong>Полнота:</strong> {criteria.completeness}</div>
                        )}
                        {criteria.structure && (
                          <div>• <strong>Структура:</strong> {criteria.structure}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Текстовые заметки */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Текстовые заметки (опционально):</p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Используйте это поле для заметок, которые помогут вам при пересказе..."
                      className="w-full p-3 border-2 border-gray-300 rounded-lg resize-none focus:border-green-400 focus:outline-none"
                      rows={4}
                    />
                  </div>
                  
                  {/* Управление записью */}
                  <div className="bg-white border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {!isRecording && !recordedAudio && (
                          <Button
                            onClick={handleStartRecording}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <PlayIcon className="w-5 h-5 mr-2" />
                            Начать запись
                          </Button>
                        )}
                        
                        {isRecording && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-lg font-bold text-red-600">
                                {formatTime(recordingTime)}
                              </span>
                              {timeRemaining > 0 && (
                                <span className="text-sm text-gray-500">
                                  (осталось {formatTime(timeRemaining)})
                                </span>
                              )}
                            </div>
                            <Button
                              onClick={handleStopRecording}
                              size="lg"
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <PauseIcon className="w-5 h-5 mr-2" />
                              Остановить
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {isTimeLimitReached && isRecording && (
                        <div className="text-sm text-red-600 font-semibold">
                          Достигнут лимит времени!
                        </div>
                      )}
                    </div>
                    
                    {/* Воспроизведение записи */}
                    {audioUrl && recordedAudio && (
                      <div className="space-y-3 border-t border-green-200 pt-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">Ваша запись:</p>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveRecording}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Сохранить
                            </Button>
                            <Button
                              onClick={handleDeleteRecording}
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Удалить
                            </Button>
                          </div>
                        </div>
                        <audio
                          src={audioUrl}
                          controls
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500">
                          Длительность: {formatTime(recordingTime)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Подсказка */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      💡 Совет: Используйте текстовые заметки как опору при пересказе. Говорите своими словами, не читайте текст дословно.
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Поддержка типа "product-creation" - создание итогового продукта */}
            {data?.type === 'product-creation' && (() => {
              const components = data.components || []
              const checklist = data.checklist || []
              const workspace = data.workspace || { width: 800, height: 600, tools: [] }
              const template = data.template
              const validation = data.validation || {}
              const reflection = data.reflection || { questions: [] }
              const exportConfig = data.export || { format: 'json', enabled: true }
              
              // Обработчики для создания продукта
              const handleComponentAdd = (component: any) => {
                const originalId = component.id || component
                const newComponent = {
                  ...component,
                  instanceId: `product-component-${Date.now()}`,
                  originalId: originalId,
                  position: { x: 100, y: 100 }
                }
                setProductComponents(prev => [...prev, newComponent])
                onInteraction?.('product_component_added', {
                  componentId: originalId,
                  totalComponents: productComponents.length + 1
                })
              }
              
              const handleComponentRemove = (instanceId: string) => {
                setProductComponents(prev => {
                  const removed = prev.find(c => (c.instanceId || c.id) === instanceId)
                  const newComponents = prev.filter(c => (c.instanceId || c.id) !== instanceId)
                  onInteraction?.('product_component_removed', {
                    componentId: removed?.originalId || removed?.id,
                    instanceId,
                    totalComponents: newComponents.length
                  })
                  return newComponents
                })
              }
              
              const handleChecklistToggle = (itemId: string) => {
                setChecklistItems(prev => {
                  const newState = { ...prev, [itemId]: !prev[itemId] }
                  onInteraction?.('product_checklist_toggled', {
                    itemId,
                    completed: newState[itemId]
                  })
                  return newState
                })
              }
              
              const handleReflectionAnswer = (questionId: string, answer: string) => {
                setReflectionAnswers(prev => ({
                  ...prev,
                  [questionId]: answer
                }))
              }
              
              const handleValidateProduct = () => {
                setShowValidation(true)
                
                const usedComponentIds = productComponents.map(c => c.id)
                const requiredComponents = validation.requiredComponents || []
                const hasRequiredComponents = requiredComponents.every((id: string) => 
                  usedComponentIds.includes(id)
                )
                const hasMinComponents = productComponents.length >= (validation.minComponents || 0)
                
                const requiredChecklistItems = checklist.filter((item: any) => item.required)
                const completedRequiredItems = requiredChecklistItems.filter((item: any) => 
                  checklistItems[item.id || item]
                )
                const hasRequiredChecklist = completedRequiredItems.length === requiredChecklistItems.length
                
                const isValid = hasRequiredComponents && hasMinComponents && hasRequiredChecklist
                
                onInteraction?.('product_validated', {
                  isValid,
                  hasRequiredComponents,
                  hasMinComponents,
                  hasRequiredChecklist,
                  componentsCount: productComponents.length,
                  checklistCompleted: Object.values(checklistItems).filter(Boolean).length
                })
                
                // Отправляем событие завершения при успешной валидации
                if (isValid) {
                  onInteraction?.('product_creation_complete', {
                    isValid,
                    componentsCount: productComponents.length,
                    checklistCompleted: Object.values(checklistItems).filter(Boolean).length,
                    isAllCorrect: true,
                    accuracy: 100,
                    timestamp: new Date().toISOString()
                  })
                }
              }
              
              const handleShowReflection = () => {
                setShowReflection(true)
                onInteraction?.('product_reflection_started', {})
              }
              
              const handleExportProduct = () => {
                const productData = {
                  components: productComponents,
                  checklist: checklistItems,
                  reflection: reflectionAnswers,
                  timestamp: new Date().toISOString()
                }
                
                if (exportConfig.format === 'json') {
                  const blob = new Blob([JSON.stringify(productData, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'product.json'
                  a.click()
                  URL.revokeObjectURL(url)
                }
                
                onInteraction?.('product_exported', {
                  format: exportConfig.format,
                  componentsCount: productComponents.length
                })
              }
              
              const handleResetProduct = () => {
                setProductComponents([])
                const initialChecklist: Record<string, boolean> = {}
                checklist.forEach((item: any) => {
                  initialChecklist[item.id || item] = false
                })
                setChecklistItems(initialChecklist)
                setReflectionAnswers({})
                setShowReflection(false)
                setShowValidation(false)
                onInteraction?.('product_reset', {})
              }
              
              // Проверка валидации
              const usedComponentIds = productComponents.map(c => c.originalId || c.id)
              const requiredComponents = validation.requiredComponents || []
              const hasRequiredComponents = requiredComponents.every((id: string) => 
                usedComponentIds.includes(id)
              )
              const hasMinComponents = productComponents.length >= (validation.minComponents || 0)
              const requiredChecklistItems = checklist.filter((item: any) => item.required)
              const completedRequiredItems = requiredChecklistItems.filter((item: any) => 
                checklistItems[item.id || item]
              )
              const hasRequiredChecklist = completedRequiredItems.length === requiredChecklistItems.length
              const isValid = hasRequiredComponents && hasMinComponents && hasRequiredChecklist
              
              const completedChecklistCount = Object.values(checklistItems).filter(Boolean).length
              const totalChecklistCount = checklist.length
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">
                      Задание: Создайте итоговый продукт
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleValidateProduct}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Проверить
                      </Button>
                      {exportConfig.enabled && (
                        <Button
                          onClick={handleExportProduct}
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          Экспорт
                        </Button>
                      )}
                      <Button
                        onClick={handleResetProduct}
                        size="sm"
                        variant="outline"
                        className="border-[#659AB8] text-[#5589a7] hover:bg-[#659AB8]/5"
                      >
                        Очистить
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Панель компонентов */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 mb-2">Доступные компоненты:</p>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {components.map((component: any, index: number) => {
                            const componentId = component.id || component
                            const isUsed = productComponents.some(c => c.originalId === componentId)
                            
                            return (
                              <div
                                key={componentId || index}
                                className={`p-3 rounded-lg border-2 ${
                                  isUsed
                                    ? 'bg-gray-100 border-gray-300 opacity-50'
                                    : 'bg-white border-purple-300 hover:border-purple-400 cursor-pointer'
                                }`}
                                onClick={() => !isUsed && handleComponentAdd(component)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                      isUsed ? 'text-gray-500' : 'text-gray-700'
                                    }`}>
                                      {component.label || component}
                                    </p>
                                    {component.description && (
                                      <p className="text-xs text-gray-500 mt-1">{component.description}</p>
                                    )}
                                    {component.fromBlock && (
                                      <p className="text-xs text-purple-600 mt-1">Из блока {component.fromBlock}</p>
                                    )}
                                  </div>
                                  {isUsed && (
                                    <CheckIcon className="w-4 h-4 text-green-600 ml-2" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      {/* Чек-лист */}
                      {checklist.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Чек-лист: {completedChecklistCount} / {totalChecklistCount}
                          </p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {checklist.map((item: any, index: number) => {
                              const itemId = item.id || item
                              const isCompleted = checklistItems[itemId] || false
                              
                              return (
                                <div
                                  key={itemId || index}
                                  className={`p-2 rounded border-2 flex items-center gap-2 cursor-pointer ${
                                    isCompleted
                                      ? 'bg-green-50 border-green-300'
                                      : item.required
                                      ? 'bg-yellow-50 border-yellow-300'
                                      : 'bg-white border-gray-300'
                                  }`}
                                  onClick={() => handleChecklistToggle(itemId)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={() => handleChecklistToggle(itemId)}
                                    className="cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <span className={`text-xs ${
                                      isCompleted ? 'text-green-800 line-through' : 'text-gray-700'
                                    }`}>
                                      {item.text || item}
                                    </span>
                                    {item.required && (
                                      <span className="text-xs text-red-600 ml-1">*</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Рабочая область */}
                    <div className="lg:col-span-2 space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Рабочая область:</p>
                      <div
                        className="bg-white border-2 border-purple-300 rounded-lg relative"
                        style={{
                          width: '100%',
                          height: `${workspace.height}px`,
                          minHeight: '400px'
                        }}
                      >
                        {/* Размещенные компоненты */}
                        {productComponents.map((component: any) => {
                          const position = component.position || { x: 100, y: 100 }
                          const instanceId = component.instanceId || component.id
                          
                          return (
                            <div
                              key={instanceId}
                              className="absolute cursor-move"
                              style={{
                                left: `${position.x}px`,
                                top: `${position.y}px`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <div className="p-3 bg-white border-2 border-purple-400 rounded-lg">
                                <p className="text-xs font-medium text-gray-700 whitespace-nowrap mb-1">
                                  {component.label || component}
                                </p>
                                {component.description && (
                                  <p className="text-xs text-gray-500">{component.description}</p>
                                )}
                              </div>
                              <Button
                                onClick={() => handleComponentRemove(instanceId)}
                                size="sm"
                                variant="ghost"
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white hover:bg-red-600 rounded-full"
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          )
                        })}
                        
                        {/* Подсказка для пустой области */}
                        {productComponents.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-gray-400 text-center">
                              Добавьте компоненты из панели слева
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Статистика */}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Компонентов: {productComponents.length}</span>
                        <span>Чек-лист: {completedChecklistCount} / {totalChecklistCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Результаты валидации */}
                  {showValidation && (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${
                      isValid
                        ? 'bg-green-50 border-green-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          Результат проверки продукта
                        </p>
                        {isValid ? (
                          <CheckIcon className="w-6 h-6 text-green-600" />
                        ) : (
                          <XIcon className="w-6 h-6 text-yellow-600" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 ${hasRequiredComponents ? 'text-green-700' : 'text-yellow-700'}`}>
                          {hasRequiredComponents ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <XIcon className="w-4 h-4" />
                          )}
                          <span className="text-xs">
                            Обязательные компоненты: {productComponents.length} / {requiredComponents.length}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 ${hasMinComponents ? 'text-green-700' : 'text-yellow-700'}`}>
                          {hasMinComponents ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <XIcon className="w-4 h-4" />
                          )}
                          <span className="text-xs">
                            Минимум компонентов: {productComponents.length} / {validation.minComponents || 0}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 ${hasRequiredChecklist ? 'text-green-700' : 'text-yellow-700'}`}>
                          {hasRequiredChecklist ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <XIcon className="w-4 h-4" />
                          )}
                          <span className="text-xs">
                            Обязательные пункты чек-листа: {completedRequiredItems.length} / {requiredChecklistItems.length}
                          </span>
                        </div>
                      </div>
                      {isValid && !showReflection && (
                        <Button
                          onClick={handleShowReflection}
                          size="sm"
                          className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Перейти к рефлексии
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Рефлексия */}
                  {showReflection && reflection.questions && reflection.questions.length > 0 && (
                    <div className="mt-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-purple-900">Рефлексия:</p>
                      </div>
                      {reflection.questions.map((question: any, index: number) => {
                        const questionId = question.id || `question-${index}`
                        const answer = reflectionAnswers[questionId] || ''
                        
                        return (
                          <div key={questionId || index} className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              {question.question}
                              {question.required && <span className="text-red-600 ml-1">*</span>}
                            </label>
                            {question.type === 'textarea' ? (
                              <textarea
                                value={answer}
                                onChange={(e) => handleReflectionAnswer(questionId, e.target.value)}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg resize-none focus:border-purple-400 focus:outline-none"
                                rows={4}
                                required={question.required}
                              />
                            ) : (
                              <input
                                type="text"
                                value={answer}
                                onChange={(e) => handleReflectionAnswer(questionId, e.target.value)}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-400 focus:outline-none"
                                required={question.required}
                              />
                            )}
                          </div>
                        )
                      })}
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            onInteraction?.('product_reflection_completed', {
                              answers: reflectionAnswers,
                              questionsCount: reflection.questions.length
                            })
                          }}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Завершить рефлексию
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Шаблон (если есть) */}
                  {template && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Шаблон продукта:</p>
                      {template.example && (
                        <p className="text-xs text-blue-800 mb-2">{template.example}</p>
                      )}
                      {template.structure && (
                        <div className="text-xs text-blue-700">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(template.structure, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {!data?.type && !data?.buttons && (
              <p className="text-sm text-gray-700">
                {data?.description || "Интерактивный элемент будет доступен здесь"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

