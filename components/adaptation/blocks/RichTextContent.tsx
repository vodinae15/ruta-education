"use client"

import React from "react"
import { BlockWrapper } from "./BlockWrapper"

interface RichTextContentProps {
  isEmpty?: boolean
  htmlContent?: string
  enableTableOfContents?: boolean
}

export function RichTextContent({
  isEmpty = true,
  htmlContent,
  enableTableOfContents = true
}: RichTextContentProps) {
  // Пример контента для демонстрации
  const defaultContent = `
    <h2>Введение в тему</h2>
    <p>Химические реакции — это процессы, при которых одни вещества превращаются в другие. Это фундаментальное понятие в химии, которое объясняет множество явлений в природе и технике.</p>

    <h3>Основные понятия</h3>
    <p>Каждая химическая реакция характеризуется несколькими важными параметрами:</p>
    <ul>
      <li><strong>Реагенты</strong> — исходные вещества, которые вступают в реакцию</li>
      <li><strong>Продукты</strong> — вещества, которые образуются в результате реакции</li>
      <li><strong>Катализаторы</strong> — вещества, которые ускоряют реакцию, но сами в ней не расходуются</li>
    </ul>

    <h3>Типы химических реакций</h3>
    <p>Существует несколько основных типов химических реакций, каждый из которых имеет свои особенности:</p>

    <h4>1. Реакции соединения</h4>
    <p>В реакциях соединения два или более простых вещества объединяются, образуя одно сложное вещество. <em>Например</em>, при соединении водорода с кислородом образуется вода.</p>

    <h4>2. Реакции разложения</h4>
    <p>При разложении сложное вещество распадается на несколько более простых веществ. Это обратный процесс к реакции соединения.</p>

    <blockquote>
      <p><strong>Важно помнить:</strong> Все химические реакции подчиняются закону сохранения массы — масса реагентов всегда равна массе продуктов.</p>
    </blockquote>

    <h3>Энергия в химических реакциях</h3>
    <p>Химические реакции всегда сопровождаются энергетическими изменениями:</p>
    <ol>
      <li><strong>Экзотермические реакции</strong> — реакции с выделением энергии (например, горение)</li>
      <li><strong>Эндотермические реакции</strong> — реакции с поглощением энергии (например, фотосинтез)</li>
    </ol>

    <h3>Скорость химических реакций</h3>
    <p>Скорость химической реакции зависит от многих факторов:</p>
    <ul>
      <li>Температура реакционной среды</li>
      <li>Концентрация реагентов</li>
      <li>Наличие катализаторов</li>
      <li>Площадь поверхности реагирующих веществ</li>
    </ul>

    <p>Понимание этих факторов позволяет управлять химическими процессами в промышленности и лабораторных условиях.</p>
  `

  const displayContent = htmlContent || defaultContent

  return (
    <BlockWrapper
      blockNumber={2.5}
      title="Основной материал"
      intro="Полный конспект урока с детальным изложением темы"
      isEmpty={false}
    >
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 lg:p-8">
        {/* Rich text контент с типографикой */}
        <div
          className="prose prose-slate max-w-none
            prose-headings:text-slate-900 prose-headings:font-semibold
            prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[#E5E7EB]
            prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-[#659AB8]
            prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4 prose-h4:text-slate-800
            prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4
            prose-strong:text-slate-900 prose-strong:font-semibold
            prose-em:text-slate-700
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
            prose-li:text-slate-700 prose-li:my-1.5
            prose-blockquote:border-l-4 prose-blockquote:border-[#659AB8] prose-blockquote:bg-[#F8FAFB] prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:my-6 prose-blockquote:rounded-r-lg
            prose-blockquote:not-italic prose-blockquote:text-slate-700
            prose-code:text-[#659AB8] prose-code:bg-[#F8FAFB] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-a:text-[#659AB8] prose-a:no-underline hover:prose-a:underline
          "
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
      </div>

      {isEmpty && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Здесь будет отображаться основной текстовый материал урока с форматированием
          </p>
        </div>
      )}
    </BlockWrapper>
  )
}
