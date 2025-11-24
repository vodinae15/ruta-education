"use client"

import React from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"

interface DiagramNode {
  id: string
  label: string
  x: number
  y: number
}

interface DiagramConnection {
  from: string
  to: string
  label?: string
}

interface VisualDiagramProps {
  isEmpty?: boolean
  nodes?: DiagramNode[]
  connections?: DiagramConnection[]
}

export function VisualDiagram({ isEmpty = true, nodes, connections }: VisualDiagramProps) {
  // Шаблонная диаграмма для пустого состояния
  const defaultNodes: DiagramNode[] = [
    { id: "node1", label: "Концепция 1", x: 20, y: 10 },
    { id: "node2", label: "Концепция 2", x: 50, y: 10 },
    { id: "node3", label: "Концепция 3", x: 80, y: 10 },
    { id: "node4", label: "Концепция 4", x: 35, y: 50 },
    { id: "node5", label: "Концепция 5", x: 65, y: 50 },
    { id: "node6", label: "Центральная идея", x: 50, y: 85 },
  ]

  const defaultConnections: DiagramConnection[] = [
    { from: "node1", to: "node4" },
    { from: "node2", to: "node4" },
    { from: "node2", to: "node5" },
    { from: "node3", to: "node5" },
    { from: "node4", to: "node6" },
    { from: "node5", to: "node6" },
  ]

  const displayNodes = nodes && nodes.length > 0 ? nodes : defaultNodes
  const displayConnections = connections && connections.length > 0 ? connections : defaultConnections

  return (
    <BlockWrapper
      blockNumber={1}
      title="Визуальная структура темы"
      intro="Схематическое представление взаимосвязей между концепциями"
      isEmpty={false}
    >
      <div className="relative w-full h-[500px] bg-[#F8FAFB] rounded-lg border border-[#E5E7EB] p-4">
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          {/* Линии связей */}
          {displayConnections.map((conn, index) => {
            const fromNode = displayNodes.find((n) => n.id === conn.from)
            const toNode = displayNodes.find((n) => n.id === conn.to)
            if (!fromNode || !toNode) return null

            return (
              <line
                key={`${conn.from}-${conn.to}-${index}`}
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
                stroke="#659AB8"
                strokeWidth="2"
                strokeDasharray={isEmpty ? "5,5" : "0"}
              />
            )
          })}
        </svg>

        {/* Узлы */}
        {displayNodes.map((node) => (
          <div
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              zIndex: 2,
            }}
          >
            <div className="bg-white border-2 border-[#659AB8] rounded-lg px-4 py-3 shadow-sm min-w-[120px]">
              <p className={`text-center text-sm font-medium ${isEmpty ? "text-slate-400" : "text-slate-900"}`}>
                {node.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isEmpty && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Шаблон: 5-8 концепций с визуальными связями между ними
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
