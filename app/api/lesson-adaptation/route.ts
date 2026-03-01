import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type AdaptationType, type AdaptationContent, type AdaptationStatus } from '@/lib/adaptation-logic'

// GET /api/lesson-adaptation?lessonId=xxx&type=visual&courseId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    const courseId = searchParams.get('courseId')
    const type = searchParams.get('type') as AdaptationType | null
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'

    if (!lessonId || !type || !courseId) {
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные параметры: lessonId, type, courseId' },
        { status: 400 }
      )
    }

    // Проверяем тип адаптации
    if (!['visual', 'auditory', 'kinesthetic', 'original'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Неверный тип адаптации. Допустимые значения: visual, auditory, kinesthetic, original' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Получаем адаптацию из БД (теперь используем course_id и lesson_id)
    let query = supabase
      .from('lesson_adaptations')
      .select('*')
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', type)

    // Если не требуется включать неопубликованные, фильтруем по статусу
    if (!includeUnpublished) {
      query = query.eq('status', 'published')
    }

    const { data: adaptation, error } = await query.maybeSingle()

    if (error) {
      console.error('❌ [Lesson Adaptation] Error fetching adaptation:', error)
      console.error('❌ [Lesson Adaptation] Error details:', JSON.stringify(error, null, 2))
      console.error('❌ [Lesson Adaptation] Lesson ID:', lessonId)
      console.error('❌ [Lesson Adaptation] Course ID:', courseId)
      console.error('❌ [Lesson Adaptation] Type:', type)
      return NextResponse.json(
        { success: false, error: 'Ошибка при получении адаптации' },
        { status: 500 }
      )
    }

    // Если адаптация не найдена, возвращаем успешный ответ с null (это нормально для новых уроков)
    if (!adaptation) {
      return NextResponse.json({
        success: true,
        adaptation: null,
        message: 'Адаптация не найдена. Можно создать новую.'
      })
    }

    // Логируем детали загруженной адаптации для диагностики
    const hasValidBlocks = !!(
      adaptation.block1 || 
      adaptation.block2 || 
      adaptation.block3 || 
      adaptation.block4 || 
      adaptation.block5
    )
    
    console.log(`📥 [Lesson Adaptation API] Loaded adaptation:`, {
      id: adaptation.id,
      lesson_id: adaptation.lesson_id,
      adaptation_type: adaptation.adaptation_type,
      status: adaptation.status,
      hasBlock1: !!adaptation.block1,
      hasBlock2: !!adaptation.block2,
      hasBlock3: !!adaptation.block3,
      hasBlock4: !!adaptation.block4,
      hasBlock5: !!adaptation.block5,
      hasValidBlocks: hasValidBlocks,
      block1Type: typeof adaptation.block1,
      block1IsNull: adaptation.block1 === null,
      block1IsUndefined: adaptation.block1 === undefined,
      block1IsObject: typeof adaptation.block1 === 'object' && adaptation.block1 !== null,
      block1Keys: adaptation.block1 && typeof adaptation.block1 === 'object' ? Object.keys(adaptation.block1) : 'N/A'
    })
    
    if (!hasValidBlocks) {
      console.warn(`⚠️ [Lesson Adaptation API] Adaptation ${adaptation.id} exists but all blocks are empty/null`)
    }

    return NextResponse.json({
      success: true,
      adaptation: {
        id: adaptation.id,
        lesson_id: adaptation.lesson_id,
        adaptation_type: adaptation.adaptation_type,
        status: adaptation.status,
        block1: adaptation.block1,
        block2: adaptation.block2,
        block3: adaptation.block3,
        block4: adaptation.block4,
        block5: adaptation.block5,
        howToWork: adaptation.how_to_work,
        navigation: adaptation.navigation,
        conclusion: adaptation.conclusion,
        generated_at: adaptation.generated_at,
        edited_at: adaptation.edited_at,
        edited_by: adaptation.edited_by,
        version: adaptation.version,
        created_at: adaptation.created_at,
        updated_at: adaptation.updated_at
      }
    })
  } catch (error: any) {
    console.error('❌ [Lesson Adaptation] API error:', error)
    return NextResponse.json(
      { success: false, error: `Внутренняя ошибка сервера: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    )
  }
}

// PUT /api/lesson-adaptation
export async function PUT(request: NextRequest) {
  try {
    const { lessonId, courseId, type, blocks, status }: {
      lessonId: string
      courseId: string
      type: AdaptationType
      blocks: AdaptationContent
      status?: AdaptationStatus
    } = await request.json()

    if (!lessonId || !courseId || !type || !blocks) {
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные параметры: lessonId, courseId, type, blocks' },
        { status: 400 }
      )
    }

    // Проверяем тип адаптации
    if (!['visual', 'auditory', 'kinesthetic', 'original'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Неверный тип адаптации. Допустимые значения: visual, auditory, kinesthetic, original' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Проверяем права доступа (автор или соавтор)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Неавторизован' },
        { status: 401 }
      )
    }

    // Получаем курс и проверяем права доступа
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, author_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Курс не найден' },
        { status: 404 }
      )
    }

    // Проверяем, является ли пользователь автором
    const isAuthor = course.author_id === user.id

    // Проверяем, является ли пользователь соавтором
    const { data: collaborator } = await supabase
      .from('course_collaborators')
      .select('id')
      .eq('course_id', courseId)
      .eq('collaborator_user_id', user.id)
      .maybeSingle()

    const isCollaborator = !!collaborator

    if (!isAuthor && !isCollaborator) {
      return NextResponse.json(
        { success: false, error: 'Нет прав на редактирование адаптации' },
        { status: 403 }
      )
    }

    // Получаем существующую адаптацию для получения версии
    const { data: existing } = await supabase
      .from('lesson_adaptations')
      .select('id, version')
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', type)
      .maybeSingle()

    // Определяем новый статус
    const newStatus: AdaptationStatus = status || (existing ? 'edited' : 'generated')
    const newVersion = existing ? (existing.version || 1) + 1 : 1

    if (existing) {
      // Обновляем существующую адаптацию
      const { error: updateError } = await supabase
        .from('lesson_adaptations')
        .update({
          block1: blocks.block1,
          block2: blocks.block2,
          block3: blocks.block3,
          block4: blocks.block4,
          block5: blocks.block5,
          status: newStatus,
          edited_at: new Date().toISOString(),
          edited_by: user.id,
          version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('❌ [Lesson Adaptation] Error updating adaptation:', updateError)
        return NextResponse.json(
          { success: false, error: 'Ошибка при сохранении адаптации' },
          { status: 500 }
        )
      }

      console.log('✅ [Lesson Adaptation] Adaptation updated successfully')
    } else {
      // Создаем новую адаптацию
      const { error: insertError } = await supabase
        .from('lesson_adaptations')
        .insert({
          course_id: courseId,
          lesson_id: lessonId,
          adaptation_type: type,
          block1: blocks.block1,
          block2: blocks.block2,
          block3: blocks.block3,
          block4: blocks.block4,
          block5: blocks.block5,
          status: newStatus,
          generated_at: newStatus === 'generated' ? new Date().toISOString() : null,
          edited_at: newStatus === 'edited' ? new Date().toISOString() : null,
          edited_by: newStatus === 'edited' ? user.id : null,
          version: newVersion
        })

      if (insertError) {
        console.error('❌ [Lesson Adaptation] Error creating adaptation:', insertError)
        return NextResponse.json(
          { success: false, error: 'Ошибка при создании адаптации' },
          { status: 500 }
        )
      }

      console.log('✅ [Lesson Adaptation] Adaptation created successfully')
    }

    return NextResponse.json({
      success: true,
      message: 'Адаптация успешно сохранена'
    })
  } catch (error: any) {
    console.error('❌ [Lesson Adaptation] API error:', error)
    return NextResponse.json(
      { success: false, error: `Внутренняя ошибка сервера: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    )
  }
}

// POST /api/lesson-adaptation/publish
export async function POST(request: NextRequest) {
  try {
    const { lessonId, courseId, type }: {
      lessonId: string
      courseId: string
      type: AdaptationType
    } = await request.json()

    if (!lessonId || !courseId || !type) {
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные параметры: lessonId, courseId, type' },
        { status: 400 }
      )
    }

    // Проверяем тип адаптации
    if (!['visual', 'auditory', 'kinesthetic', 'original'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Неверный тип адаптации. Допустимые значения: visual, auditory, kinesthetic, original' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Проверяем права доступа (автор или соавтор)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Неавторизован' },
        { status: 401 }
      )
    }

    // Получаем курс и проверяем права доступа
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, author_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Курс не найден' },
        { status: 404 }
      )
    }

    // Проверяем, является ли пользователь автором
    const isAuthor = course.author_id === user.id

    // Проверяем, является ли пользователь соавтором
    const { data: collaborator } = await supabase
      .from('course_collaborators')
      .select('id')
      .eq('course_id', courseId)
      .eq('collaborator_user_id', user.id)
      .maybeSingle()

    const isCollaborator = !!collaborator

    if (!isAuthor && !isCollaborator) {
      return NextResponse.json(
        { success: false, error: 'Нет прав на публикацию адаптации' },
        { status: 403 }
      )
    }

    // Публикуем адаптацию
    const { error: updateError } = await supabase
      .from('lesson_adaptations')
      .update({
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .eq('adaptation_type', type)

    if (updateError) {
      console.error('❌ [Lesson Adaptation] Error publishing adaptation:', updateError)
      return NextResponse.json(
        { success: false, error: 'Ошибка при публикации адаптации' },
        { status: 500 }
      )
    }

    console.log('✅ [Lesson Adaptation] Adaptation published successfully')

    // Проверяем, опубликованы ли все 4 адаптации
    const { data: allAdaptations, error: adaptationsError } = await supabase
      .from('lesson_adaptations')
      .select('adaptation_type, status')
      .eq('lesson_id', lessonId)
      .eq('status', 'published')

    if (!adaptationsError && allAdaptations) {
      const publishedTypes = allAdaptations.map(a => a.adaptation_type)
      const requiredTypes = ['visual', 'auditory', 'kinesthetic', 'original']
      const allPublished = requiredTypes.every(type => publishedTypes.includes(type))

      if (allPublished) {
        // Все 4 адаптации опубликованы - публикуем урок
        const { error: lessonUpdateError } = await supabase
          .from('course_lessons')
          .update({ is_published: true })
          .eq('id', lessonId)

        if (!lessonUpdateError) {
          console.log('✅ [Lesson Adaptation] Lesson auto-published - all 4 adaptations are published')
        } else {
          console.error('❌ [Lesson Adaptation] Error auto-publishing lesson:', lessonUpdateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Адаптация успешно опубликована'
    })
  } catch (error: any) {
    console.error('❌ [Lesson Adaptation] API error:', error)
    return NextResponse.json(
      { success: false, error: `Внутренняя ошибка сервера: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    )
  }
}

