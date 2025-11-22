"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  EditIcon, 
  TrashIcon, 
  PlusIcon, 
  SaveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  PlayIcon,
  FileTextIcon,
  ImageIcon,
  DownloadIcon,
  MessageCircleIcon,
  CheckCircleIcon,
  HelpCircleIcon
} from "@/components/ui/icons"
import { type AdaptationContent, type AdaptationBlock, type ContentElement, type ContentElementType } from "@/lib/adaptation-logic"
import { AdaptationElementRenderer } from "./adaptation-elements/adaptation-element-renderer"
import { ConfirmationModal } from "./confirmation-modal"

interface AdaptationEditorProps {
  content: AdaptationContent
  onSave: (content: AdaptationContent) => void
  onCancel?: () => void
  isSaving?: boolean
}

export function AdaptationEditor({ content, onSave, onCancel, isSaving = false }: AdaptationEditorProps) {
  const [editedContent, setEditedContent] = useState<AdaptationContent>(content)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set(['block1', 'block2', 'block3', 'block4', 'block5']))
  const [editingBlock, setEditingBlock] = useState<string | null>(null)
  const [additionalBlocks, setAdditionalBlocks] = useState<Record<string, AdaptationBlock>>({})
  const [openElementMenus, setOpenElementMenus] = useState<Set<string>>(new Set())
  const [showDeleteElementConfirm, setShowDeleteElementConfirm] = useState<{ blockId: keyof AdaptationContent; elementId: string; elementLabel: string } | null>(null)
  const [showDeleteIntroConfirm, setShowDeleteIntroConfirm] = useState<{ blockId: keyof AdaptationContent; field?: 'title' | 'text' | 'adaptation' } | null>(null)
  const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] = useState<{ blockId: keyof AdaptationContent; sectionIndex: number } | null>(null)

  const toggleBlock = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks)
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId)
    } else {
      newExpanded.add(blockId)
    }
    setExpandedBlocks(newExpanded)
  }

  const updateBlock = (blockId: keyof AdaptationContent, updates: Partial<AdaptationBlock>) => {
    setEditedContent(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        ...updates
      }
    }))
  }

  const updateIntro = (blockId: keyof AdaptationContent, text: string) => {
    updateBlock(blockId, {
      intro: {
        ...editedContent[blockId].intro,
        text
      }
    })
  }

  const removeIntro = (blockId: keyof AdaptationContent) => {
    updateBlock(blockId, {
      intro: {
        text: '',
        type: 'intro'
      }
    })
  }

  const removeContentField = (blockId: keyof AdaptationContent, field: 'title' | 'text') => {
    updateBlock(blockId, {
      content: {
        ...editedContent[blockId].content,
        [field]: ''
      }
    })
  }

  const removeSectionField = (blockId: keyof AdaptationContent, sectionIndex: number, field: 'title' | 'content' | 'highlighted') => {
    const block = editedContent[blockId]
    const sections = block.content.sections || []
    const updatedSections = sections.map((section, idx) => {
      if (idx === sectionIndex) {
        if (field === 'highlighted') {
          return { ...section, highlighted: [] }
        } else {
          return { ...section, [field]: '' }
        }
      }
      return section
    })
    
    updateBlock(blockId, {
      content: {
        ...block.content,
        sections: updatedSections
      }
    })
  }

  const removeAdaptationElement = (blockId: keyof AdaptationContent) => {
    // Удаляем адаптированный элемент полностью - устанавливаем пустой элемент
    const block = editedContent[blockId]
    updateBlock(blockId, {
      ...block,
      adaptation: {
        type: block.adaptation.type,
        element: {
          type: 'diagram' as const,
          data: {},
          description: ''
        }
      }
    })
  }

  const updateContent = (blockId: keyof AdaptationContent, field: 'title' | 'text', value: string) => {
    updateBlock(blockId, {
      content: {
        ...editedContent[blockId].content,
        [field]: value
      }
    })
  }

  const updateSection = (blockId: keyof AdaptationContent, sectionIndex: number, updates: Partial<{ title: string; content: string; highlighted: string[] }>) => {
    const block = editedContent[blockId]
    const sections = block.content.sections || []
    const updatedSections = sections.map((section, idx) => 
      idx === sectionIndex ? { ...section, ...updates } : section
    )
    
    updateBlock(blockId, {
      content: {
        ...block.content,
        sections: updatedSections
      }
    })
  }

  const addSection = (blockId: keyof AdaptationContent) => {
    const block = editedContent[blockId]
    const sections = block.content.sections || []
    updateBlock(blockId, {
      content: {
        ...block.content,
        sections: [...sections, { title: '', content: '', highlighted: [] }]
      }
    })
  }

  const removeSection = (blockId: keyof AdaptationContent, sectionIndex: number) => {
    const block = editedContent[blockId]
    const sections = block.content.sections || []
    updateBlock(blockId, {
      content: {
        ...block.content,
        sections: sections.filter((_, idx) => idx !== sectionIndex)
      }
    })
  }

  const updateHighlightedTerms = (blockId: keyof AdaptationContent, sectionIndex: number, terms: string) => {
    const termsArray = terms.split(',').map(t => t.trim()).filter(t => t.length > 0)
    updateSection(blockId, sectionIndex, { highlighted: termsArray })
  }

  // Функции для работы с элементами
  const addElement = (blockId: keyof AdaptationContent, elementType: ContentElementType) => {
    const block = editedContent[blockId]
    const elements = block.content.elements || []
    const newElement: ContentElement = {
      id: Date.now().toString(),
      type: elementType,
      content: "",
      required: false,
      completed: false
    }
    
    updateBlock(blockId, {
      content: {
        ...block.content,
        elements: [...elements, newElement]
      }
    })
  }

  const handleRemoveElementClick = (blockId: keyof AdaptationContent, elementId: string) => {
    const block = editedContent[blockId]
    const elements = block.content.elements || []
    const element = elements.find(el => el.id === elementId)
    
    if (!element) return
    
    const elementLabel = getElementLabel(element.type)
    setShowDeleteElementConfirm({ blockId, elementId, elementLabel })
  }

  const removeElement = (blockId: keyof AdaptationContent, elementId: string) => {
    const block = editedContent[blockId]
    const elements = block.content.elements || []
    
    updateBlock(blockId, {
      content: {
        ...block.content,
        elements: elements.filter(el => el.id !== elementId)
      }
    })
    setShowDeleteElementConfirm(null)
  }

  const updateElementContent = (blockId: keyof AdaptationContent, elementId: string, content: string) => {
    const block = editedContent[blockId]
    const elements = block.content.elements || []
    
    updateBlock(blockId, {
      content: {
        ...block.content,
        elements: elements.map(el => 
          el.id === elementId ? { ...el, content } : el
        )
      }
    })
  }

  const getElementIcon = (type: ContentElementType) => {
    switch (type) {
      case "video":
        return PlayIcon
      case "audio":
        return MessageCircleIcon
      case "image":
        return ImageIcon
      case "task":
        return CheckCircleIcon
      case "test":
        return HelpCircleIcon
      case "file":
        return DownloadIcon
      default:
        return FileTextIcon
    }
  }

  const getElementLabel = (type: ContentElementType) => {
    switch (type) {
      case "title":
        return "Заголовок"
      case "text":
        return "Текст"
      case "video":
        return "Видео"
      case "audio":
        return "Аудио"
      case "image":
        return "Изображение"
      case "task":
        return "Задание"
      case "test":
        return "Тест"
      case "file":
        return "Файл"
      default:
        return "Элемент"
    }
  }

  const getElementPlaceholder = (type: ContentElementType) => {
    switch (type) {
      case "title":
        return "Введите заголовок"
      case "text":
        return "Напишите текст..."
      case "video":
        return "Вставьте ссылку на видео"
      case "audio":
        return "Загрузите аудиозапись"
      case "image":
        return "Загрузите изображение"
      case "task":
        return "Опишите задание"
      case "test":
        return "Создайте вопросы для проверки"
      case "file":
        return "Загрузите файл"
      default:
        return "Введите содержимое"
    }
  }

  const handleSave = () => {
    // Сохраняем только основные 5 блоков (дополнительные блоки можно добавить позже)
    onSave(editedContent)
  }

  const blockNames: Record<keyof AdaptationContent, string> = {
    block1: 'Блок 1: Обзор темы',
    block2: 'Блок 2: Основы темы',
    block3: 'Блок 3: Практическое закрепление',
    block4: 'Блок 4: Углублённое изучение',
    block5: 'Блок 5: Итоговое задание'
  }

  // Функция для создания пустого блока
  const createEmptyBlock = (): AdaptationBlock => ({
    intro: {
      text: '',
      type: 'intro'
    },
    content: {
      title: '',
      text: '',
      sections: [],
      type: 'text'
    },
    adaptation: {
      type: 'visual',
      element: {
        type: 'diagram', // Используем diagram как базовый тип
        data: { nodes: [], connections: [] },
        description: ''
      }
    }
  })

  // Удаление блока (оставляем пустую структуру)
  const clearBlock = (blockId: keyof AdaptationContent) => {
    if (confirm(`Вы уверены, что хотите очистить ${blockNames[blockId]}?`)) {
      updateBlock(blockId, createEmptyBlock())
    }
  }

  return (
    <div className="space-y-6">
      {/* Кнопки управления */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Редактор адаптации</h3>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Отмена
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#659AB8] hover:bg-[#659AB8]/90 text-white"
          >
            {isSaving ? (
              <>
                <SaveIcon className="w-4 h-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <SaveIcon className="w-4 h-4 mr-2" />
                Сохранить все изменения
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Основные блоки адаптации */}
      {(Object.keys(editedContent) as Array<keyof AdaptationContent>).map((blockId) => {
        const block = editedContent[blockId]
        const isExpanded = expandedBlocks.has(blockId)
        const isEditing = editingBlock === blockId

        return (
          <Card key={blockId} className="border-2 border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVerticalIcon className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg">{blockNames[blockId]}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => setEditingBlock(isEditing ? null : blockId)}
                  >
                    <EditIcon className="w-4 h-4 mr-2" />
                    {isEditing ? 'Закрыть редактор' : 'Редактировать'}
                  </Button>
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => clearBlock(blockId)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Очистить блок"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => toggleBlock(blockId)}
                  >
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-6">
                {/* Слой 1: Подводка (intro) */}
                {(!isEditing || block.intro.text) && (
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold text-blue-800">Подводка (intro)</Label>
                      {isEditing && block.intro.text && (
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => setShowDeleteIntroConfirm({ blockId })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Удалить подводку"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={block.intro.text}
                        onChange={(e) => updateIntro(blockId, e.target.value)}
                        className="min-h-[80px] bg-white"
                        placeholder="Введите подводку к блоку (2-3 предложения)..."
                      />
                    ) : (
                      <p className="text-blue-800 italic leading-relaxed whitespace-pre-wrap">{block.intro.text}</p>
                    )}
                  </div>
                )}
                {isEditing && !block.intro.text && (
                  <div className="p-4 bg-blue-50/30 rounded-lg border-l-4 border-blue-200 border-dashed">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-blue-600">Подводка (intro)</Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => updateIntro(blockId, '')}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Добавить подводку
                      </Button>
                    </div>
                  </div>
                )}

                {/* Слой 2: Контент (content) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-slate-700">Улучшенная текстовая версия</Label>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-4">
                      {(!block.content.title && !block.content.text) || block.content.title || block.content.text ? (
                        <>
                          {block.content.title && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label htmlFor={`${blockId}-title`}>Заголовок блока</Label>
                                <Button
                                  type="button"
                                  variant="text"
                                  size="sm"
                                  onClick={() => setShowDeleteIntroConfirm({ blockId: blockId, field: 'title' })}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Удалить заголовок"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                              <Input
                                id={`${blockId}-title`}
                                value={block.content.title}
                                onChange={(e) => updateContent(blockId, 'title', e.target.value)}
                                placeholder="Введите заголовок блока..."
                                className="mt-1"
                              />
                            </div>
                          )}
                          
                          {block.content.text && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label htmlFor={`${blockId}-text`}>Основной текст</Label>
                                <Button
                                  type="button"
                                  variant="text"
                                  size="sm"
                                  onClick={() => setShowDeleteIntroConfirm({ blockId: blockId, field: 'text' })}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Удалить текст"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                              <Textarea
                                id={`${blockId}-text`}
                                value={block.content.text}
                                onChange={(e) => updateContent(blockId, 'text', e.target.value)}
                                className="min-h-[200px] mt-1"
                                placeholder="Введите основной текст блока..."
                              />
                            </div>
                          )}
                        </>
                      ) : null}
                      
                      {!block.content.title && !block.content.text && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-600">Текстовый контент</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => updateContent(blockId, 'title', '')}
                                className="text-slate-600 hover:text-slate-700"
                              >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Добавить заголовок
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => updateContent(blockId, 'text', '')}
                                className="text-slate-600 hover:text-slate-700"
                              >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Добавить текст
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Секции */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Секции</Label>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => addSection(blockId)}
                          >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Добавить секцию
                          </Button>
                        </div>

                        {block.content.sections?.map((section, sectionIndex) => (
                          <Card key={sectionIndex} className="border border-slate-200">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Секция {sectionIndex + 1}</Label>
                                <Button
                                  type="button"
                                  variant="text"
                                  size="sm"
                                  onClick={() => {
                                    setShowDeleteSectionConfirm({ blockId, sectionIndex })
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Удалить секцию"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              {(section.title || section.content || (section.highlighted && section.highlighted.length > 0)) ? (
                                <>
                                  {section.title && (
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <Label>Заголовок секции</Label>
                                        <Button
                                          type="button"
                                          variant="text"
                                          size="sm"
                                          onClick={() => removeSectionField(blockId, sectionIndex, 'title')}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Удалить заголовок секции"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <Input
                                        value={section.title}
                                        onChange={(e) => updateSection(blockId, sectionIndex, { title: e.target.value })}
                                        placeholder="Заголовок секции..."
                                        className="mt-1"
                                      />
                                    </div>
                                  )}
                                  
                                  {section.content && (
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <Label>Содержание секции</Label>
                                        <Button
                                          type="button"
                                          variant="text"
                                          size="sm"
                                          onClick={() => removeSectionField(blockId, sectionIndex, 'content')}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Удалить содержание секции"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <Textarea
                                        value={section.content}
                                        onChange={(e) => updateSection(blockId, sectionIndex, { content: e.target.value })}
                                        className="min-h-[100px] mt-1"
                                        placeholder="Содержание секции..."
                                      />
                                    </div>
                                  )}
                                  
                                  {section.highlighted && section.highlighted.length > 0 && (
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <Label>Ключевые термины (через запятую)</Label>
                                        <Button
                                          type="button"
                                          variant="text"
                                          size="sm"
                                          onClick={() => removeSectionField(blockId, sectionIndex, 'highlighted')}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Удалить ключевые термины"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <Input
                                        value={section.highlighted.join(', ')}
                                        onChange={(e) => updateHighlightedTerms(blockId, sectionIndex, e.target.value)}
                                        placeholder="термин1, термин2, термин3..."
                                        className="mt-1"
                                      />
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {section.highlighted.map((term, termIndex) => (
                                          <Badge key={termIndex} variant="warning" className="text-yellow-700">
                                            {term}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="p-3 bg-slate-50 rounded border border-slate-200 border-dashed">
                                  <p className="text-sm text-slate-500 text-center">Секция пуста. Добавьте заголовок, содержание или термины.</p>
                                </div>
                              )}
                              
                              <div className="flex gap-2 pt-2">
                                {!section.title && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => updateSection(blockId, sectionIndex, { title: '' })}
                                    className="text-slate-600 hover:text-slate-700"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Добавить заголовок
                                  </Button>
                                )}
                                {!section.content && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => updateSection(blockId, sectionIndex, { content: '' })}
                                    className="text-slate-600 hover:text-slate-700"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Добавить содержание
                                  </Button>
                                )}
                                {(!section.highlighted || section.highlighted.length === 0) && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => updateSection(blockId, sectionIndex, { highlighted: [] })}
                                    className="text-slate-600 hover:text-slate-700"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Добавить термины
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Элементы контента */}
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Элементы контента</Label>
                          <div className="relative">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                const newOpenMenus = new Set(openElementMenus)
                                if (newOpenMenus.has(blockId)) {
                                  newOpenMenus.delete(blockId)
                                } else {
                                  newOpenMenus.add(blockId)
                                }
                                setOpenElementMenus(newOpenMenus)
                              }}
                            >
                              <PlusIcon className="w-4 h-4 mr-2" />
                              Добавить элемент
                            </Button>
                            {/* Меню выбора типа элемента */}
                            {openElementMenus.has(blockId) && (
                              <div 
                                className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-lg p-2 z-50 min-w-[250px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-2 gap-2">
                                  {(["text", "video", "audio", "image", "file", "task", "test"] as ContentElementType[]).map((elementType) => {
                                    const Icon = getElementIcon(elementType)
                                    const label = getElementLabel(elementType)
                                    return (
                                      <Button
                                        key={elementType}
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                          addElement(blockId, elementType)
                                          const newOpenMenus = new Set(openElementMenus)
                                          newOpenMenus.delete(blockId)
                                          setOpenElementMenus(newOpenMenus)
                                        }}
                                        className="h-10 text-sm justify-start"
                                      >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {label}
                                      </Button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {block.content.elements?.map((element) => {
                          const Icon = getElementIcon(element.type)
                          return (
                            <Card key={element.id} className="border border-slate-200">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#659AB8] rounded-full flex items-center justify-center">
                                      <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-semibold text-[#659AB8]">
                                      {getElementLabel(element.type)}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="text"
                                    size="sm"
                                    onClick={() => handleRemoveElementClick(blockId, element.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Удалить элемент"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {element.type === "title" ? (
                                  <Input
                                    value={element.content}
                                    onChange={(e) => updateElementContent(blockId, element.id, e.target.value)}
                                    placeholder={getElementPlaceholder(element.type)}
                                    className="h-11"
                                  />
                                ) : element.type === "video" ? (
                                  <Input
                                    type="url"
                                    value={element.content}
                                    onChange={(e) => updateElementContent(blockId, element.id, e.target.value)}
                                    placeholder={getElementPlaceholder(element.type)}
                                    className="h-11"
                                  />
                                ) : element.type === "audio" || element.type === "image" || element.type === "file" ? (
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <input
                                      type="file"
                                      accept={element.type === "audio" ? "audio/*" : element.type === "image" ? "image/*" : "*"}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          updateElementContent(blockId, element.id, `${element.type === "audio" ? "Аудио" : element.type === "image" ? "Изображение" : "Файл"}: ${file.name}`)
                                        }
                                      }}
                                      className="hidden"
                                      id={`${element.type}-${element.id}`}
                                    />
                                    <label htmlFor={`${element.type}-${element.id}`} className="cursor-pointer">
                                      <div className="text-gray-500">
                                        <p className="text-sm">{element.content || "Выберите файл"}</p>
                                      </div>
                                    </label>
                                  </div>
                                ) : element.type === "test" ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={element.content}
                                      onChange={(e) => updateElementContent(blockId, element.id, e.target.value)}
                                      placeholder={getElementPlaceholder(element.type)}
                                      rows={4}
                                    />
                                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                      Для создания теста используйте формат JSON или текстовый формат с вопросами
                                    </p>
                                  </div>
                                ) : (
                                  <Textarea
                                    value={element.content}
                                    onChange={(e) => updateElementContent(blockId, element.id, e.target.value)}
                                    placeholder={getElementPlaceholder(element.type)}
                                    rows={4}
                                  />
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none">
                      <h3 className="text-xl font-semibold text-[#1E293B] mb-3">{block.content.title}</h3>
                      <p className="text-[#1E293B] leading-relaxed whitespace-pre-wrap">{block.content.text}</p>
                      
                      {block.content.sections && block.content.sections.map((section, index) => (
                        <div key={index} className="mt-4">
                          <h4 className="text-lg font-semibold text-[#1E293B] mb-2">{section.title}</h4>
                          <p className="text-[#64748B] leading-relaxed whitespace-pre-wrap">{section.content}</p>
                          {section.highlighted && section.highlighted.length > 0 && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-sm font-medium text-yellow-800 mb-1">Ключевые термины:</p>
                              <div className="flex flex-wrap gap-2">
                                {section.highlighted.map((term, termIndex) => (
                                  <Badge key={termIndex} variant="warning" className="text-yellow-700">
                                    {term}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {block.content.elements && block.content.elements.map((element) => {
                        const Icon = getElementIcon(element.type)
                        return (
                          <div key={element.id} className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-5 h-5 text-[#659AB8]" />
                              <span className="font-semibold text-[#659AB8]">{getElementLabel(element.type)}</span>
                            </div>
                            {element.type === "video" && element.content ? (
                              <div className="mt-2">
                                <a href={element.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {element.content}
                                </a>
                              </div>
                            ) : (
                              <p className="text-[#64748B] whitespace-pre-wrap">{element.content}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Слой 3: Адаптированный элемент */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold text-slate-700">Адаптированный элемент</Label>
                    <div className="flex items-center gap-2">
                      {block.adaptation.element && block.adaptation.element.type && (
                        <Badge variant="info" className="text-slate-600">
                          {block.adaptation.element.type}
                        </Badge>
                      )}
                      {isEditing && block.adaptation.element && block.adaptation.element.type && (
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => {
                            setShowDeleteIntroConfirm({ blockId: blockId, field: 'adaptation' })
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Удалить адаптированный элемент"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {block.adaptation.element && block.adaptation.element.type ? (
                    <>
                      {isEditing ? (
                        <div className="bg-white p-4 rounded border border-slate-200">
                          <p className="text-sm text-slate-600 mb-2">
                            Редактирование адаптированного элемента доступно через JSON редактор.
                          </p>
                          <Textarea
                            value={JSON.stringify(block.adaptation.element, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                updateBlock(blockId, {
                                  adaptation: {
                                    ...block.adaptation,
                                    element: parsed
                                  }
                                })
                              } catch (err) {
                                // Игнорируем ошибки парсинга во время ввода
                              }
                            }}
                            className="min-h-[200px] font-mono text-xs"
                            placeholder='{"type": "diagram", "data": {...}, "description": "..."}'
                          />
                          <p className="text-xs text-slate-500 mt-2">
                            Описание: {block.adaptation.element.description || ''}
                          </p>
                        </div>
                      ) : (
                        <AdaptationElementRenderer
                          element={block.adaptation.element}
                          blockNumber={parseInt(blockId.replace('block', ''))}
                          onInteraction={() => {}}
                        />
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                      {isEditing ? (
                        <div className="text-center">
                          <p className="text-sm text-slate-500 mb-3">Адаптированный элемент удален</p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              updateBlock(blockId, {
                                adaptation: {
                                  ...block.adaptation,
                                  element: {
                                    type: 'diagram',
                                    data: { nodes: [], connections: [] },
                                    description: ''
                                  }
                                }
                              })
                            }}
                            className="text-slate-600 hover:text-slate-700"
                          >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Добавить адаптированный элемент
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center">Адаптированный элемент отсутствует</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Модальное окно подтверждения удаления элемента */}
      {showDeleteElementConfirm && (
        <ConfirmationModal
          isOpen={!!showDeleteElementConfirm}
          onClose={() => setShowDeleteElementConfirm(null)}
          onConfirm={() => {
            if (showDeleteElementConfirm) {
              removeElement(showDeleteElementConfirm.blockId, showDeleteElementConfirm.elementId)
            }
          }}
          title="Удалить элемент?"
          message={`Вы уверены, что хотите удалить элемент "${showDeleteElementConfirm.elementLabel}"?`}
          confirmText="Удалить"
          cancelText="Отмена"
          confirmVariant="default"
        />
      )}

      {/* Модальное окно подтверждения удаления подводки/заголовка/текста */}
      {showDeleteIntroConfirm && (
        <ConfirmationModal
          isOpen={!!showDeleteIntroConfirm}
          onClose={() => setShowDeleteIntroConfirm(null)}
          onConfirm={() => {
            if (showDeleteIntroConfirm) {
              if (showDeleteIntroConfirm.field === 'title') {
                removeContentField(showDeleteIntroConfirm.blockId, 'title')
              } else if (showDeleteIntroConfirm.field === 'text') {
                removeContentField(showDeleteIntroConfirm.blockId, 'text')
              } else if (showDeleteIntroConfirm.field === 'adaptation') {
                removeAdaptationElement(showDeleteIntroConfirm.blockId)
              } else {
                removeIntro(showDeleteIntroConfirm.blockId)
              }
              setShowDeleteIntroConfirm(null)
            }
          }}
          title={showDeleteIntroConfirm.field === 'title' ? 'Удалить заголовок?' : showDeleteIntroConfirm.field === 'text' ? 'Удалить текст?' : showDeleteIntroConfirm.field === 'adaptation' ? 'Удалить адаптированный элемент?' : 'Удалить подводку?'}
          message={showDeleteIntroConfirm.field === 'title' ? 'Вы уверены, что хотите удалить заголовок этого блока?' : showDeleteIntroConfirm.field === 'text' ? 'Вы уверены, что хотите удалить основной текст этого блока?' : showDeleteIntroConfirm.field === 'adaptation' ? 'Вы уверены, что хотите удалить адаптированный элемент? Он будет заменен на пустой элемент.' : 'Вы уверены, что хотите удалить подводку к этому блоку?'}
          confirmText="Удалить"
          cancelText="Отмена"
          confirmVariant="default"
        />
      )}

      {/* Модальное окно подтверждения удаления секции */}
      {showDeleteSectionConfirm && (
        <ConfirmationModal
          isOpen={!!showDeleteSectionConfirm}
          onClose={() => setShowDeleteSectionConfirm(null)}
          onConfirm={() => {
            if (showDeleteSectionConfirm) {
              removeSection(showDeleteSectionConfirm.blockId, showDeleteSectionConfirm.sectionIndex)
              setShowDeleteSectionConfirm(null)
            }
          }}
          title="Удалить секцию?"
          message={`Вы уверены, что хотите удалить секцию ${(showDeleteSectionConfirm.sectionIndex + 1)}?`}
          confirmText="Удалить"
          cancelText="Отмена"
          confirmVariant="default"
        />
      )}
    </div>
  )
}

