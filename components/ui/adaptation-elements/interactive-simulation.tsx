"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HandIcon, PlayIcon, PauseIcon, CheckIcon } from "@/components/ui/icons"
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface InteractiveSimulationProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

export function InteractiveSimulation({ data, description, onInteraction }: InteractiveSimulationProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [simulationState, setSimulationState] = useState<any>(data?.initialState || {})
  
  // Состояние для process-simulation
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set())
  const [stageFeedback, setStageFeedback] = useState<string | null>(null)
  
  // Состояние для experiment
  const [variableValues, setVariableValues] = useState<Record<string, number>>({})
  const [graphData, setGraphData] = useState<any[]>([])
  const [observations, setObservations] = useState<any[]>([])
  const [goalReached, setGoalReached] = useState<boolean>(false)

  const handleStart = () => {
    setIsRunning(true)
    onInteraction?.('simulation_start', { simulationState })
  }

  const handleStop = () => {
    setIsRunning(false)
    onInteraction?.('simulation_stop', { simulationState })
  }

  const handleAction = (action: string, params?: any) => {
    onInteraction?.('simulation_action', { action, params, simulationState })
  }
  
  // Инициализация для experiment
  useEffect(() => {
    if (data?.type === 'experiment' && data.controls) {
      const initialValues: Record<string, number> = {}
      data.controls.forEach((control: any) => {
        initialValues[control.variable] = control.defaultValue || control.min || 0
      })
      setVariableValues(initialValues)
    }
  }, [data?.type, data?.controls])
  
  // Обновление графика при изменении переменных
  useEffect(() => {
    if (data?.type === 'experiment' && data.graph && Object.keys(variableValues).length > 0) {
      // Генерируем данные для графика на основе текущих значений переменных
      // Если есть наблюдения, используем их для расчета
      const newData: any[] = []
      
      if (data.graph.realTime) {
        // Режим реального времени: генерируем точки на основе текущих значений
        Object.entries(variableValues).forEach(([variable, value]) => {
          const observation = data.observations?.find((obs: any) => obs.variable === variable)
          let yValue = value
          
          if (observation && observation.effect) {
            // Используем наблюдения для расчета
            yValue = calculateYValue(variable, value, data, observation)
          } else {
            // Простая зависимость
            yValue = value * 1.2
          }
          
          newData.push({
            [data.graph.xAxis?.label || variable]: value,
            [data.graph.yAxis?.label || 'Результат']: yValue
          })
        })
      } else {
        // Режим накопления: добавляем новую точку к существующим данным только при изменении
        // Для этого используем функциональное обновление состояния
        setGraphData(prev => {
          const newPoint: any = {}
          Object.entries(variableValues).forEach(([variable, value]) => {
            newPoint[data.graph.xAxis?.label || variable] = value
            const observation = data.observations?.find((obs: any) => obs.variable === variable)
            const yValue = observation ? calculateYValue(variable, value, data, observation) : value * 1.2
            newPoint[data.graph.yAxis?.label || 'Результат'] = yValue
          })
          // Проверяем, не является ли эта точка дубликатом последней
          const lastPoint = prev[prev.length - 1]
          if (lastPoint && JSON.stringify(lastPoint) === JSON.stringify(newPoint)) {
            return prev
          }
          return [...prev, newPoint]
        })
        return
      }
      
      setGraphData(newData)
    }
  }, [variableValues, data?.type, data?.graph, data?.observations])
  
  // Функция для расчета значения Y на основе переменной
  const calculateYValue = (variable: string, value: number, experimentData: any, observation?: any) => {
    // Если есть наблюдение с эффектом, используем его
    if (observation && observation.effect) {
      // Пытаемся извлечь числовое значение из эффекта или использовать простое преобразование
      const effectMatch = observation.effect.match(/(\d+\.?\d*)/)
      if (effectMatch) {
        return Number.parseFloat(effectMatch[1]) * value / 100
      }
    }
    
    // Простая зависимость для демонстрации
    // В реальности это должно быть более сложным расчетом на основе модели
    return value * 1.2 + (value * value) / 100
  }
  
  // Проверка достижения цели эксперимента
  useEffect(() => {
    if (data?.type === 'experiment' && data.goal && Object.keys(variableValues).length > 0) {
      const optimalValues = data.goal.optimalValues || []
      const isOptimal = optimalValues.every((optimal: any) => {
        const currentValue = variableValues[optimal.variable]
        const targetValue = optimal.value
        // Допуск 5%
        return Math.abs(currentValue - targetValue) / targetValue < 0.05
      })
      setGoalReached(isOptimal)
    }
  }, [variableValues, data?.type, data?.goal])

  // Если это process-simulation
  if (data?.type === 'process-simulation') {
    const model = data.model || { components: [], initialState: {} }
    const controls = data.controls || []
    const process = data.process || { stages: [], feedback: [] }
    const experiments = data.experiments || []
    
    const handleControlAction = (control: any) => {
      // Находим этап, который должен быть активирован этим контролем
      const triggeredStage = process.stages.find((stage: any) => 
        stage.triggers?.some((trigger: any) => 
          trigger.controlId === control.id && trigger.action === control.action
        )
      )
      
      if (triggeredStage) {
        setCurrentStage(triggeredStage.id)
        setCompletedStages(prev => new Set([...prev, triggeredStage.id]))
        
        // Применяем эффекты к модели
        const newState = { ...simulationState }
        triggeredStage.effects?.forEach((effect: any) => {
          newState[effect.componentId] = effect.change
        })
        setSimulationState(newState)
        
        // Показываем обратную связь
        const feedback = process.feedback.find((f: any) => f.stageId === triggeredStage.id)
        if (feedback) {
          setStageFeedback(feedback.message)
          setTimeout(() => setStageFeedback(null), 3000)
        }
        
        onInteraction?.('process_stage_triggered', {
          stageId: triggeredStage.id,
          controlId: control.id,
          newState
        })
      } else {
        handleAction(control.action, control.params)
      }
    }
    
    return (
      <Card className="bg-white border-2 border-purple-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-700">
                <HandIcon className="w-5 h-5" />
                <span className="font-semibold">Симуляция процесса</span>
              </div>
              <div className="flex gap-2">
                {!isRunning ? (
                  <Button
                    onClick={handleStart}
                    variant="outline"
                    size="sm"
                    className="border-purple-500 text-purple-700 hover:bg-purple-50"
                  >
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Запустить
                  </Button>
                ) : (
                  <Button
                    onClick={handleStop}
                    variant="outline"
                    size="sm"
                    className="border-purple-500 text-purple-700 hover:bg-purple-50"
                  >
                    <PauseIcon className="w-4 h-4 mr-2" />
                    Остановить
                  </Button>
                )}
              </div>
            </div>
            
            {description && (
              <p className="text-sm text-gray-600 italic">{description}</p>
            )}
            
            {/* Модель объекта */}
            {model.components && model.components.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900 mb-2">Модель:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {model.components.map((component: any, index: number) => {
                    const componentId = component.id || `component-${index}`
                    const currentValue = simulationState[componentId] || component.initialValue || component.value
                    
                    return (
                      <div
                        key={componentId || index}
                        className="p-2 bg-white rounded border border-purple-300"
                      >
                        <p className="text-xs font-medium text-purple-900">{component.label || component.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{currentValue}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Управляющие элементы */}
            {controls.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900 mb-2">Управление:</p>
                <div className="space-y-3">
                  {controls.map((control: any, index: number) => {
                    if (control.type === 'slider') {
                      const sliderValue = simulationState[control.id] || control.defaultValue || control.min || 0
                      return (
                        <div key={control.id || index} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-700">
                              {control.label}
                            </label>
                            <span className="text-xs text-purple-700">
                              {sliderValue}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={control.min || 0}
                            max={control.max || 100}
                            step={control.step || 1}
                            value={sliderValue}
                            onChange={(e) => {
                              const newValue = Number.parseFloat(e.target.value)
                              setSimulationState(prev => ({
                                ...prev,
                                [control.id]: newValue
                              }))
                              handleControlAction({ ...control, value: newValue })
                            }}
                            className="w-full"
                          />
                        </div>
                      )
                    } else if (control.type === 'toggle') {
                      const isToggled = simulationState[control.id] || false
                      return (
                        <div key={control.id || index} className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-700">
                            {control.label}
                          </label>
                          <Button
                            onClick={() => {
                              const newValue = !isToggled
                              setSimulationState(prev => ({ ...prev, [control.id]: newValue }))
                              handleControlAction({ ...control, value: newValue })
                            }}
                            variant={isToggled ? "default" : "outline"}
                            size="sm"
                            className={isToggled ? "bg-purple-600 text-white" : "border-purple-300 text-purple-700"}
                          >
                            {isToggled ? 'Вкл' : 'Выкл'}
                          </Button>
                        </div>
                      )
                    } else {
                      return (
                        <Button
                          key={control.id || index}
                          onClick={() => handleControlAction(control)}
                          variant="outline"
                          size="sm"
                          className="border-purple-300 text-purple-700 hover:bg-purple-100"
                        >
                          {control.label}
                        </Button>
                      )
                    }
                  })}
                </div>
              </div>
            )}
            
            {/* Этапы процесса */}
            {process.stages && process.stages.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Этапы процесса:</p>
                <div className="space-y-2">
                  {process.stages.map((stage: any, index: number) => {
                    const isCompleted = completedStages.has(stage.id)
                    const isCurrent = currentStage === stage.id
                    
                    return (
                      <div
                        key={stage.id || index}
                        className={`p-3 rounded border-2 ${
                          isCurrent
                            ? 'bg-blue-100 border-blue-500'
                            : isCompleted
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-900">{stage.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{stage.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Обратная связь */}
            {stageFeedback && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800">{stageFeedback}</p>
              </div>
            )}
            
            {/* Эксперименты */}
            {experiments.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-900 mb-2">Эксперименты:</p>
                <div className="space-y-2">
                  {experiments.map((experiment: any, index: number) => (
                    <div key={experiment.id || index} className="p-3 bg-white rounded border border-yellow-300">
                      <p className="text-xs font-semibold text-gray-900">{experiment.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{experiment.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Если это experiment
  if (data?.type === 'experiment') {
    const model = data.model || { components: [], variables: [] }
    const controls = data.controls || []
    const graph = data.graph
    const observations = data.observations || []
    const goal = data.goal
    const results = data.results
    
    const handleVariableChange = (variable: string, value: number) => {
      setVariableValues(prev => ({
        ...prev,
        [variable]: value
      }))
      
      // Обновляем наблюдения
      const observation = observations.find((obs: any) => obs.variable === variable)
      if (observation) {
        const updatedObservation = {
          ...observation,
          value,
          effect: observation.effect || `Изменение ${variable} влияет на процесс`
        }
        setObservations(prev => {
          const existing = prev.findIndex(o => o.variable === variable)
          if (existing >= 0) {
            const newObs = [...prev]
            newObs[existing] = updatedObservation
            return newObs
          }
          return [...prev, updatedObservation]
        })
      }
      
      onInteraction?.('experiment_variable_changed', {
        variable,
        value,
        observations: observations.filter((obs: any) => obs.variable === variable)
      })
    }
    
    return (
      <Card className="bg-white border-2 border-purple-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-700">
                <HandIcon className="w-5 h-5" />
                <span className="font-semibold">Эксперимент с переменными</span>
              </div>
              {graph && !graph.realTime && graphData.length > 0 && (
                <Button
                  onClick={() => setGraphData([])}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Очистить график
                </Button>
              )}
            </div>
            
            {description && (
              <p className="text-sm text-gray-600 italic">{description}</p>
            )}
            
            {/* Цель эксперимента */}
            {goal && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Цель эксперимента:</p>
                <p className="text-xs text-blue-800 mb-2">{goal.description}</p>
                {goal.optimalValues && goal.optimalValues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-blue-900">Оптимальные значения:</p>
                    {goal.optimalValues.map((optimal: any, index: number) => (
                      <div key={index} className="text-xs text-blue-700">
                        {optimal.variable}: {optimal.value}
                      </div>
                    ))}
                  </div>
                )}
                {goalReached && (
                  <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-800 font-semibold">
                      🎉 Цель достигнута! Оптимальные значения найдены.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Управление переменными */}
              <div className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-3">Управление переменными:</p>
                  <div className="space-y-4">
                    {controls.map((control: any, index: number) => {
                      const currentValue = variableValues[control.variable] || control.defaultValue || control.min || 0
                      
                      return (
                        <div key={control.id || index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              {control.label}
                            </label>
                            <span className="text-sm font-semibold text-purple-700">
                              {currentValue} {control.unit || ''}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={control.min || 0}
                            max={control.max || 100}
                            step={control.step || 1}
                            value={currentValue}
                            onChange={(e) => handleVariableChange(control.variable, Number.parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{control.min || 0} {control.unit || ''}</span>
                            <span>{control.max || 100} {control.unit || ''}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Наблюдения */}
                {observations.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">Наблюдения:</p>
                    <div className="space-y-2">
                      {observations.map((obs: any, index: number) => {
                        const currentValue = variableValues[obs.variable]
                        if (currentValue === undefined) return null
                        
                        return (
                          <div key={index} className="p-2 bg-white rounded border border-yellow-300">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{obs.variable}:</span>
                              <span className="text-xs text-purple-700 font-semibold">{currentValue}</span>
                            </div>
                            <p className="text-xs text-gray-600">{obs.effect}</p>
                            {obs.explanation && (
                              <p className="text-xs text-gray-500 mt-1 italic">{obs.explanation}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* График */}
              {graph && (
                <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-3">График результатов:</p>
                  <div className="h-64">
                    {graph.type === 'line' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={graphData.length > 0 ? graphData : [{ x: 0, y: 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey={graph.xAxis?.label || 'x'} 
                            label={{ value: graph.xAxis?.label || 'X', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            label={{ value: graph.yAxis?.label || 'Y', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey={graph.yAxis?.label || 'y'} stroke="#8B5CF6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    {graph.type === 'bar' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData.length > 0 ? graphData : [{ x: 0, y: 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={graph.xAxis?.label || 'x'} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey={graph.yAxis?.label || 'y'} fill="#8B5CF6" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {graph.type === 'scatter' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart data={graphData.length > 0 ? graphData : [{ x: 0, y: 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={graph.xAxis?.label || 'x'} />
                          <YAxis dataKey={graph.yAxis?.label || 'y'} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Legend />
                          <Scatter dataKey={graph.yAxis?.label || 'y'} fill="#8B5CF6" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {graphData.length === 0 && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Измените переменные, чтобы увидеть график
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Объяснение цели */}
            {goal && goal.explanation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <strong>Объяснение:</strong> {goal.explanation}
                </p>
              </div>
            )}
            
            {/* Сохранение результатов */}
            {results && results.save && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Результаты эксперимента:</p>
                  <Button
                    onClick={() => {
                      const resultsData = {
                        variables: variableValues,
                        observations: observations.filter(obs => variableValues[obs.variable] !== undefined),
                        goalReached,
                        graphData: results.format === 'graph' ? graphData : undefined,
                        timestamp: new Date().toISOString()
                      }
                      onInteraction?.('experiment_results_saved', resultsData)
                      
                      // Если формат - таблица, показываем таблицу
                      if (results.format === 'table') {
                        const tableData = Object.entries(variableValues).map(([variable, value]) => ({
                          Переменная: variable,
                          Значение: value,
                          Эффект: observations.find(obs => obs.variable === variable)?.effect || '—'
                        }))
                        console.table(tableData)
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary/5"
                  >
                    Сохранить результаты
                  </Button>
                </div>
                {results.format === 'table' && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1 text-left">Переменная</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Значение</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Эффект</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(variableValues).map(([variable, value]) => {
                          const observation = observations.find(obs => obs.variable === variable)
                          return (
                            <tr key={variable} className="bg-white">
                              <td className="border border-gray-300 px-2 py-1">{variable}</td>
                              <td className="border border-gray-300 px-2 py-1 font-medium">{value}</td>
                              <td className="border border-gray-300 px-2 py-1">{observation?.effect || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-2 border-purple-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-700">
              <HandIcon className="w-5 h-5" />
              <span className="font-semibold">Интерактивная симуляция</span>
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  variant="outline"
                  size="sm"
                  className="border-purple-500 text-purple-700 hover:bg-purple-50"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Запустить
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  variant="outline"
                  size="sm"
                  className="border-purple-500 text-purple-700 hover:bg-purple-50"
                >
                  <PauseIcon className="w-4 h-4 mr-2" />
                  Остановить
                </Button>
              )}
            </div>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 italic">{description}</p>
          )}

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            {data?.instructions && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">Инструкции:</p>
                <p className="text-sm text-gray-700">{data.instructions}</p>
              </div>
            )}

            {data?.controls && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-900 mb-2">Управление:</p>
                <div className="flex flex-wrap gap-2">
                  {data.controls.map((control: any, index: number) => (
                    <Button
                      key={index}
                      onClick={() => handleAction(control.action, control.params)}
                      variant="outline"
                      size="sm"
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                    >
                      {control.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {data?.steps && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-purple-900 mb-2">Шаги симуляции:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                  {data.steps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {!data?.instructions && !data?.controls && !data?.steps && (
              <p className="text-sm text-gray-700">
                {data?.description || "Интерактивная симуляция будет доступна здесь"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

