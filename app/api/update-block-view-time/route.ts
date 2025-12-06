import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeLessonId, isValidUUID } from '@/lib/lesson-id-utils'

/**
 * API endpoint для обновления времени просмотра блока
 * PUT /api/update-block-view-time
 * 
 * Принимает:
 * - courseId: ID курса
 * - lessonId: ID урока
 * - blockId: ID блока (из JSONB структуры урока)
 * - timeSpent: время просмотра блока в секундах
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ [API] Пользователь не авторизован')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Парсим тело запроса
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('❌ [API] Ошибка парсинга тела запроса:', error)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    
    const { 
      courseId, 
      lessonId, 
      blockId,
      timeSpent // Время просмотра блока в секундах
    } = body

    // Валидация обязательных полей
    if (!courseId || !lessonId || !blockId || typeof timeSpent !== 'number') {
      console.log('❌ [API] Отсутствуют обязательные поля:', { courseId, lessonId, blockId, timeSpent })
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['courseId', 'lessonId', 'blockId', 'timeSpent']
      }, { status: 400 })
    }

    // Валидация timeSpent
    if (timeSpent < 0 || !Number.isInteger(timeSpent)) {
      console.log('❌ [API] Неверное время просмотра:', timeSpent)
      return NextResponse.json({ 
        error: 'Invalid timeSpent',
        message: 'timeSpent must be a non-negative integer'
      }, { status: 400 })
    }

    console.log('⏱️ [API] Обновление времени просмотра блока:', { 
      courseId, 
      lessonId, 
      blockId,
      timeSpent,
      user: user.email
    })

    // Получаем ID студента
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('email', user.email)
      .single()

    if (studentError || !student) {
      console.error('❌ [API] Студент не найден:', studentError)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Нормализуем lessonId для поиска в БД
    // Если lessonId не UUID, пробуем нормализовать его
    let actualLessonId = lessonId
    if (!isValidUUID(lessonId)) {
      actualLessonId = normalizeLessonId(lessonId, courseId)
      console.log('🔄 [API] Нормализованный lessonId:', { original: lessonId, normalized: actualLessonId })
    }

    // Находим последнюю запись просмотра блока для этого студента
    // Обновляем запись с самым поздним viewed_at для данного блока
    // Пробуем сначала с переданным lessonId, потом с нормализованным
    let { data: viewRecords, error: viewError } = await supabase
      .from('lesson_block_views')
      .select('id, time_spent, viewed_at')
      .eq('student_id', student.id)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .eq('block_id', blockId)
      .order('viewed_at', { ascending: false })
      .limit(1)

    // Если не найдено и ID был не UUID, пробуем с нормализованным
    if ((!viewRecords || viewRecords.length === 0) && actualLessonId !== lessonId) {
      console.log('🔄 [API] Пробуем найти с нормализованным lessonId')
      const { data: normalizedRecords, error: normalizedError } = await supabase
        .from('lesson_block_views')
        .select('id, time_spent, viewed_at')
        .eq('student_id', student.id)
        .eq('course_id', courseId)
        .eq('lesson_id', actualLessonId)
        .eq('block_id', blockId)
        .order('viewed_at', { ascending: false })
        .limit(1)

      if (!normalizedError && normalizedRecords && normalizedRecords.length > 0) {
        viewRecords = normalizedRecords
        viewError = null
      }
    }

    if (viewError) {
      console.error('❌ [API] Ошибка поиска записи просмотра:', viewError)
      return NextResponse.json({ error: 'Failed to find view record' }, { status: 500 })
    }

    if (!viewRecords || viewRecords.length === 0) {
      console.error('❌ [API] Запись просмотра не найдена:', { lessonId, actualLessonId, blockId })
      return NextResponse.json({ error: 'View record not found' }, { status: 404 })
    }

    const viewRecord = viewRecords[0]

    // Обновляем время просмотра
    // Время всегда вычисляется от момента открытия блока (viewStartTime)
    // Если новое время больше текущего, используем его (блок просматривается дольше)
    // Если новое время меньше или равно текущему, используем текущее (защита от ошибок)
    const currentTimeSpent = viewRecord.time_spent || 0
    const newTimeSpent = Math.max(currentTimeSpent, timeSpent)

    const { data: updatedRecord, error: updateError } = await supabase
      .from('lesson_block_views')
      .update({ time_spent: newTimeSpent })
      .eq('id', viewRecord.id)
      .select('id, time_spent')
      .single()

    if (updateError) {
      console.error('❌ [API] Ошибка обновления времени просмотра:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update view time',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ [API] Время просмотра блока обновлено:', {
      viewId: updatedRecord.id,
      oldTime: currentTimeSpent,
      newTime: newTimeSpent,
      blockId
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Block view time updated successfully',
      viewId: updatedRecord.id,
      timeSpent: newTimeSpent
    })

  } catch (error) {
    console.error('❌ [API] Критическая ошибка при обновлении времени просмотра блока:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

