import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeStudentType } from '@/lib/adaptation-logic'

/**
 * POST /api/adaptations/generate-batch
 * 
 * Генерирует адаптации для нескольких уроков одновременно
 * Используется для массовой генерации адаптаций существующих уроков
 * 
 * Параметры запроса:
 * - courseId (опционально): ID курса для генерации адаптаций
 * - lessonIds (опционально): массив ID уроков для генерации адаптаций
 * - adaptationTypes (опционально): массив типов адаптации для генерации (по умолчанию все типы)
 * - forceRegenerate (опционально): перегенерировать существующие адаптации (по умолчанию false)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      )
    }

    // Получаем параметры запроса
    const body = await request.json()
    const { courseId, lessonIds, adaptationTypes, forceRegenerate = false } = body

    // Определяем типы адаптации
    const typesToGenerate = adaptationTypes || ['visual', 'auditory', 'kinesthetic']

    // Получаем список уроков для генерации
    let lessonsToProcess: Array<{ id: string; course_id: string; title: string; blocks: any }> = []

    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
      // Генерируем адаптации для указанных уроков
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, course_id, title, blocks')
        .in('id', lessonIds)

      if (lessonsError) {
        return NextResponse.json(
          { error: 'Ошибка при загрузке уроков', details: lessonsError.message },
          { status: 500 }
        )
      }

      // Проверяем доступ к каждому уроку
      for (const lesson of lessons || []) {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('id, author_id')
          .eq('id', lesson.course_id)
          .single()

        if (courseError || !course) {
          continue
        }

        // Проверяем, является ли пользователь автором или соавтором
        const isAuthor = course.author_id === user.id
        const { data: collaborator } = await supabase
          .from('course_collaborators')
          .select('id')
          .eq('course_id', course.id)
          .eq('collaborator_user_id', user.id)
          .single()

        if (isAuthor || collaborator) {
          lessonsToProcess.push(lesson)
        }
      }
    } else if (courseId) {
      // Генерируем адаптации для всех уроков курса
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, author_id')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        return NextResponse.json(
          { error: 'Курс не найден', details: courseError?.message },
          { status: 404 }
        )
      }

      // Проверяем, является ли пользователь автором или соавтором
      const isAuthor = course.author_id === user.id
      const { data: collaborator } = await supabase
        .from('course_collaborators')
        .select('id')
        .eq('course_id', course.id)
        .eq('collaborator_user_id', user.id)
        .single()

      if (!isAuthor && !collaborator) {
        return NextResponse.json(
          { error: 'У вас нет доступа к этому курсу' },
          { status: 403 }
        )
      }

      // Загружаем все уроки курса
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, course_id, title, blocks')
        .eq('course_id', courseId)
        .order('order_index')

      if (lessonsError) {
        return NextResponse.json(
          { error: 'Ошибка при загрузке уроков', details: lessonsError.message },
          { status: 500 }
        )
      }

      lessonsToProcess = lessons || []
    } else {
      return NextResponse.json(
        { error: 'Необходимо указать courseId или lessonIds' },
        { status: 400 }
      )
    }

    if (lessonsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено уроков для генерации адаптаций' },
        { status: 404 }
      )
    }

    // Генерируем адаптации для каждого урока и каждого типа
    const results: Array<{
      lessonId: string
      lessonTitle: string
      adaptationType: string
      success: boolean
      error?: string
    }> = []

    for (const lesson of lessonsToProcess) {
      // Проверяем, нужно ли генерировать адаптацию
      if (!forceRegenerate) {
        const { data: existingAdaptations } = await supabase
          .from('lesson_adaptations')
          .select('id, adaptation_type, status')
          .eq('lesson_id', lesson.id)
          .in('adaptation_type', typesToGenerate)
          .in('status', ['generated', 'edited', 'published'])

        // Пропускаем уроки, у которых уже есть адаптации
        if (existingAdaptations && existingAdaptations.length > 0) {
          for (const adaptation of existingAdaptations) {
            results.push({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              adaptationType: adaptation.adaptation_type,
              success: false,
              error: 'Адаптация уже существует'
            })
          }
          continue
        }
      }

      // Формируем контент урока для адаптации
      const lessonContent = {
        title: lesson.title,
        description: '',
        blocks: (lesson.blocks || []).map((block: any) => ({
          title: block.title || '',
          content: block.content || block.text || '',
          type: block.type || 'text'
        }))
      }

      // Генерируем адаптации для каждого типа
      for (const adaptationType of typesToGenerate) {
        try {
          // Обновляем статус генерации в метаданных
          await supabase
            .from('lesson_adaptation_metadata')
            .update({
              ai_generation_status: 'processing',
              ai_generation_timestamp: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('lesson_id', lesson.id)
            .eq('adaptation_type', adaptationType)

          // Получаем базовый URL для API
          // Приоритет: NEXT_PUBLIC_APP_URL > VERCEL_URL > localhost (только в development)
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                         (process.env.NODE_ENV === 'production' 
                           ? null 
                           : 'http://localhost:3000')
          
          if (!baseUrl) {
            throw new Error('NEXT_PUBLIC_APP_URL must be set in production environment')
          }
          
          // Формируем полный URL для API адаптации
          const apiUrl = `${baseUrl}/api/ai-adaptation`
          
          // Вызываем API адаптации через HTTP
          // В Next.js это безопасно, так как мы на сервере
          const adaptationResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Передаем cookie для аутентификации (если нужно)
              ...(request.headers.get('cookie') && { 'Cookie': request.headers.get('cookie') || '' })
            },
            body: JSON.stringify({
              lessonContent,
              studentType: adaptationType,
              lessonId: lesson.id,
              saveToDatabase: true,
              forceRegenerate
            })
          })

          if (!adaptationResponse.ok) {
            let errorMessage = 'Ошибка при генерации адаптации'
            try {
              const errorData = await adaptationResponse.json()
              errorMessage = errorData.error || errorData.errorSummary || errorMessage
            } catch (e) {
              errorMessage = `HTTP ${adaptationResponse.status}: ${adaptationResponse.statusText}`
            }
            
            // Обновляем статус ошибки в метаданных
            await supabase
              .from('lesson_adaptation_metadata')
              .update({
                ai_generation_status: 'error',
                ai_generation_error: errorMessage,
                updated_at: new Date().toISOString()
              })
              .eq('lesson_id', lesson.id)
              .eq('adaptation_type', adaptationType)
            
            results.push({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              adaptationType,
              success: false,
              error: errorMessage
            })
            continue
          }

          const adaptationData = await adaptationResponse.json()
          
          if (adaptationData.success) {
            results.push({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              adaptationType,
              success: true
            })
          } else {
            results.push({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              adaptationType,
              success: false,
              error: adaptationData.error || 'Ошибка при генерации адаптации'
            })
          }
        } catch (error: any) {
          console.error(`Error generating adaptation for lesson ${lesson.id}, type ${adaptationType}:`, error)
          
          // Обновляем статус ошибки в метаданных
          await supabase
            .from('lesson_adaptation_metadata')
            .update({
              ai_generation_status: 'error',
              ai_generation_error: error.message || 'Ошибка при генерации адаптации',
              updated_at: new Date().toISOString()
            })
            .eq('lesson_id', lesson.id)
            .eq('adaptation_type', adaptationType)
            .catch(err => console.error('Error updating metadata:', err))
          
          results.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            adaptationType,
            success: false,
            error: error.message || 'Ошибка при генерации адаптации'
          })
        }
      }
    }

    // Подсчитываем статистику
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Генерация адаптаций завершена: ${successCount} успешно, ${errorCount} с ошибками`,
      results,
      statistics: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        lessonsProcessed: lessonsToProcess.length,
        adaptationsPerLesson: typesToGenerate.length
      }
    })
  } catch (error: any) {
    console.error('Error in batch adaptation generation:', error)
    return NextResponse.json(
      { error: 'Ошибка при генерации адаптаций', details: error.message },
      { status: 500 }
    )
  }
}

