import React, { useState } from "react"
import { BlockWrapper } from "../../blocks/BlockWrapper"
import { Trash2, Plus } from "lucide-react"

interface TextSection {
  id: string
  title: string
  content: string
}

interface StructuredTextProps {
  isEmpty?: boolean
  sections?: TextSection[]
  mainText?: string
  isEditing?: boolean
  onSectionsChange?: (sections: TextSection[]) => void
  onMainTextChange?: (text: string) => void
}

export function StructuredText({ isEmpty = true, sections, mainText, isEditing = false, onSectionsChange, onMainTextChange }: StructuredTextProps) {
  const defaultSections: TextSection[] = [
    { id: "1", title: "Первый раздел", content: "Абзац с описанием первой концепции..." },
    { id: "2", title: "Второй раздел", content: "Абзац с описанием второй концепции..." },
    { id: "3", title: "Третий раздел", content: "Абзац с описанием третьей концепции..." },
  ]

  const displaySections = sections && sections.length > 0 ? sections : defaultSections
  const [localSections, setLocalSections] = useState<TextSection[]>(displaySections)

  const handleSectionChange = (id: string, field: keyof TextSection, value: string) => {
    const updated = localSections.map(section =>
      section.id === id ? { ...section, [field]: value } : section
    )
    setLocalSections(updated)
    onSectionsChange?.(updated)
  }

  const handleAddSection = () => {
    const newSection: TextSection = {
      id: `section-${Date.now()}`,
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
                <h4 className="text-sm font-semibold text-slate-900">Раздел {index + 1}</h4>
                {localSections.length > 1 && (
                  <button
                    onClick={() => handleRemoveSection(section.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Заголовок раздела
                  </label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7]"
                    placeholder="Введите заголовок"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Содержание раздела
                  </label>
                  <textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                    className="w-full px-3 py-2 border border-[#659AB8] rounded text-sm focus:outline-none focus:border-[#5589a7] min-h-[100px]"
                    placeholder="Введите содержание раздела"
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
            Добавить раздел
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displaySections.map((section, index) => (
            <div key={section.id}>
              <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                {section.title}
              </h3>
              <div className="pl-7">
                <p className={`text-sm ${isEmpty ? "text-slate-400" : "text-slate-600"}`}>
                  {section.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockWrapper>
  )
}
