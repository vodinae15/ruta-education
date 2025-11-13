"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { StudentTypeResult } from "@/lib/student-test-logic"

interface StudentTestResultsProps {
  studentTypeResult: StudentTypeResult
}

export function StudentTestResults({ studentTypeResult }: StudentTestResultsProps) {
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
                  {studentTypeResult.title}
                </Badge>
                <p className="text-xl lg:text-2xl text-slate-900 font-medium leading-relaxed">{studentTypeResult.description}</p>
              </div>

              {/* Learning style highlight as a prominent side element */}
              <div className="lg:w-80">
                <div className="bg-white border-2 rounded-2xl p-6 shadow-ruta-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">🎯</span>
                    </div>
                    <h3 className="font-bold text-primary text-lg">Ваш стиль обучения</h3>
                  </div>
                  <p className="text-slate-700 font-semibold text-lg leading-tight">
                    {studentTypeResult.perception === "visual-analytical" && "Визуально-аналитический"}
                    {studentTypeResult.perception === "auditory-empathetic" && "Аудиально-эмпатический"}
                    {studentTypeResult.perception === "kinesthetic-practical" && "Кинестетически-практический"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Format Recommendations */}
        <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-primary font-bold">Рекомендуемые форматы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {studentTypeResult.recommendations.format.map((tip, index) => (
              <div key={index} className="flex items-start bg-light-blue/30 p-2 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Communication Recommendations */}
        <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-primary font-bold">Стиль общения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {studentTypeResult.recommendations.communication.map((tip, index) => (
              <div key={index} className="flex items-start bg-light-blue/30 p-2 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Adaptation Recommendations */}
        <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-primary font-bold">Адаптация курса</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {studentTypeResult.recommendations.adaptation.map((tip, index) => (
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
          <CardTitle className="text-xl text-primary font-bold">Ваши персональные советы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {studentTypeResult.personalTips.map((tip, index) => (
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
