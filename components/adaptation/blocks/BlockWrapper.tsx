import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BlockWrapperProps {
  blockNumber: number
  title: string
  intro?: string
  children: React.ReactNode
  isEmpty?: boolean
  mainText?: string
}

export function BlockWrapper({
  blockNumber,
  title,
  intro,
  children,
  isEmpty = false,
  mainText,
}: BlockWrapperProps) {
  return (
    <div className="mb-8">
      {/* Номер блока */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#659AB8] rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">{blockNumber}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      </div>

      {/* Вступительный текст */}
      {intro && (
        <p className="text-slate-600 mb-6 text-lg">{intro}</p>
      )}

      {/* Контент блока */}
      <Card className="border">
        <CardContent className="p-6">
          {isEmpty ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Шаблон будет заполнен после генерации</p>
            </div>
          ) : (
            <>
              {children}

              {/* Основной текстовый материал для этого блока */}
              {mainText && (
                <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                  <div className="prose prose-slate max-w-none">
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {mainText}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
