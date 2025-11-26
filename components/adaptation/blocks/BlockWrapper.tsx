import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Pencil } from "lucide-react"

interface BlockWrapperProps {
  blockNumber: number
  title: string
  intro?: string
  children: React.ReactNode
  isEmpty?: boolean
  mainText?: string
  isEditing?: boolean
  onMainTextChange?: (newText: string) => void
}

export function BlockWrapper({
  blockNumber,
  title,
  intro,
  children,
  isEmpty = false,
  mainText,
  isEditing = false,
  onMainTextChange,
}: BlockWrapperProps) {
  const [localMainText, setLocalMainText] = useState(mainText || "")
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
              {(mainText || isEditing) && (
                <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Основной материал блока
                    </h3>
                    {isEditing && (
                      <span className="text-xs text-slate-500">Markdown поддерживается</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={localMainText}
                        onChange={(e) => {
                          setLocalMainText(e.target.value)
                          onMainTextChange?.(e.target.value)
                        }}
                        className="w-full min-h-[200px] p-4 border border-[#E5E7EB] rounded-lg text-sm text-slate-700 font-mono focus:outline-none focus:border-[#E5E7EB]"
                        placeholder="Введите основной текст для этого блока (поддерживается Markdown: ## заголовки, **жирный**, *курсив*, списки, > цитаты)"
                      />
                      <div className="text-xs text-slate-500">
                        Markdown: используйте ## для заголовков, **текст** для жирного, *текст* для курсива, - для списков, {'>'} для цитат
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Кастомизация стилей для markdown элементов
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
                        {mainText}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
