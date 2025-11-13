// Adaptation Logic - утилиты для работы с адаптациями уроков
// Этот файл содержит функции для работы с адаптированным контентом уроков

import { createClient } from "@/lib/supabase/client"

// Типы для адаптации
export type AdaptationType = 'visual' | 'auditory' | 'kinesthetic' | 'original'
export type AdaptationMode = 'visual' | 'auditory' | 'kinesthetic' | 'original'
export type AdaptationStatus = 'pending' | 'generated' | 'edited' | 'published'
export type AIGenerationStatus = 'pending' | 'processing' | 'completed' | 'error'

// Структура подводки блока
export interface BlockIntro {
  text: string
  type: 'intro'
}

// Типы элементов контента (как в конструкторе курса)
export type ContentElementType = "title" | "text" | "video" | "audio" | "image" | "task" | "test" | "file"

export interface ContentElement {
  id: string
  type: ContentElementType
  content: string
  required?: boolean
  completed?: boolean
}

// Структура улучшенного текстового контента
export interface BlockContent {
  title: string
  text: string
  sections?: Array<{
    title: string
    content: string
    highlighted?: string[]
  }>
  elements?: ContentElement[] // Элементы контента (как в конструкторе курса)
  type: 'text'
}

// Структура адаптированного элемента
export interface AdaptationElement {
  type: 'diagram' | 'audio' | 'simulation' | 'table' | 'story' | 'interactive' | 'checklist'
  data: any
  description: string
}

// Структура адаптации блока
export interface AdaptationBlock {
  intro: BlockIntro
  content: BlockContent
  adaptation: {
    type: AdaptationType
    element: AdaptationElement
  }
}

// Структура адаптированного контента урока
export interface AdaptationContent {
  block1: AdaptationBlock
  block2: AdaptationBlock
  block3: AdaptationBlock
  block4: AdaptationBlock
  block5: AdaptationBlock
}

// Структура адаптации урока в БД
export interface LessonAdaptation {
  id: string
  lesson_id: string
  adaptation_type: AdaptationType
  status: AdaptationStatus
  block1: AdaptationBlock
  block2: AdaptationBlock
  block3: AdaptationBlock
  block4: AdaptationBlock
  block5: AdaptationBlock
  generated_at: string | null
  edited_at: string | null
  edited_by: string | null
  version: number
  created_at: string
  updated_at: string
}

// Структура метаданных адаптации
export interface AdaptationMetadata {
  id: string
  lesson_id: string
  adaptation_type: AdaptationType
  has_audio: boolean
  has_video: boolean
  has_images: boolean
  has_diagrams: boolean
  has_practice: boolean
  recommendations: Array<{
    type: string
    message: string
    priority?: 'low' | 'medium' | 'high'
  }>
  ai_generation_status: AIGenerationStatus
  ai_generation_error: string | null
  ai_generation_timestamp: string | null
  created_at: string
  updated_at: string
}

// Результат анализа материалов урока
export interface MaterialsAnalysis {
  has_audio: boolean
  has_video: boolean
  has_images: boolean
  has_diagrams: boolean
  has_practice: boolean
  recommendations: Array<{
    type: string
    message: string
    priority?: 'low' | 'medium' | 'high'
  }>
}

/**
 * Нормализует тип студента для адаптации
 * Преобразует сложные типы (visual-analytical, auditory-empathetic, etc.) в базовые (visual, auditory, kinesthetic)
 * 
 * @param studentType - Тип студента из теста
 * @returns Нормализованный тип адаптации
 */
export function normalizeStudentType(studentType: string): AdaptationType {
  if (studentType.includes('visual')) {
    return 'visual'
  }
  if (studentType.includes('auditory')) {
    return 'auditory'
  }
  if (studentType.includes('kinesthetic')) {
    return 'kinesthetic'
  }
  
  // По умолчанию возвращаем visual
  return 'visual'
}

/**
 * Проверяет наличие адаптации урока в БД
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @returns true если адаптация существует и опубликована
 */
export async function checkAdaptationExists(
  lessonId: string,
  adaptationType: AdaptationType
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lesson_adaptations')
      .select('id, status')
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', adaptationType)
      .in('status', ['generated', 'edited', 'published'])
      .maybeSingle()

    if (error) {
      console.error('Error checking adaptation existence:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in checkAdaptationExists:', error)
    return false
  }
}

/**
 * Получает адаптированный контент урока из БД
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @returns Адаптированный контент или null если не найден
 */
export async function getLessonAdaptation(
  lessonId: string,
  adaptationType: AdaptationType
): Promise<LessonAdaptation | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lesson_adaptations')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', adaptationType)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('Error getting lesson adaptation:', error)
      return null
    }

    if (!data) {
      return null
    }

    return data as LessonAdaptation
  } catch (error) {
    console.error('Error in getLessonAdaptation:', error)
    return null
  }
}

