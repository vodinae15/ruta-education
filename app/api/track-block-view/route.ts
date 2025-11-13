import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API endpoint для отслеживания просмотров блоков уроков
 * POST /api/track-block-view
 * 
 * Принимает:
 * - courseId: ID курса
 * - lessonId: ID урока
 * - blockId: ID блока (из JSONB структуры урока)
 * - blockType: тип блока (introduction, main_block_1, etc.)
 * - timeSpent: время просмотра блока в секундах (опционально)
 */
export async function POST(request: NextRequest) {
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
      blockType,
      timeSpent // Время просмотра блока в секундах (опционально)
    } = body

    // Валидация обязательных полей
    if (!courseId || !lessonId || !blockId || !blockType) {
      console.log('❌ [API] Отсутствуют обязательные поля:', { courseId, lessonId, blockId, blockType })
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['courseId', 'lessonId', 'blockId', 'blockType']
      }, { status: 400 })
    }

    // Валидация blockType
    const validBlockTypes = [
      'introduction',
      'navigation',
      'main_block_1',
      'intermediate_practice',
      'main_block_2',
      'intermediate_test',
      'main_block_3',
      'conclusion',
      'bonus_support'
    ]
    
    if (!validBlockTypes.includes(blockType)) {
      console.log('❌ [API] Неверный тип блока:', blockType)
      return NextResponse.json({ 
        error: 'Invalid block type',
        validTypes: validBlockTypes
      }, { status: 400 })
    }

    console.log('📊 [API] Отслеживание просмотра блока:', { 
      courseId, 
      lessonId, 
      blockId,
      blockType,
      timeSpent: timeSpent || 'не указано',
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

    // Проверяем, существует ли урок
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      console.error('❌ [API] Урок не найден:', lessonError)
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Проверяем, что урок принадлежит курсу
    if (lesson.course_id !== courseId) {
      console.error('❌ [API] Урок не принадлежит курсу:', { lessonId, courseId, lessonCourseId: lesson.course_id })
      return NextResponse.json({ error: 'Lesson does not belong to course' }, { status: 400 })
    }

    // Проверяем, существует ли доступ студента к курсу
    const { data: access, error: accessError } = await supabase
      .from('student_course_access')
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (accessError) {
      console.error('❌ [API] Ошибка проверки доступа:', accessError)
      return NextResponse.json({ error: 'Failed to check access' }, { status: 500 })
    }

    if (!access) {
      console.error('❌ [API] Студент не имеет доступа к курсу')
      return NextResponse.json({ error: 'Student does not have access to course' }, { status: 403 })
    }

    // Подготавливаем данные для вставки
    const viewData: any = {
      student_id: student.id,
      course_id: courseId,
      lesson_id: lessonId,
      block_id: blockId,
      block_type: blockType,
      viewed_at: new Date().toISOString(),
      time_spent: typeof timeSpent === 'number' && timeSpent >= 0 ? timeSpent : 0
    }

    // Сохраняем просмотр блока
    // Триггер в БД автоматически определит, является ли это повторным просмотром
    const { data: viewRecord, error: insertError } = await supabase
      .from('lesson_block_views')
      .insert(viewData)
      .select('id, is_repeat')
      .single()

    if (insertError) {
      console.error('❌ [API] Ошибка сохранения просмотра блока:', insertError)
      
      // Если ошибка связана с дубликатом (что не должно произойти, т.к. мы создаем новую запись),
      // или с ограничением, возвращаем соответствующую ошибку
      if (insertError.code === '23505') {
        // Unique constraint violation - это не должно происходить, но на всякий случай
        return NextResponse.json({ 
          error: 'View already exists',
          message: 'This block view has already been recorded'
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to save block view',
        details: insertError.message
      }, { status: 500 })
    }

    console.log('✅ [API] Просмотр блока сохранен:', {
      viewId: viewRecord.id,
      isRepeat: viewRecord.is_repeat,
      blockType,
      timeSpent: viewData.time_spent
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Block view tracked successfully',
      viewId: viewRecord.id,
      isRepeat: viewRecord.is_repeat,
      timeSpent: viewData.time_spent
    })

  } catch (error) {
    console.error('❌ [API] Критическая ошибка при отслеживании просмотра блока:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

