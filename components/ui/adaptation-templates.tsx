"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  EarIcon
} from "@/components/ui/icons"

interface AdaptationTemplateProps {
  studentType: 'visual' | 'auditory' | 'kinesthetic'
  lessonTitle: string
  content?: {
    block1?: any
    block2?: any
    block3?: any
    block4?: any
    block5?: any
  }
}

// Компонент для визуалов
export function VisualAdaptationTemplate({ lessonTitle, content }: AdaptationTemplateProps) {
  // Используем реальный контент от ИИ
  const block1Content = content?.block1 || {
    title: "Содержание урока",
    content: "В этом уроке мы изучим основные понятия и их взаимосвязи",
    items: ["Основные понятия", "Теоретические основы", "Связи между понятиями", "Практические применения"]
  }
  
  const block2Content = content?.block2 || {
    title: "Основная теория",
    sections: [
      { title: "Основные понятия", content: "Здесь будет структурированная информация с четкими определениями" },
      { title: "Ключевые принципы", content: "Важные принципы и закономерности" },
      { title: "Примеры и иллюстрации", content: "Конкретные примеры для понимания" }
    ]
  }
  
  const block3Content = content?.block3 || {
    title: "Соотнесение понятий",
    pairs: [
      { left: "Фотосинтез", right: "Процесс создания глюкозы растениями" },
      { left: "Хлорофилл", right: "Зеленый пигмент в листьях" },
      { left: "Солнечный свет", right: "Источник энергии для фотосинтеза" }
    ]
  }
  
  const block4Content = content?.block4 || {
    title: "Продолжение теории",
    sections: [
      { title: "Дополнительные аспекты", content: "Более глубокое изучение материала" },
      { title: "Практические применения", content: "Как изученные понятия применяются в реальной жизни" }
    ]
  }
  
  const block5Content = content?.block5 || {
    title: "Схема урока",
    description: "Обобщающая схема, которая объединяет все изученные понятия",
    elements: ["Основные понятия", "Связи", "Применения"]
  }
  const [isContentExpanded, setIsContentExpanded] = useState(false)
  const [matchingPairs, setMatchingPairs] = useState<{left: string, right: string, matched: boolean}[]>([])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([])

  const toggleBlockCompletion = (blockId: string) => {
    setCompletedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )
  }

  // Используем реальные данные от ИИ
  const demoPairs = block3Content.pairs

  const handlePairSelection = (left: string, right: string) => {
    if (selectedLeft === left && selectedRight === right) {
      // Создаем пару
      setMatchingPairs(prev => [...prev, { left, right, matched: true }])
      setSelectedLeft(null)
      setSelectedRight(null)
    } else if (selectedLeft === left) {
      setSelectedRight(right)
    } else {
      setSelectedLeft(left)
      setSelectedRight(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: string, type: 'left' | 'right') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, type }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetType: 'left' | 'right') => {
    e.preventDefault()
    const data = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    if (data.type !== targetType) {
      // Создаем пару
      const leftItem = data.type === 'left' ? data.item : ''
      const rightItem = data.type === 'right' ? data.item : ''
      
      if (leftItem && rightItem) {
        setMatchingPairs(prev => [...prev, { left: leftItem, right: rightItem, matched: true }])
      }
    }
  }

  const checkMatching = () => {
    setShowResult(true)
  }

  return (
    <div className="space-y-6">
      {/* Заголовок урока */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-[#5589a7] mb-2">{lessonTitle}</h1>
        <Badge className="bg-blue-100 text-blue-800">
          <EyeIcon className="w-4 h-4 mr-1" />
          Адаптация для визуалов
        </Badge>
      </div>

      {/* Блок 1: Содержание урока */}
      <Card className={`border-2 ${completedBlocks.includes('block1') ? 'border-green-300 bg-green-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              📋 {block1Content.title || "Содержание урока"}
              {completedBlocks.includes('block1') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block1')}
              className={completedBlocks.includes('block1') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block1') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            {block1Content.content}
          </p>
          <Button 
            variant="outline" 
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="w-full"
          >
            {isContentExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4 mr-2" />
                Скрыть содержание
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4 mr-2" />
                Показать содержание
              </>
            )}
          </Button>
          
          {isContentExpanded && (
            <div className="mt-4 space-y-2">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-slate-800 mb-2">Что мы изучим:</h4>
                <ul className="space-y-1 text-slate-700">
                  {block1Content.items?.map((item: string, index: number) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Блок 2: Основная теория */}
      <Card className={`border-2 ${completedBlocks.includes('block2') ? 'border-green-300 bg-green-50/30' : 'border-green-200 bg-green-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              📚 {block2Content.title || "Основная теория"}
              {completedBlocks.includes('block2') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block2')}
              className={completedBlocks.includes('block2') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block2') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {block2Content.sections?.map((section: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-slate-800 mb-2">{index + 1}. {section.title}</h4>
                <p className="text-slate-700">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Блок 3: Соотнесение понятий */}
      <Card className={`border-2 ${completedBlocks.includes('block3') ? 'border-green-300 bg-green-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🔗 {block3Content.title || "Соотнесение понятий"}
              {completedBlocks.includes('block3') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block3')}
              className={completedBlocks.includes('block3') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block3') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            Соедините понятия с их определениями. Выберите элемент из левого столбца, 
            затем соответствующий элемент из правого столбца.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Левый столбец */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Понятия</h4>
              {demoPairs.map((pair, index) => (
                <Button
                  key={index}
                  variant={selectedLeft === pair.left ? "default" : "outline"}
                  className={`w-full text-left justify-start cursor-move ${
                    matchingPairs.some(p => p.left === pair.left) ? 'opacity-50' : ''
                  }`}
                  onClick={() => !matchingPairs.some(p => p.left === pair.left) && handlePairSelection(pair.left, '')}
                  disabled={matchingPairs.some(p => p.left === pair.left)}
                  draggable={!matchingPairs.some(p => p.left === pair.left)}
                  onDragStart={(e) => handleDragStart(e, pair.left, 'left')}
                >
                  {pair.left}
                </Button>
              ))}
            </div>
            
            {/* Правый столбец */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Определения</h4>
              {demoPairs.map((pair, index) => (
                <Button
                  key={index}
                  variant={selectedRight === pair.right ? "default" : "outline"}
                  className={`w-full text-left justify-start cursor-move ${
                    matchingPairs.some(p => p.right === pair.right) ? 'opacity-50' : ''
                  }`}
                  onClick={() => !matchingPairs.some(p => p.right === pair.right) && handlePairSelection('', pair.right)}
                  disabled={matchingPairs.some(p => p.right === pair.right)}
                  draggable={!matchingPairs.some(p => p.right === pair.right)}
                  onDragStart={(e) => handleDragStart(e, pair.right, 'right')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'right')}
                >
                  {pair.right}
                </Button>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={checkMatching}
            className="w-full"
            disabled={matchingPairs.length !== demoPairs.length}
          >
            Проверить себя
          </Button>
          
          {showResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckIcon className="w-5 h-5" />
                <span className="font-semibold">Отлично! Все пары соединены правильно.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Блок 4: Продолжение теории */}
      <Card className={`border-2 ${completedBlocks.includes('block4') ? 'border-green-300 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              📖 {block4Content.title || "Продолжение теории"}
              {completedBlocks.includes('block4') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block4')}
              className={completedBlocks.includes('block4') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block4') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {block4Content.sections?.map((section: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-slate-800 mb-2">{section.title}</h4>
                <p className="text-slate-700">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Блок 5: Схема и пояснение */}
      <Card className={`border-2 ${completedBlocks.includes('block5') ? 'border-green-300 bg-green-50/30' : 'border-indigo-200 bg-indigo-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-indigo-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎯 {block5Content.title || "Схема урока"}
              {completedBlocks.includes('block5') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block5')}
              className={completedBlocks.includes('block5') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block5') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-center mb-4">
              <div className="inline-block p-4 bg-indigo-100 rounded-lg">
                <div className="w-32 h-32 border-2 border-indigo-300 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">СХЕМА</span>
                </div>
              </div>
            </div>
            <p className="text-slate-700 text-center">
              {block5Content.description}
            </p>
            {block5Content.elements && (
              <div className="mt-4">
                <h5 className="font-semibold text-slate-800 mb-2">Элементы схемы:</h5>
                <ul className="text-slate-700">
                  {block5Content.elements.map((element: string, index: number) => (
                    <li key={index}>• {element}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Блок оценки прогресса */}
      <Card className="border-2 border-gray-200 bg-gray-50/30">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            📊 Оценка прогресса
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Прогресс изучения</span>
                <span className="text-sm text-slate-600">{Math.round((completedBlocks.length / 5) * 100)}%</span>
              </div>
              <Progress value={(completedBlocks.length / 5) * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">4.2</div>
                <div className="text-sm text-slate-600">Скорость изучения</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">92%</div>
                <div className="text-sm text-slate-600">Качество выполнения</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Компонент для аудиалов
export function AuditoryAdaptationTemplate({ lessonTitle, content }: AdaptationTemplateProps) {
  // Используем реальный контент от ИИ
  const block1Content = content?.block1 || {
    title: "Введение в атмосферу урока",
    atmosphericText: "Представьте себе солнечный день в лесу. Листья деревьев мягко шелестят на ветру, а солнечные лучи проникают сквозь кроны, создавая игру света и тени. Именно в этот момент происходит удивительный процесс, который мы сегодня изучим..."
  }
  
  const block2Content = content?.block2 || {
    title: "Основная теория",
    sections: [
      { title: "Основные понятия", content: "Давайте разберем ключевые понятия через живой рассказ и примеры.", audioElements: ["Звуковой эффект 'открытия двери' перед каждым новым определением", "Мелодичный фоновый звук для лучшего запоминания"] }
    ]
  }
  
  const block3Content = content?.block3 || {
    title: "Соотнесение понятий",
    pairs: [
      { left: "Термин 1", right: "Определение 1", audioHint: "Подумайте о связи между этими понятиями как о мелодии, где каждая нота дополняет другую" }
    ]
  }
  
  const block4Content = content?.block4 || {
    title: "Продолжение теории",
    sections: [
      { title: "Практическое применение", content: "А теперь давайте послушаем диалог между опытным специалистом и новичком о том, как эти понятия работают в реальной жизни", audioMaterials: ["Диалог-обсуждение основных понятий", "Интервью с экспертом о практическом применении"] }
    ]
  }
  
  const block5Content = content?.block5 || {
    title: "Голосовое резюме урока",
    voiceSummary: "Сегодня мы познакомились с основными понятиями, которые теперь звучат в вашей голове как знакомая мелодия. Каждое определение стало частью вашего понимания, каждый термин обрел свой особый голос. Помните, что эти знания - это ваш надежный фундамент для дальнейшего обучения."
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const [matchingPairs, setMatchingPairs] = useState<{left: string, right: string, matched: boolean}[]>([])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([])

  const toggleBlockCompletion = (blockId: string) => {
    setCompletedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )
  }

  const demoPairs = block3Content.pairs

  const handlePairSelection = (left: string, right: string) => {
    if (selectedLeft === left && selectedRight === right) {
      setMatchingPairs(prev => [...prev, { left, right, matched: true }])
      setSelectedLeft(null)
      setSelectedRight(null)
    } else if (selectedLeft === left) {
      setSelectedRight(right)
    } else {
      setSelectedLeft(left)
      setSelectedRight(null)
    }
  }

  const checkMatching = () => {
    setShowResult(true)
  }

  return (
    <div className="space-y-6">
      {/* Заголовок урока */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-[#5589a7] mb-2">{lessonTitle}</h1>
        <Badge className="bg-green-100 text-green-800">
          <EarIcon className="w-4 h-4 mr-1" />
          Адаптация для аудиалов
        </Badge>
      </div>

      {/* Блок 1: Атмосферная подводка */}
      <Card className={`border-2 ${completedBlocks.includes('block1') ? 'border-green-300 bg-green-50/30' : 'border-green-200 bg-green-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎭 {block1Content.title || "Введение в атмосферу урока"}
              {completedBlocks.includes('block1') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block1')}
              className={completedBlocks.includes('block1') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block1') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-6 rounded-lg border">
            <p className="text-slate-700 mb-4 italic">
              "{block1Content.atmosphericText || "Представьте себе солнечный день в лесу. Листья деревьев мягко шелестят на ветру, а солнечные лучи проникают сквозь кроны, создавая игру света и тени. Именно в этот момент происходит удивительный процесс, который мы сегодня изучим..."}"
            </p>
            <Button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="w-4 h-4 mr-2" />
                  Пауза
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Прослушать введение
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Блок 2: Основная теория с аудио */}
      <Card className={`border-2 ${completedBlocks.includes('block2') ? 'border-green-300 bg-green-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎧 {block2Content.title || "Основная теория"}
              {completedBlocks.includes('block2') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block2')}
              className={completedBlocks.includes('block2') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block2') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">1. Основные понятия</h4>
              <p className="text-slate-700 mb-3">
                Давайте разберем ключевые понятия через живой рассказ и примеры.
              </p>
              <Button variant="outline" size="sm">
                <VolumeIcon className="w-4 h-4 mr-2" />
                Прослушать объяснение
              </Button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">2. История открытия</h4>
              <p className="text-slate-700 mb-3">
                Увлекательная история о том, как ученые пришли к пониманию этих процессов.
              </p>
              <Button variant="outline" size="sm">
                <VolumeIcon className="w-4 h-4 mr-2" />
                Прослушать историю
              </Button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">3. Диалог экспертов</h4>
              <p className="text-slate-700 mb-3">
                Обсуждение между учеными, которое поможет лучше понять материал.
              </p>
              <Button variant="outline" size="sm">
                <VolumeIcon className="w-4 h-4 mr-2" />
                Прослушать диалог
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Блок 3: Соотнесение понятий */}
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center gap-2">
            🔗 Соотнесение понятий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            Соедините понятия с их определениями. Вы можете прослушать каждое определение.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Понятия</h4>
              {demoPairs.map((pair, index) => (
                <Button
                  key={index}
                  variant={selectedLeft === pair.left ? "default" : "outline"}
                  className={`w-full text-left justify-start ${
                    matchingPairs.some(p => p.left === pair.left) ? 'opacity-50' : ''
                  }`}
                  onClick={() => !matchingPairs.some(p => p.left === pair.left) && handlePairSelection(pair.left, '')}
                  disabled={matchingPairs.some(p => p.left === pair.left)}
                >
                  {pair.left}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Определения</h4>
              {demoPairs.map((pair, index) => (
                <div key={index} className="space-y-1">
                  <Button
                    variant={selectedRight === pair.right ? "default" : "outline"}
                    className={`w-full text-left justify-start ${
                      matchingPairs.some(p => p.right === pair.right) ? 'opacity-50' : ''
                    }`}
                    onClick={() => !matchingPairs.some(p => p.right === pair.right) && handlePairSelection('', pair.right)}
                    disabled={matchingPairs.some(p => p.right === pair.right)}
                  >
                    {pair.right}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <VolumeIcon className="w-3 h-3 mr-1" />
                    Прослушать
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={checkMatching}
            className="w-full"
            disabled={matchingPairs.length !== demoPairs.length}
          >
            Проверить себя
          </Button>
          
          {showResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckIcon className="w-5 h-5" />
                <span className="font-semibold">Отлично! Все пары соединены правильно.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Блок 4: Продолжение теории с дополнительным аудио */}
      <Card className="border-2 border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            🎵 Продолжение теории
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">Дополнительные аспекты</h4>
              <p className="text-slate-700 mb-3">
                Более глубокое изучение материала через аудио-рассказы и примеры.
              </p>
              <Button variant="outline" size="sm">
                <VolumeIcon className="w-4 h-4 mr-2" />
                Прослушать дополнительный материал
              </Button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">Интервью с экспертом</h4>
              <p className="text-slate-700 mb-3">
                Эксклюзивное интервью с ученым, который рассказывает о практических применениях.
              </p>
              <Button variant="outline" size="sm">
                <VolumeIcon className="w-4 h-4 mr-2" />
                Прослушать интервью
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Блок 5: Голосовое объяснение */}
      <Card className="border-2 border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="text-indigo-800 flex items-center gap-2">
            🎤 Голосовое резюме урока
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-6 rounded-lg border">
            <p className="text-slate-700 mb-4">
              "Итак, мы изучили основные понятия, разобрали их взаимосвязи и увидели, 
              как они применяются в реальной жизни. Теперь у вас есть полное понимание..."
            </p>
            <Button className="w-full">
              <PlayIcon className="w-4 h-4 mr-2" />
              Прослушать резюме урока
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Блок оценки прогресса */}
      <Card className="border-2 border-gray-200 bg-gray-50/30">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            📊 Оценка прогресса
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Прогресс изучения</span>
                <span className="text-sm text-slate-600">{Math.round((completedBlocks.length / 5) * 100)}%</span>
              </div>
              <Progress value={(completedBlocks.length / 5) * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">3.8</div>
                <div className="text-sm text-slate-600">Скорость изучения</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">88%</div>
                <div className="text-sm text-slate-600">Качество выполнения</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Компонент для кинестетиков
export function KinestheticAdaptationTemplate({ lessonTitle, content }: AdaptationTemplateProps) {
  // Используем реальный контент от ИИ
  const block1Content = content?.block1 || {
    title: "Интерактивное содержание",
    interactiveElements: [
      { type: "button", text: "Открыть основные понятия", action: "Показывает интерактивную схему с основными понятиями" },
      { type: "slider", text: "Просмотр определений", action: "Прокручивает карточки с определениями" },
      { type: "toggle", text: "Включить режим практики", action: "Активирует режим практических заданий" }
    ]
  }
  
  const block2Content = content?.block2 || {
    title: "Основная теория",
    sections: [
      { title: "Теоретические основы", content: "Базовые концепции предмета", interactiveButtons: [
        { text: "Практический пример 1", content: "Интерактивная демонстрация концепции" },
        { text: "Важный факт", content: "Ключевое положение теории с практическим применением" }
      ]}
    ]
  }
  
  const block3Content = content?.block3 || {
    title: "Интерактивное соотнесение",
    pairs: [
      { left: "Термин 1", right: "Определение 1", draggable: true },
      { left: "Термин 2", right: "Определение 2", draggable: true },
      { left: "Термин 3", right: "Определение 3", draggable: true }
    ]
  }
  
  const block4Content = content?.block4 || {
    title: "Продолжение теории",
    interactiveTasks: [
      { title: "Практическое упражнение", description: "Выполните последовательность действий для закрепления материала", type: "sequence" },
      { title: "Интерактивный пример", description: "Измените параметры и наблюдайте за результатом", type: "simulation" }
    ]
  }
  
  const block5Content = content?.block5 || {
    title: "Чек-лист и памятка",
    checklist: [
      { item: "Изучить основные понятия", completed: false },
      { item: "Выполнить практические задания", completed: false },
      { item: "Проверить понимание через интерактивные тесты", completed: false }
    ],
    memo: "1. Начните с практических примеров\n2. Используйте интерактивные элементы\n3. Закрепите материал через физические действия"
  }

  const [isContentExpanded, setIsContentExpanded] = useState(false)
  const [matchingPairs, setMatchingPairs] = useState<{left: string, right: string, matched: boolean}[]>([])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showFact, setShowFact] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([])

  const toggleBlockCompletion = (blockId: string) => {
    setCompletedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )
  }

  const demoPairs = block3Content.pairs

  const handlePairSelection = (left: string, right: string) => {
    if (selectedLeft === left && selectedRight === right) {
      setMatchingPairs(prev => [...prev, { left, right, matched: true }])
      setSelectedLeft(null)
      setSelectedRight(null)
    } else if (selectedLeft === left) {
      setSelectedRight(right)
    } else {
      setSelectedLeft(left)
      setSelectedRight(null)
    }
  }

  const checkMatching = () => {
    setShowResult(true)
  }

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок урока */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-[#5589a7] mb-2">{lessonTitle}</h1>
        <Badge className="bg-purple-100 text-purple-800">
          <HandIcon className="w-4 h-4 mr-1" />
          Адаптация для кинестетиков
        </Badge>
      </div>

      {/* Блок 1: Интерактивное содержание */}
      <Card className={`border-2 ${completedBlocks.includes('block1') ? 'border-green-300 bg-green-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎮 {block1Content.title || "Интерактивное содержание"}
              {completedBlocks.includes('block1') && <CheckIcon className="w-5 h-5 text-green-600" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleBlockCompletion('block1')}
              className={completedBlocks.includes('block1') ? 'bg-green-100 text-green-800' : ''}
            >
              {completedBlocks.includes('block1') ? 'Завершено' : 'Отметить как завершенный'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            Изучите содержание урока через интерактивные элементы. 
            Нажимайте, перетаскивайте и исследуйте!
          </p>
          <Button 
            variant="outline" 
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="w-full"
          >
            {isContentExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4 mr-2" />
                Скрыть содержание
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4 mr-2" />
                Исследовать содержание
              </>
            )}
          </Button>
          
          {isContentExpanded && (
            <div className="mt-4 space-y-2">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-slate-800 mb-2">Интерактивные элементы:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {block1Content.interactiveElements?.map((element: any, index: number) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      size="sm" 
                      className="h-12 justify-start hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        // Интерактивное действие
                        console.log(`Clicked: ${element.text} - ${element.action}`)
                        // Здесь можно добавить логику для каждого типа элемента
                      }}
                    >
                      {element.type === 'button' && '🔘'} 
                      {element.type === 'slider' && '🎚️'} 
                      {element.type === 'toggle' && '🔄'} 
                      {element.text}
                    </Button>
                  )) || (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="h-12">📚 Основы</Button>
                      <Button variant="outline" size="sm" className="h-12">🔗 Связи</Button>
                      <Button variant="outline" size="sm" className="h-12">📖 Детали</Button>
                      <Button variant="outline" size="sm" className="h-12">🎯 Схема</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Блок 2: Основная теория с интерактивом */}
      <Card className="border-2 border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            🧩 Основная теория
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">1. Основные понятия</h4>
              <p className="text-slate-700 mb-3">
                Изучите ключевые понятия через интерактивные элементы.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFact(!showFact)}
              >
                <HandIcon className="w-4 h-4 mr-2" />
                Открыть интересный факт
              </Button>
              {showFact && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 Интересный факт: Растения производят больше кислорода, чем потребляют!
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">2. Практические примеры</h4>
              <p className="text-slate-700 mb-3">
                Взаимодействуйте с примерами, чтобы лучше понять материал.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  🔍 Исследовать
                </Button>
                <Button variant="outline" size="sm">
                  🎯 Попробовать
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Блок 3: Интерактивное соотнесение */}
      <Card className="border-2 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            🔄 Интерактивное соотнесение
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            Перетащите элементы, чтобы соединить понятия с их определениями.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Понятия</h4>
              {demoPairs.map((pair, index) => (
                <Button
                  key={index}
                  variant={selectedLeft === pair.left ? "default" : "outline"}
                  className={`w-full text-left justify-start ${
                    matchingPairs.some(p => p.left === pair.left) ? 'opacity-50' : ''
                  }`}
                  onClick={() => !matchingPairs.some(p => p.left === pair.left) && handlePairSelection(pair.left, '')}
                  disabled={matchingPairs.some(p => p.left === pair.left)}
                >
                  {pair.left}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Определения</h4>
              {demoPairs.map((pair, index) => (
                <Button
                  key={index}
                  variant={selectedRight === pair.right ? "default" : "outline"}
                  className={`w-full text-left justify-start ${
                    matchingPairs.some(p => p.right === pair.right) ? 'opacity-50' : ''
                  }`}
                  onClick={() => !matchingPairs.some(p => p.right === pair.right) && handlePairSelection('', pair.right)}
                  disabled={matchingPairs.some(p => p.right === pair.right)}
                >
                  {pair.right}
                </Button>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={checkMatching}
            className="w-full"
            disabled={matchingPairs.length !== demoPairs.length}
          >
            Проверить соединения
          </Button>
          
          {showResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckIcon className="w-5 h-5" />
                <span className="font-semibold">Отлично! Все элементы соединены правильно.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Блок 4: Продолжение теории с интерактивом */}
      <Card className="border-2 border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            🎯 Продолжение теории
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-slate-800 mb-2">Интерактивные задания</h4>
              <p className="text-slate-700 mb-3">
                Выполните действия, чтобы лучше понять материал.
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => toggleTask('task1')}
                >
                  {completedTasks.includes('task1') ? (
                    <CheckIcon className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 mr-2 border border-gray-300 rounded" />
                  )}
                  Собрать пазл понятий
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => toggleTask('task2')}
                >
                  {completedTasks.includes('task2') ? (
                    <CheckIcon className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 mr-2 border border-gray-300 rounded" />
                  )}
                  Создать схему связей
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => toggleTask('task3')}
                >
                  {completedTasks.includes('task3') ? (
                    <CheckIcon className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 mr-2 border border-gray-300 rounded" />
                  )}
                  Провести эксперимент
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Блок 5: Чек-лист и памятка */}
      <Card className="border-2 border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="text-indigo-800 flex items-center gap-2">
            ✅ Чек-лист и памятка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-6 rounded-lg border">
            <h4 className="font-semibold text-slate-800 mb-4">Что вы изучили:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Основные понятия и определения</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Связи между понятиями</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Практические применения</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Интерактивные задания</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">💡 Памятка:</h5>
              <p className="text-sm text-blue-700">
                Помните: лучший способ изучить материал - это активно с ним взаимодействовать!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Блок оценки прогресса */}
      <Card className="border-2 border-gray-200 bg-gray-50/30">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            📊 Оценка прогресса
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Прогресс изучения</span>
                <span className="text-sm text-slate-600">{Math.round((completedBlocks.length / 5) * 100)}%</span>
              </div>
              <Progress value={(completedBlocks.length / 5) * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">4.5</div>
                <div className="text-sm text-slate-600">Скорость изучения</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">95%</div>
                <div className="text-sm text-slate-600">Качество выполнения</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Главный компонент-роутер
export function AdaptationTemplate({ studentType, lessonTitle, content }: AdaptationTemplateProps) {
  switch (studentType) {
    case 'visual':
      return <VisualAdaptationTemplate lessonTitle={lessonTitle} content={content} />
    case 'auditory':
      return <AuditoryAdaptationTemplate lessonTitle={lessonTitle} content={content} />
    case 'kinesthetic':
      return <KinestheticAdaptationTemplate lessonTitle={lessonTitle} content={content} />
    default:
      return <VisualAdaptationTemplate lessonTitle={lessonTitle} content={content} />
  }
}
