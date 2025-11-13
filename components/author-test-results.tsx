"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { AuthorTypeResult } from "@/lib/author-test-logic"

interface AuthorTestResultsProps {
  authorTypeResult: AuthorTypeResult
}

export function AuthorTestResults({ authorTypeResult }: AuthorTestResultsProps) {
  const router = useRouter()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="relative">
        {/* Main card with type and description */}
        <Card className="bg-light-blue border-2 rounded-2xl shadow-ruta-sm">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <Badge className="bg-primary text-white px-6 py-3 text-xl font-semibold mb-4">
                  {authorTypeResult.title}
                </Badge>
                <p className="text-xl lg:text-2xl text-slate-900 font-medium leading-relaxed">{authorTypeResult.description}</p>
              </div>

              {/* Strength highlight as a prominent side element */}
              <div className="lg:w-80">
                <div className="bg-white border-2 rounded-2xl p-6 shadow-ruta-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">★</span>
                    </div>
                    <h3 className="font-bold text-primary text-lg">Ваша суперсила</h3>
                  </div>
                  <p className="text-slate-700 font-semibold text-lg leading-tight">
                    {authorTypeResult.superpower}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Style Recommendations */}
        <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-primary font-bold">По стилю подачи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {authorTypeResult.recommendations.style.map((tip, index) => (
              <div key={index} className="flex items-start bg-light-blue/30 p-2 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Motivation Recommendations */}
        <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-primary font-bold">По мотивации</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {authorTypeResult.recommendations.motivation.map((tip, index) => (
              <div key={index} className="flex items-start bg-light-blue/30 p-2 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Barrier Recommendations */}
        <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-primary font-bold">По преодолению барьеров</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {authorTypeResult.recommendations.barriers.map((tip, index) => (
              <div key={index} className="flex items-start bg-light-blue/30 p-2 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Personal Tips */}
      <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-primary font-bold">Ваши персональные подсказки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {authorTypeResult.personalTips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start p-2 bg-light-blue/30 rounded-lg"
              >
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-2 flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-primary font-bold">Что делать дальше</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => router.push("/course-constructor")}
              className="flex items-center gap-2 h-12 px-6 flex-1"
            >
              Создать курс
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 h-12 px-6"
            >
              В личный кабинет
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-light-blue/30 rounded-lg">
            <p className="text-sm text-slate-600 leading-relaxed">
              <span className="font-semibold text-primary">Совет:</span> Ваш конструктор курсов теперь настроен под
              ваш тип автора. Все рекомендации и подсказки будут адаптированы специально для вас.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-semibold">Тест завершён • Профиль настроен</span>
        </div>
      </div>
    </div>
  )
}
