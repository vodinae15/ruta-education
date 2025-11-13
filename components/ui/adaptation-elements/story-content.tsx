"use client"

import { Card, CardContent } from "@/components/ui/card"
import { VolumeIcon } from "@/components/ui/icons"

interface StoryContentProps {
  data: any
  description: string
  onInteraction?: (type: string, data?: any) => void
}

export function StoryContent({ data, description, onInteraction }: StoryContentProps) {
  return (
    <Card className="bg-white border-2 border-green-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <VolumeIcon className="w-5 h-5" />
            <span className="font-semibold">История / Кейс</span>
          </div>
          
          {data?.title && (
            <h4 className="text-lg font-semibold text-gray-900">{data.title}</h4>
          )}

          {data?.text && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {data.text}
              </p>
            </div>
          )}

          {data?.story && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {data.story}
              </p>
            </div>
          )}

          {!data?.text && !data?.story && description && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {data?.questions && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-green-900 mb-2">Вопросы для размышления:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {data.questions.map((question: string, index: number) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

