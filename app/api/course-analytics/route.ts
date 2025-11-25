import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * API endpoint для получения аналитики по курсу
 * GET /api/course-analytics?courseId=xxx
 * 
 * Возвращает:
 * - Статистику по урокам (просмотры, среднее время, повторные просмотры)
 * - Статистику по блокам (сколько учеников прошло каждый блок)
 * - Общую статистику (средние просмотры, среднее время изучения)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ [API] Пользователь не авторизован')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем courseId из query параметров
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      console.log('❌ [API] Отсутствует courseId')
      return NextResponse.json({ 
        error: 'Missing courseId parameter',
        required: ['courseId']
      }, { status: 400 })
    }

    console.log('📊 [API] Получение аналитики по курсу:', { courseId, user: user.email })

    // Проверяем, что пользователь является автором курса или коллаборатором
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, author_id, title, modules')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      console.error('❌ [API] Курс не найден:', courseError)
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Проверяем доступ автора к курсу
    const isAuthor = course.author_id === user.id
    if (!isAuthor) {
      // Проверяем, является ли пользователь коллаборатором
      const { data: collaborator, error: collaboratorError } = await supabase
        .from('course_collaborators')
        .select('id')
        .eq('course_id', courseId)
        .eq('collaborator_user_id', user.id)
        .maybeSingle()

      if (collaboratorError || !collaborator) {
        console.error('❌ [API] Пользователь не имеет доступа к курсу')
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Получаем уроки курса
    // Сначала пробуем получить из таблицы course_lessons
    let lessonsData: any[] = []
    const { data: lessonsFromTable, error: lessonsError } = await supabase
      .from('course_lessons')
      .select('id, title, order_index, blocks')
      .eq('course_id', courseId)
      .order('order_index')

    if (!lessonsError && lessonsFromTable && lessonsFromTable.length > 0) {
      lessonsData = lessonsFromTable.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        order_index: lesson.order_index,
        blocks: lesson.blocks
      }))
      console.log('📚 [API] Уроки получены из таблицы course_lessons:', {
        courseId,
        lessonsCount: lessonsData.length
      })
    } else {
      // Если нет в таблице, пробуем получить из поля modules.lessons
      if (course.modules && course.modules.lessons && Array.isArray(course.modules.lessons)) {
        lessonsData = course.modules.lessons.map((lesson: any, index: number) => ({
          id: lesson.id || `lesson-${index}`,
          title: lesson.title || `Урок ${index + 1}`,
          order_index: lesson.order || lesson.order_index || index,
          blocks: lesson.blocks || []
        }))
        console.log('📚 [API] Уроки получены из поля modules.lessons:', {
          courseId,
          lessonsCount: lessonsData.length,
          lessons: lessonsData.map(l => ({ id: l.id, title: l.title }))
        })
      } else {
        console.log('⚠️ [API] Уроки не найдены ни в таблице, ни в modules.lessons:', {
          courseId,
          hasModules: !!course.modules,
          modulesKeys: course.modules ? Object.keys(course.modules) : []
        })
      }
    }
    
    console.log('📚 [API] Итоговые уроки курса:', {
      courseId,
      lessonsCount: lessonsData.length,
      lessons: lessonsData.map(l => ({ id: l.id, title: l.title }))
    })

    // Используем SQL функции для получения аналитики по урокам
    const { data: lessonAnalytics, error: lessonAnalyticsError } = await supabase
      .rpc('get_lesson_analytics', { p_course_id: courseId })

    if (lessonAnalyticsError) {
      console.error('❌ [API] Ошибка получения аналитики по урокам:', lessonAnalyticsError)
      // Если функция не существует, получаем аналитику вручную
      console.log('⚠️ [API] SQL функция не найдена, получаем аналитику вручную')
    }

    // Если SQL функция не работает или уроки из modules.lessons, получаем аналитику вручную
    let analyticsData: any[] = []
    
    // SQL функция работает только с таблицей course_lessons, поэтому если уроки из modules.lessons,
    // всегда используем ручной метод
    const useManualAnalytics = lessonsData.length > 0 && !lessonsFromTable?.length
    
    if (lessonAnalytics && lessonAnalytics.length > 0 && !useManualAnalytics) {
      analyticsData = lessonAnalytics
      console.log('📊 [API] Использована SQL функция для аналитики:', analyticsData.length, 'уроков')
    } else {
      // Получаем аналитику вручную из таблицы lesson_block_views
      // Важно: для уроков из modules.lessons lesson_id может не совпадать с ID в course_lessons
      // Поэтому ищем просмотры по lesson_id напрямую
      for (const lesson of lessonsData) {
        const { data: views, error: viewsError } = await supabase
          .from('lesson_block_views')
          .select('id, student_id, time_spent, is_repeat')
          .eq('lesson_id', lesson.id)

        const uniqueStudents = new Set<string>()
        let totalViews = 0
        let repeatViews = 0
        let totalTimeSpent = 0

        if (!viewsError && views && views.length > 0) {
          views.forEach(v => {
            if (v.student_id) uniqueStudents.add(v.student_id)
            totalViews++
            if (v.is_repeat) repeatViews++
            totalTimeSpent += v.time_spent || 0
          })
        }

        const averageTimeSpent = totalViews > 0
          ? Math.round(totalTimeSpent / totalViews)
            : 0

        // Добавляем данные даже если нет просмотров (чтобы показать, что урок существует)
          analyticsData.push({
            lesson_id: lesson.id,
            lesson_title: lesson.title,
            total_views: totalViews,
            unique_students: uniqueStudents.size,
          average_time_spent: averageTimeSpent,
            repeat_views: repeatViews
          })
      }
      console.log('📊 [API] Аналитика получена вручную:', {
        lessonsCount: lessonsData.length,
        analyticsCount: analyticsData.length,
        hasViews: analyticsData.some(a => a.total_views > 0)
      })
    }

    // Получаем статистику по блокам для каждого урока
    const blockAnalytics: Record<string, any[]> = {}
    
    for (const lesson of lessonsData) {
      // Для уроков из modules.lessons SQL функция может не работать, используем ручной метод
      const useManualBlocks = useManualAnalytics
      
      if (!useManualBlocks) {
      // Используем SQL функцию для получения аналитики по блокам
      const { data: blocks, error: blocksError } = await supabase
        .rpc('get_block_analytics', { p_lesson_id: lesson.id })

      if (!blocksError && blocks && blocks.length > 0) {
        blockAnalytics[lesson.id] = blocks
          continue
        }
      }
      
        // Получаем аналитику по блокам вручную
        const { data: views, error: viewsError } = await supabase
          .from('lesson_block_views')
          .select('block_id, block_type, student_id, time_spent, is_repeat')
          .eq('lesson_id', lesson.id)

        if (!viewsError && views && views.length > 0) {
          // Группируем по блокам
          const blocksMap: Record<string, any> = {}
          
          for (const view of views) {
            const blockKey = `${view.block_id}-${view.block_type}`
            
            if (!blocksMap[blockKey]) {
              blocksMap[blockKey] = {
                block_id: view.block_id,
                block_type: view.block_type,
              students: new Set<string>(),
                views: [],
                repeat_views: 0,
                total_time: 0
              }
            }
            
          if (view.student_id) blocksMap[blockKey].students.add(view.student_id)
            blocksMap[blockKey].views.push(view)
            if (view.is_repeat) {
              blocksMap[blockKey].repeat_views++
            }
            blocksMap[blockKey].total_time += view.time_spent || 0
          }
          
          // Преобразуем в массив
          blockAnalytics[lesson.id] = Object.values(blocksMap).map((block: any) => ({
            block_id: block.block_id,
            block_type: block.block_type,
            students_completed: block.students.size,
            total_views: block.views.length,
            repeat_views: block.repeat_views,
            average_time_spent: block.views.length > 0
              ? Math.round(block.total_time / block.views.length)
              : 0
          }))
        } else {
        // Даже если нет просмотров, создаем пустой массив для урока
          blockAnalytics[lesson.id] = []
      }
    }
    
    console.log('📦 [API] Аналитика по блокам:', {
      lessonsWithBlocks: Object.keys(blockAnalytics).length,
      totalBlocks: Object.values(blockAnalytics).reduce((sum, blocks) => sum + blocks.length, 0)
    })

    // Рассчитываем общую статистику
    const totalViews = analyticsData.reduce((sum, lesson) => sum + (lesson.total_views || 0), 0)
    
    // Получаем уникальных студентов для всего курса
    const { data: allViews, error: allViewsError } = await supabase
      .from('lesson_block_views')
      .select('student_id')
      .eq('course_id', courseId)

    // Получаем уникальных студентов для всего курса
    // Используем Set для правильного подсчета уникальных студентов
    const totalUniqueStudents = allViews && !allViewsError && allViews.length > 0
      ? new Set(allViews.filter(v => v.student_id).map(v => v.student_id)).size
      : 0

    // Среднее количество просмотров на урок (только для уроков с просмотрами)
    const lessonsWithViews = analyticsData.filter(lesson => (lesson.total_views || 0) > 0)
    const averageViews = lessonsWithViews.length > 0
      ? Math.round(totalViews / lessonsWithViews.length)
      : 0

    // Общее время, потраченное на все уроки
    const totalTimeSpent = analyticsData.reduce((sum, lesson) => {
      const lessonViews = lesson.total_views || 0
      const avgTime = lesson.average_time_spent || 0
      return sum + (avgTime * lessonViews)
    }, 0)
    
    // Среднее время на просмотр (только для просмотров)
    const averageTimeSpent = totalViews > 0
      ? Math.round(totalTimeSpent / totalViews)
      : 0

    const totalRepeatViews = analyticsData.reduce((sum, lesson) => sum + (lesson.repeat_views || 0), 0)
    
    console.log('📈 [API] Общая статистика:', {
      totalLessons: lessonsData.length,
      totalViews,
      averageViews,
      totalUniqueStudents,
      averageTimeSpent,
      totalRepeatViews,
      lessonsWithViews: lessonsWithViews.length
    })

    // Форматируем время
    const formatTime = (seconds: number): string => {
      if (seconds === 0) return '0с'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      
      if (hours > 0) {
        return `${hours}ч ${minutes}м`
      } else if (minutes > 0) {
        return `${minutes}м ${secs}с`
      } else {
        return `${secs}с`
      }
    }

    console.log('✅ [API] Аналитика получена:', {
      courseId,
      courseTitle: course.title,
      lessonsCount: lessonsData.length,
      analyticsCount: analyticsData.length,
      summary: {
        totalLessons: lessonsData.length,
        totalViews,
        averageViews,
        totalUniqueStudents,
        averageTimeSpent,
        totalRepeatViews
      }
    })

    const responseData = {
      success: true,
      course: {
        id: course.id,
        title: course.title
      },
      summary: {
        totalLessons: lessonsData.length,
        totalViews,
        averageViews,
        totalUniqueStudents: totalUniqueStudents,
        averageTimeSpent,
        averageTimeSpentFormatted: formatTime(averageTimeSpent),
        totalRepeatViews
      },
      lessons: analyticsData.map(lesson => ({
        ...lesson,
        averageTimeSpentFormatted: formatTime(lesson.average_time_spent || 0),
        blocks: blockAnalytics[lesson.lesson_id] || []
      })),
      blockAnalytics
    }
    
    console.log('📤 [API] Отправка ответа:', {
      success: responseData.success,
      hasCourse: !!responseData.course,
      hasSummary: !!responseData.summary,
      totalLessons: responseData.summary.totalLessons
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ [API] Критическая ошибка при получении аналитики:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

