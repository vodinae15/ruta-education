import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Zap, Trash2, Plus } from "lucide-react"

interface PracticalSection {
  id: string
  title: string
  content: string
}

interface PracticalTextProps {
  isEmpty?: boolean
  sections?: PracticalSection[]
  mainText?: string
  isEditing?: boolean
  onSectionsChange?: (sections: PracticalSection[]) => void
  onMainTextChange?: (text: string) => void
}

export function PracticalText({ isEmpty = true, sections, mainText, isEditing = false, onSectionsChange, onMainTextChange }: PracticalTextProps) {
  const defaultSections: PracticalSection[] = [
    { id: "1", title: "Практическое применение", content: "Попробуйте провести простой эксперимент: смешайте соду и уксус." },
  ]

  const displaySections = sections && sections.length > 0 ? sections : defaultSections
  const [localSections, setLocalSections] = useState<PracticalSection[]>(displaySections)

  const handleSectionChange = (id: string, field: keyof PracticalSection, value: string) => {
    const updated = localSections.map(section =>
      section.id === id ? { ...section, [field]: value } : section
    )
    setLocalSections(updated)
    onSectionsChange?.(updated)
  }

  const handleAddSection = () => {
    const newSection: PracticalSection = {
      id: `practical-${Date.now()}`,
      title: "",
      content: ""
    }
    const updated = [...localSections, newSection]
    setLocalSections(updated)
    onSectionsChange?.(updated)
  }

  const handleRemoveSection = (id: string) => {
    const updated = localSections.filter(section => section.id !== id)
    setLocalSections(updated)
    onSectionsChange?.(updated)
  }

  return (
    <BlockWrapper
      blockNumber={2}
      title="Основы темы"
      intro="Практико-ориентированное изложение с акцентом на действия"
      isEmpty={false}
      mainText={mainText}
      isEditing={isEditing}
      onMainTextChange={onMainTextChange}
    >
      {isEditing ? (
        <div className="space-y-4">
          {localSections.map((section, index) => (
            <div key={section.id} className="border-2 border-[#659AB8] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Практический блок {index + 1}</h4>
                {localSections.length > 1 && (
                  <button
                    onClick={() => handleRemoveSection(section.id)}
                    className="text-[#659AB8] hover:text-[#5589a7] p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Заголовок (акцент на действие)
                  </label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7]"
                    placeholder="Например: Попробуйте сами, Проведите эксперимент..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Инструкция или описание действия
                  </label>
                  <textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7] min-h-[100px]"
                    placeholder="Опишите практическую активность или упражнение"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddSection}
            className="w-full py-3 border-2 border-dashed border-[#659AB8] rounded-lg text-[#659AB8] hover:bg-[#E8F4FA] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить практический блок
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displaySections.map((section) => (
            <div key={section.id} className="bg-[#E8F4FA] border-l-4 border-[#659AB8] rounded-r-lg p-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                    {section.title}
                  </h4>
                  <p className={`text-sm ${isEmpty ? "text-slate-400" : "text-slate-600"}`}>
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockWrapper>
  )
}