/**
 * Сохраняет адаптированный контент урока в БД
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @param content - Адаптированный контент
 * @param userId - ID пользователя (для edited_by)
 * @param status - Статус адаптации (по умолчанию 'generated')
 * @returns true если успешно сохранено
 */
export async function saveLessonAdaptation(
  lessonId: string,
  adaptationType: AdaptationType,
  content: AdaptationContent,
  userId?: string,
  status: AdaptationStatus = 'generated'
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Проверяем, существует ли уже адаптация
    const { data: existing } = await supabase
      .from('lesson_adaptations')
      .select('id, version')
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', adaptationType)
      .maybeSingle()

    if (existing) {
      // Обновляем существующую адаптацию
      const updateData: any = {
        block1: content.block1,
        block2: content.block2,
        block3: content.block3,
        block4: content.block4,
        block5: content.block5,
        status: status,
        updated_at: new Date().toISOString()
      }

      if (status === 'generated') {
        updateData.generated_at = new Date().toISOString()
      } else if (status === 'edited') {
        updateData.edited_at = new Date().toISOString()
        updateData.edited_by = userId
        updateData.version = (existing.version || 1) + 1
      }

      const { error } = await supabase
        .from('lesson_adaptations')
        .update(updateData)
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating lesson adaptation:', error)
        return false
      }
    } else {
      // Создаем новую адаптацию
      const insertData: any = {
        lesson_id: lessonId,
        adaptation_type: adaptationType,
        block1: content.block1,
        block2: content.block2,
        block3: content.block3,
        block4: content.block4,
        block5: content.block5,
        status: status,
        generated_at: status === 'generated' ? new Date().toISOString() : null,
        edited_at: status === 'edited' ? new Date().toISOString() : null,
        edited_by: status === 'edited' ? userId : null,
        version: 1
      }

      const { error } = await supabase
        .from('lesson_adaptations')
        .insert(insertData)

      if (error) {
        console.error('Error creating lesson adaptation:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in saveLessonAdaptation:', error)
    return false
  }
}

/**
 * Анализирует материалы урока на наличие контента для адаптации
 * 
 * @param lessonId - ID урока
 * @returns Результат анализа материалов
 */
export async function analyzeLessonMaterials(lessonId: string): Promise<MaterialsAnalysis | null> {
  try {
    const supabase = createClient()
    
    // Вызываем функцию БД для анализа
    const { data, error } = await supabase.rpc('analyze_lesson_materials', {
      lesson_id_param: lessonId
    })

    if (error) {
      console.error('Error analyzing lesson materials:', error)
      return null
    }

    if (!data) {
      return null
    }

    return data as MaterialsAnalysis
  } catch (error) {
    console.error('Error in analyzeLessonMaterials:', error)
    return null
  }
}

/**
 * Получает метаданные адаптации урока
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @returns Метаданные адаптации или null если не найдены
 */
export async function getAdaptationMetadata(
  lessonId: string,
  adaptationType: AdaptationType
): Promise<AdaptationMetadata | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lesson_adaptation_metadata')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', adaptationType)
      .maybeSingle()

    if (error) {
      console.error('Error getting adaptation metadata:', error)
      return null
    }

    if (!data) {
      return null
    }

    return data as AdaptationMetadata
  } catch (error) {
    console.error('Error in getAdaptationMetadata:', error)
    return null
  }
}

/**
 * Обновляет метаданные адаптации урока
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @param metadata - Метаданные для обновления
 * @returns true если успешно обновлено
 */
export async function updateAdaptationMetadata(
  lessonId: string,
  adaptationType: AdaptationType,
  metadata: Partial<AdaptationMetadata>
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('lesson_adaptation_metadata')
      .upsert({
        lesson_id: lessonId,
        adaptation_type: adaptationType,
        ...metadata,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id,adaptation_type'
      })

    if (error) {
      console.error('Error updating adaptation metadata:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateAdaptationMetadata:', error)
    return false
  }
}

/**
 * Получает все адаптации урока
 * 
 * @param lessonId - ID урока
 * @returns Массив адаптаций для всех типов
 */
export async function getAllLessonAdaptations(lessonId: string): Promise<LessonAdaptation[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lesson_adaptations')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('adaptation_type', { ascending: true })

    if (error) {
      console.error('Error getting all lesson adaptations:', error)
      return []
    }

    return (data || []) as LessonAdaptation[]
  } catch (error) {
    console.error('Error in getAllLessonAdaptations:', error)
    return []
  }
}

/**
 * Публикует адаптацию урока
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @returns true если успешно опубликовано
 */
