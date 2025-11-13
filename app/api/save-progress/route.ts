import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Парсим тело запроса
    let body
    try {
      // Пробуем распарсить как JSON (обычный запрос)
      body = await request.json()
    } catch (error) {
      // Если не получилось, это может быть Blob из sendBeacon
      // Клонируем запрос для повторного чтения
      const clonedRequest = request.clone()
      try {
        const text = await clonedRequest.text()
        body = JSON.parse(text)
      } catch (parseError) {
        console.error('Error parsing request body:', parseError)
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
      }
    }
    
    const { 
      courseId, 
      lessonId, 
      progressData,
      timeSpent // Время сессии в секундах (опционально)
    } = body

    if (!courseId || !lessonId || !progressData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    console.log('💾 [API] Сохранение прогресса:', { 
      courseId, 
      lessonId, 
      timeSpent: timeSpent || 'не указано' 
    })

    // Получаем ID студента
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('email', user.email)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Сохраняем или обновляем прогресс
    const { data: existingAccess, error: fetchError } = await supabase
      .from('student_course_access')
      .select('progress, total_time_spent')
      .eq('student_id', student.id)
      .eq('course_id', courseId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    const currentProgress = existingAccess?.progress || {}
    const updatedProgress = {
      ...currentProgress,
      [lessonId]: {
        ...progressData,
        lastUpdated: new Date().toISOString()
      }
    }

    // Рассчитываем новое общее время изучения
    // Если передано время сессии, добавляем его к существующему
    let newTotalTimeSpent = existingAccess?.total_time_spent || 0
    if (typeof timeSpent === 'number' && timeSpent > 0) {
      // Получаем время, уже сохраненное для этого урока в текущей сессии
      const lessonProgress = currentProgress[lessonId]
      const previousSessionTime = lessonProgress?.sessionTime || 0
      
      // Вычисляем разницу (новое время минус предыдущее время сессии)
      const timeDifference = Math.max(0, timeSpent - previousSessionTime)
      
      // Добавляем разницу к общему времени
      newTotalTimeSpent = newTotalTimeSpent + timeDifference
      
      console.log('⏱️ [API] Обновление времени:', {
        previousTotal: existingAccess?.total_time_spent || 0,
        sessionTime: timeSpent,
        previousSessionTime,
        timeDifference,
        newTotal: newTotalTimeSpent
      })
      
      // Сохраняем время текущей сессии в прогресс урока
      updatedProgress[lessonId] = {
        ...updatedProgress[lessonId],
        sessionTime: timeSpent
      }
    }

    const { error: updateError } = await supabase
      .from('student_course_access')
      .update({ 
        progress: updatedProgress,
        total_time_spent: newTotalTimeSpent,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('student_id', student.id)
      .eq('course_id', courseId)

    if (updateError) {
      console.error('❌ [API] Ошибка сохранения прогресса:', updateError)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    console.log('✅ [API] Прогресс сохранен успешно, общее время:', newTotalTimeSpent, 'секунд')

    return NextResponse.json({ 
      success: true, 
      message: 'Progress saved successfully',
      totalTimeSpent: newTotalTimeSpent
    })

  } catch (error) {
    console.error('Error saving progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
