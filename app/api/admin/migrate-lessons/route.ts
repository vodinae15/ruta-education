import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/migrate-lessons
 * Мигрирует уроки из modules.lessons в таблицу course_lessons с UUID
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Migration] Starting lesson migration...")

    const supabase = await createClient()

    // Проверяем права администратора
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Получаем courseId из запроса (опционально - для миграции конкретного курса)
    const { courseId } = await request.json().catch(() => ({}))

    // Загружаем курсы
    let query = supabase
      .from("courses")
      .select("id, title, modules, course_data, author_id")

    if (courseId) {
      query = query.eq("id", courseId)
    }

    const { data: courses, error: coursesError } = await query

    if (coursesError) {
      console.error("❌ [Migration] Error loading courses:", coursesError)
      return NextResponse.json(
        { success: false, error: coursesError.message },
        { status: 500 }
      )
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No courses to migrate",
        migrated: 0
      })
    }

    console.log(`📚 [Migration] Found ${courses.length} courses to process`)

    let totalMigrated = 0
    let errors: any[] = []

    for (const course of courses) {
      try {
        console.log(`\n🔄 [Migration] Processing course: ${course.title} (${course.id})`)

        // Ищем уроки в modules.lessons или course_data.lessons
        let lessons: any[] = []

        if (course.modules?.lessons && Array.isArray(course.modules.lessons)) {
          lessons = course.modules.lessons
          console.log(`  ✅ Found ${lessons.length} lessons in modules.lessons`)
        } else if (course.course_data?.lessons && Array.isArray(course.course_data.lessons)) {
          lessons = course.course_data.lessons
          console.log(`  ✅ Found ${lessons.length} lessons in course_data.lessons`)
        }

        if (lessons.length === 0) {
          console.log(`  ⚠️ No lessons found in JSONB, skipping...`)
          continue
        }

        // Проверяем какие уроки уже есть в course_lessons
        const { data: existingLessons } = await supabase
          .from("course_lessons")
          .select("id, legacy_id")
          .eq("course_id", course.id)

        const existingLegacyIds = new Set(
          existingLessons?.map(l => l.legacy_id).filter(Boolean) || []
        )

        console.log(`  📊 Already in course_lessons: ${existingLessons?.length || 0}`)

        // Мигрируем каждый урок
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i]
          const legacyId = lesson.id || lesson.lessonId || `lesson-${i}`

          // Пропускаем если уже мигрирован
          if (existingLegacyIds.has(legacyId)) {
            console.log(`  ⏭️ Lesson "${lesson.title || legacyId}" already migrated, skipping`)
            continue
          }

          // Создаем запись с UUID
          const lessonData = {
            course_id: course.id,
            title: lesson.title || lesson.name || `Урок ${i + 1}`,
            description: lesson.description || null,
            blocks: lesson.blocks || lesson.content || [],
            materials: lesson.materials || [],
            tests: lesson.tests || [],
            order_index: lesson.order_index ?? lesson.order ?? i,
            status: 'published',
            legacy_id: legacyId // Сохраняем старый ID для обратной совместимости
          }

          const { data: newLesson, error: insertError } = await supabase
            .from("course_lessons")
            .insert(lessonData)
            .select()
            .single()

          if (insertError) {
            console.error(`  ❌ Error inserting lesson "${lesson.title}":`, insertError)
            errors.push({
              courseId: course.id,
              lessonTitle: lesson.title,
              error: insertError.message
            })
          } else {
            console.log(`  ✅ Migrated: "${lesson.title}" (${legacyId} → ${newLesson.id})`)
            totalMigrated++
          }
        }
      } catch (courseError) {
        console.error(`❌ [Migration] Error processing course ${course.id}:`, courseError)
        errors.push({
          courseId: course.id,
          error: String(courseError)
        })
      }
    }

    console.log(`\n✅ [Migration] Complete! Migrated ${totalMigrated} lessons`)
    if (errors.length > 0) {
      console.log(`⚠️ [Migration] ${errors.length} errors occurred:`, errors)
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete`,
      migrated: totalMigrated,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("❌ [Migration] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