export async function publishLessonAdaptation(
  lessonId: string,
  adaptationType: AdaptationType
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('lesson_adaptations')
      .update({
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', adaptationType)

    if (error) {
      console.error('Error publishing lesson adaptation:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in publishLessonAdaptation:', error)
    return false
  }
}

/**
 * Удаляет адаптацию урока
 * 
 * @param lessonId - ID урока
 * @param adaptationType - Тип адаптации
 * @returns true если успешно удалено
 */
export async function deleteLessonAdaptation(
  lessonId: string,
  adaptationType: AdaptationType
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('lesson_adaptations')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', adaptationType)

    if (error) {
      console.error('Error deleting lesson adaptation:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteLessonAdaptation:', error)
    return false
  }
}

/**
 * Генерирует адаптации для всех типов восприятия для урока
 * 
 * @param lessonId - ID урока
 * @param lessonContent - Контент урока для адаптации
 * @returns true если все адаптации успешно сгенерированы
 */
export async function generateAdaptationsForLesson(
  lessonId: string,
  lessonContent: {
    title: string
    description?: string
    blocks: Array<{
      title: string
      content: string
      type: string
    }>
  }
): Promise<boolean> {
  try {
    const adaptationTypes: AdaptationType[] = ['visual', 'auditory', 'kinesthetic']
    const results: boolean[] = []

    for (const type of adaptationTypes) {
      try {
        // Проверяем, существует ли уже адаптация
        const exists = await checkAdaptationExists(lessonId, type)
        if (exists) {
          console.log(`Adaptation for ${type} already exists, skipping...`)
          results.push(true)
          continue
        }

        // Генерируем адаптацию через API
        const response = await fetch('/api/ai-adaptation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonContent,
            studentType: type,
            lessonId,
            saveToDatabase: true
          })
        })

        if (!response.ok) {
          console.error(`Error generating adaptation for ${type}:`, response.statusText)
          results.push(false)
          continue
        }

        const data = await response.json()
        if (data.success) {
          console.log(`Adaptation for ${type} generated successfully`)
          results.push(true)
        } else {
          console.error(`Error generating adaptation for ${type}:`, data.error)
          results.push(false)
        }
      } catch (error) {
        console.error(`Error generating adaptation for ${type}:`, error)
        results.push(false)
      }
    }

    // Возвращаем true если хотя бы одна адаптация успешно сгенерирована
    return results.some(r => r === true)
  } catch (error) {
    console.error('Error in generateAdaptationsForLesson:', error)
    return false
  }
}

/**
 * Получает рекомендации по материалам для урока
 * 
 * @param lessonId - ID урока
 * @returns Рекомендации по материалам
 */
export async function getLessonRecommendations(lessonId: string): Promise<Array<{
  type: string
  message: string
  priority?: 'low' | 'medium' | 'high'
}> | null> {
  try {
    const analysis = await analyzeLessonMaterials(lessonId)
    if (!analysis) {
      return null
    }

    return analysis.recommendations
  } catch (error) {
    console.error('Error in getLessonRecommendations:', error)
    return null
  }
}

/**
 * Определяет недостающие материалы для конкретного типа адаптации
 * 
 * @param analysis - Результат анализа материалов урока
 * @param adaptationType - Тип адаптации (visual, auditory, kinesthetic)
 * @returns Массив недостающих материалов с рекомендациями
 */
export function getMissingMaterialsForAdaptationType(
  analysis: MaterialsAnalysis,
  adaptationType: AdaptationType
): Array<{
  type: string
  message: string
  priority: 'low' | 'medium' | 'high'
}> {
  const missingMaterials: Array<{
    type: string
    message: string
    priority: 'low' | 'medium' | 'high'
  }> = []

  if (adaptationType === 'auditory') {
    // Для аудиального режима критично наличие аудио
    if (!analysis.has_audio) {
      missingMaterials.push({
        type: 'audio',
        message: 'Добавьте аудио, чтобы усилить опыт аудиалов',
        priority: 'high'
      })
    }
  } else if (adaptationType === 'visual') {
    // Для визуального режима желательны схемы/таблицы или изображения
    if (!analysis.has_diagrams && !analysis.has_images) {
      missingMaterials.push({
        type: 'diagrams',
        message: 'Добавьте схемы или таблицы для лучшего восприятия визуалами',
        priority: 'medium'
      })
    } else if (!analysis.has_diagrams) {
      missingMaterials.push({
        type: 'diagrams',
        message: 'Добавьте схемы для структурированного отображения информации',
        priority: 'low'
      })
    }
  } else if (adaptationType === 'kinesthetic') {
    // Для кинестетического режима критична практика
    if (!analysis.has_practice) {
      missingMaterials.push({
        type: 'practice',
        message: 'Добавьте практику для интерактивного обучения кинестетиков',
        priority: 'high'
      })
    }
  }

  return missingMaterials
}

