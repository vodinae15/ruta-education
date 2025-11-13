"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EyeIcon } from "@/components/ui/icons"

interface VisualDiagramProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

export function VisualDiagram({ data, description, onInteraction }: VisualDiagramProps) {
  // Состояние для многослойных схем
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [revealedLayers, setRevealedLayers] = useState<Set<string>>(new Set())
  
  // Состояние для сворачиваемых узлов
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  
  // Инициализация: первый слой всегда доступен для многослойных схем
  useEffect(() => {
    if (data?.layers && Array.isArray(data.layers) && data.layers.length > 0) {
      const firstLayerId = data.layers[0]?.id
      if (firstLayerId) {
        setRevealedLayers(prev => {
          if (!prev.has(firstLayerId)) {
            return new Set([...prev, firstLayerId])
          }
          return prev
        })
      }
    }
  }, [data?.layers])
  
  // Если данные содержат многослойную структуру
  if (data?.layers && Array.isArray(data.layers) && data.layers.length > 0) {
    const layers = data.layers
    const interactions = data.interactions || []
    const colorCoding = data.colorCoding || { basic: '#3B82F6', new: '#10B981', connections: '#6B7280' }
    
    // Определяем активный слой (первый по умолчанию или выбранный)
    const firstLayerId = layers[0]?.id
    const currentActiveLayer = activeLayer || firstLayerId || null
    const currentLayer = layers.find((l: any) => l.id === currentActiveLayer) || layers[0]
    
    // Проверяем, доступен ли слой (первый всегда доступен)
    const isLayerRevealed = (layerId: string) => {
      return revealedLayers.has(layerId) || layerId === firstLayerId
    }
    
    const handleLayerSwitch = (layerId: string) => {
      setActiveLayer(layerId)
      onInteraction?.('diagram_layer_switched', { layerId })
    }
    
    const handleNodeClick = (node: any, nodeId: string) => {
      // Проверяем, есть ли взаимодействие для этого узла
      const interaction = interactions.find((i: any) => 
        i.layerId === currentActiveLayer && i.nodeId === nodeId && i.action === 'click'
      )
      
      if (interaction && interaction.reveals) {
        // Раскрываем указанный слой
        setRevealedLayers(prev => new Set([...prev, interaction.reveals]))
        setActiveLayer(interaction.reveals)
        onInteraction?.('diagram_layer_revealed', { 
          fromLayer: currentActiveLayer,
          toLayer: interaction.reveals,
          nodeId 
        })
      } else {
        // Обычный клик по узлу
        onInteraction?.('diagram_node_click', { nodeId, node, layerId: currentActiveLayer })
      }
    }
    
    // Определяем цвет узла на основе цветового кодирования
    const getNodeColor = (node: any) => {
      if (node.type === 'new' || node.isNew) {
        return colorCoding.new || '#10B981'
      }
      return colorCoding.basic || '#3B82F6'
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-700 mb-4">
          <EyeIcon className="w-5 h-5" />
          <span className="font-semibold">Многослойная инфографика</span>
        </div>
        
        {/* Переключатель слоёв */}
        <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Слои:</span>
            <div className="flex flex-wrap gap-2">
              {layers.map((layer: any) => {
                const isActive = layer.id === currentActiveLayer
                const isRevealed = isLayerRevealed(layer.id)
                
                return (
                  <Button
                    key={layer.id}
                    onClick={() => handleLayerSwitch(layer.id)}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={`${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isRevealed
                        ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                        : 'border-gray-300 text-gray-500 opacity-50 cursor-not-allowed'
                    }`}
                    disabled={!isRevealed}
                  >
                    {layer.name || layer.id}
                    {isActive && <span className="ml-1">●</span>}
                  </Button>
                )
              })}
            </div>
          </div>
          
          {/* Текущий слой */}
          {currentLayer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-blue-900">
                  {currentLayer.name || currentLayer.id}
                </h4>
                {currentLayer.description && (
                  <p className="text-xs text-gray-600">{currentLayer.description}</p>
                )}
              </div>
              
              {/* Узлы текущего слоя */}
              {currentLayer.nodes && currentLayer.nodes.length > 0 && (
                <div className="space-y-3">
                  {currentLayer.nodes.map((node: any, index: number) => {
                    const nodeId = node.id || `node-${index}`
                    const nodeColor = getNodeColor(node)
                    const hasInteraction = interactions.some((i: any) => 
                      i.layerId === currentActiveLayer && i.nodeId === nodeId && i.action === 'click'
                    )
                    
                    return (
                      <div
                        key={nodeId || index}
                        className="p-4 rounded-lg border-2 cursor-pointer transition-all"
                        style={{
                          backgroundColor: `${nodeColor}15`,
                          borderColor: nodeColor,
                        }}
                        onClick={() => handleNodeClick(node, nodeId)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 text-white rounded-full flex items-center justify-center font-bold"
                            style={{ backgroundColor: nodeColor }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold" style={{ color: nodeColor }}>
                              {node.label || node.name || `Узел ${index + 1}`}
                            </h5>
                            {node.description && (
                              <p className="text-sm mt-1" style={{ color: `${nodeColor}CC` }}>
                                {node.description}
                              </p>
                            )}
                            {hasInteraction && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                Кликните для раскрытия подпроцесса →
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Связи текущего слоя */}
              {currentLayer.connections && currentLayer.connections.length > 0 && (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: colorCoding.connections }}>
                  <p className="text-sm font-semibold mb-3" style={{ color: colorCoding.connections }}>
                    Связи:
                  </p>
                  <div className="space-y-2">
                    {currentLayer.connections.map((conn: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: colorCoding.connections }}
                      >
                        <span className="font-medium">{conn.from || 'Узел'}</span>
                        <span>→</span>
                        <span className="font-medium">{conn.to || 'Узел'}</span>
                        {conn.label && (
                          <span className="italic">({conn.label})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Легенда цветового кодирования */}
        {colorCoding && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Цветовое кодирование:</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colorCoding.basic }}
                />
                <span>Базовые элементы</span>
              </div>
              {colorCoding.new && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colorCoding.new }}
                  />
                  <span>Новые элементы</span>
                </div>
              )}
              {colorCoding.connections && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colorCoding.connections }}
                  />
                  <span>Связи</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {description && (
          <p className="text-sm text-gray-600 italic">{description}</p>
        )}
      </div>
    )
  }
  
  // Если данные содержат структуру для схемы с узлами и связями
  if (data?.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
    const isCollapsible = data.collapsible === true
    
    const handleNodeToggle = (nodeId: string) => {
      if (isCollapsible) {
        setExpandedNodes(prev => {
          const newSet = new Set(prev)
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId)
          } else {
            newSet.add(nodeId)
          }
          return newSet
        })
      }
      onInteraction?.('diagram_node_click', { nodeId, node: data.nodes.find((n: any) => (n.id || n) === nodeId) })
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-700 mb-4">
          <EyeIcon className="w-5 h-5" />
          <span className="font-semibold">
            {isCollapsible ? 'Интерактивная схема (сворачиваемая)' : 'Интерактивная схема'}
          </span>
        </div>
        
        {/* Визуализация схемы */}
        <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
          <div className="space-y-4">
            {data.nodes.map((node: any, index: number) => {
              const nodeId = node.id || `node-${index}`
              const isExpanded = expandedNodes.has(nodeId)
              const hasSubprocess = node.subprocess || node.children
              
              return (
                <div key={nodeId || index}>
                  <div
                    className={`p-4 bg-blue-50 rounded-lg border-2 border-blue-300 cursor-pointer hover:bg-blue-100 transition-colors ${
                      isCollapsible && hasSubprocess ? 'mb-2' : ''
                    }`}
                    onClick={() => handleNodeToggle(nodeId)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-blue-900">
                          {node.label || node.name || `Узел ${index + 1}`}
                        </h5>
                    {node.description && (
                      <p className="text-sm text-blue-700 mt-1">{node.description}</p>
                    )}
                      </div>
                      {isCollapsible && hasSubprocess && (
                        <div className="text-blue-600">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Подпроцессы (если схема сворачиваемая) */}
                  {isCollapsible && hasSubprocess && isExpanded && (
                    <div className="ml-8 mt-2 space-y-2 border-l-2 border-blue-300 pl-4">
                      {node.subprocess?.map((sub: any, subIndex: number) => (
                        <div
                          key={subIndex}
                          className="p-3 bg-blue-25 rounded border border-blue-200"
                        >
                          <p className="text-sm font-medium text-blue-800">
                            {sub.label || sub.name || `Подпроцесс ${subIndex + 1}`}
                          </p>
                          {sub.description && (
                            <p className="text-xs text-blue-600 mt-1">{sub.description}</p>
                          )}
                        </div>
                      ))}
                      {node.children?.map((child: any, childIndex: number) => (
                        <div
                          key={childIndex}
                          className="p-3 bg-blue-25 rounded border border-blue-200"
                        >
                          <p className="text-sm font-medium text-blue-800">
                            {child.label || child.name || `Дочерний элемент ${childIndex + 1}`}
                          </p>
                          {child.description && (
                            <p className="text-xs text-blue-600 mt-1">{child.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Связи между узлами */}
          {data.connections && data.connections.length > 0 && (
            <div className="mt-6 pt-6 border-t border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-3">Связи:</p>
              <div className="space-y-3">
                {data.connections.map((conn: any, index: number) => {
                  const fromNode = data.nodes.find((n: any) => (n.id || n) === conn.from)
                  const toNode = data.nodes.find((n: any) => (n.id || n) === conn.to)
                  
                  return (
                  <div
                    key={index}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {data.nodes.findIndex((n: any) => (n.id || n) === conn.from) + 1}
                        </div>
                        <span className="font-medium text-blue-900">
                          {fromNode?.label || fromNode?.name || conn.from || 'Узел'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-0.5 bg-blue-500" />
                        <span className="text-blue-600 font-bold">→</span>
                        <div className="w-12 h-0.5 bg-blue-500" />
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="font-medium text-blue-900">
                          {toNode?.label || toNode?.name || conn.to || 'Узел'}
                        </span>
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {data.nodes.findIndex((n: any) => (n.id || n) === conn.to) + 1}
                        </div>
                      </div>
                    {conn.label && (
                        <div className="px-2 py-1 bg-blue-200 rounded text-xs text-blue-800 font-medium">
                          {conn.label}
                        </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {description && (
          <p className="text-sm text-gray-600 italic">{description}</p>
        )}
      </div>
    )
  }

  // Если данные - это просто описание схемы
  return (
    <Card className="bg-white border-2 border-blue-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="font-semibold">Схема</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {description || JSON.stringify(data, null, 2)}
            </pre>
          </div>
          {data?.elements && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Элементы схемы:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {data.elements.map((element: string, index: number) => (
                  <li key={index}>{element}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

