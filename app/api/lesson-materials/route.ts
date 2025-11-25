import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/lesson-materials?lessonId=xxx&courseId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    const courseId = searchParams.get('courseId')

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'Отсутствует обязательный параметр: lessonId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Вызываем функцию БД для анализа материалов
    // Если передан courseId, функция будет искать урок в modules.lessons
    let data, error
    
    try {
      console.log('🔍 [Lesson Materials] Calling analyze_lesson_materials with:', {
        lesson_id_param: lessonId,
        course_id_param: courseId || null
      })
      
      const result = await supabase.rpc('analyze_lesson_materials', {
        lesson_id_param: lessonId,
        course_id_param: courseId || null
      })
      
      data = result.data
      error = result.error
      
      console.log('📊 [Lesson Materials] RPC result:', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint
      })
    } catch (rpcError: any) {
      console.error('❌ [Lesson Materials] RPC call exception:', rpcError)
      console.error('❌ [Lesson Materials] Exception details:', {
        message: rpcError.message,
        stack: rpcError.stack,
        name: rpcError.name
      })
      error = rpcError
    }

    if (error) {
      console.error('❌ [Lesson Materials] Error analyzing materials:', error)
      console.error('❌ [Lesson Materials] Error details:', JSON.stringify(error, null, 2))
      console.error('❌ [Lesson Materials] Lesson ID:', lessonId)
      console.error('❌ [Lesson Materials] Course ID:', courseId)
      
      // Формируем более информативное сообщение об ошибке
      let errorMessage = 'Не удалось проанализировать материалы урока.'
      if (error?.message) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          errorMessage = 'Функция analyze_lesson_materials не найдена в БД. Необходимо выполнить скрипт scripts/28-fix-lesson-id-type.sql'
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = 'Нет доступа к функции analyze_lesson_materials. Проверьте права доступа в БД.'
        } else {
          errorMessage = `Ошибка БД: ${error.message}`
        }
      }
      
      // Возвращаем базовый результат вместо ошибки, чтобы не ломать UI
      return NextResponse.json({
        success: true,
        analysis: {
          has_audio: false,
          has_video: false,
          has_images: false,
          has_diagrams: false,
          has_practice: false,
          recommendations: [
            {
              type: 'general',
              message: errorMessage,
              priority: 'high'
            }
          ]
        },
        error: error?.message || 'Unknown error',
        errorCode: error?.code
      })
    }

    if (!data) {
      console.warn('⚠️ [Lesson Materials] No data returned from analyze_lesson_materials')
      // Возвращаем базовый результат
      return NextResponse.json({
        success: true,
        analysis: {
          has_audio: false,
          has_video: false,
          has_images: false,
          has_diagrams: false,
          has_practice: false,
          recommendations: []
        }
      })
    }

    return NextResponse.json({
      success: true,
      analysis: {
        has_audio: data.has_audio || false,
        has_video: data.has_video || false,
        has_images: data.has_images || false,
        has_diagrams: data.has_diagrams || false,
        has_practice: data.has_practice || false,
        recommendations: data.recommendations || []
      }
    })
  } catch (error: any) {
    console.error('❌ [Lesson Materials] API error:', error)
    return NextResponse.json(
      { success: false, error: `Внутренняя ошибка сервера: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    )
  }
}

