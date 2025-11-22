"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import type { AuthorTypeResult } from "@/lib/author-test-logic"

interface AuthorTestResultsProps {
  authorTypeResult: AuthorTypeResult
  onRetakeTest?: () => void
}

export function AuthorTestResults({ authorTypeResult, onRetakeTest }: AuthorTestResultsProps) {

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="relative">
        {/* Main card with type and description */}
        <Card className="bg-light-blue border rounded-2xl">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <span className="inline-block bg-[#659AB8] text-white px-6 py-3 text-xl font-semibold mb-4 rounded-lg">
                  {authorTypeResult.title}
                </span>
                <p className="text-xl lg:text-2xl text-slate-900 font-medium leading-relaxed">{authorTypeResult.description}</p>
              </div>

              {/* Superpower as status badge */}
              <div className="lg:w-80">
                <span className="inline-block bg-[#FDF8F3] text-slate-700 px-4 py-3 text-base font-semibold rounded-full border border-[#E5E7EB] leading-tight">
                  {authorTypeResult.superpower}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Style Recommendations */}
        <Card className="border h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[#5589a7] font-bold">По стилю подачи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {authorTypeResult.recommendations.style.map((tip, index) => (
              <div key={index} className="flex items-start py-1">
                <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Motivation Recommendations */}
        <Card className="border h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[#5589a7] font-bold">По мотивации</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {authorTypeResult.recommendations.motivation.map((tip, index) => (
              <div key={index} className="flex items-start py-1">
                <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Barrier Recommendations */}
        <Card className="border h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[#5589a7] font-bold">По преодолению барьеров</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {authorTypeResult.recommendations.barriers.map((tip, index) => (
              <div key={index} className="flex items-start py-1">
                <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Personal Tips */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-[#5589a7] font-bold">Ваши персональные подсказки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {authorTypeResult.personalTips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start py-1"
              >
                <div className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-[#5589a7] font-bold">Что делать дальше</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/course-constructor"
              className="flex-1 text-center bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
            >
              Создать курс
            </Link>
            <Link
              href="/dashboard"
              className="text-center bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
            >
              В личный кабинет
            </Link>
            {onRetakeTest && (
              <button
                onClick={onRetakeTest}
                className="text-center bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
              >
                Пройти тест заново
              </button>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-light-blue rounded-lg">
            <p className="text-sm text-slate-600 leading-relaxed">
              <span className="font-semibold text-[#5589a7]">Совет:</span> Ваш конструктор курсов теперь настроен под
              ваш тип автора. Все рекомендации и подсказки будут адаптированы специально для вас.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
