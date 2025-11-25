// Simple migration runner
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function migrateLesson(courseId) {
  console.log('🔄 Starting migration for course:', courseId)

  // Get course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, modules, course_data')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    console.error('❌ Course not found:', courseError)
    return
  }

  console.log('✅ Found course:', course.title)

  // Get lessons from modules or course_data
  let lessons = []
  if (course.modules?.lessons) {
    lessons = course.modules.lessons
    console.log('✅ Found', lessons.length, 'lessons in modules.lessons')
  } else if (course.course_data?.lessons) {
    lessons = course.course_data.lessons
    console.log('✅ Found', lessons.length, 'lessons in course_data.lessons')
  }

  if (lessons.length === 0) {
    console.log('⚠️ No lessons to migrate')
    return
  }

  // Check existing
  const { data: existing } = await supabase
    .from('course_lessons')
    .select('id, legacy_id')
    .eq('course_id', courseId)

  console.log('📊 Existing lessons in course_lessons:', existing?.length || 0)

  let migrated = 0

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i]
    const legacyId = lesson.id || lesson.lessonId || `lesson-${i}`

    // Check if already migrated
    if (existing?.some(e => e.legacy_id === legacyId)) {
      console.log(`  ⏭️ Lesson "${lesson.title}" already migrated`)
      continue
    }

    const lessonData = {
      course_id: courseId,
      title: lesson.title || `Урок ${i + 1}`,
      description: lesson.description || null,
      blocks: lesson.blocks || [],
      materials: lesson.materials || [],
      tests: lesson.tests || [],
      order_index: lesson.order_index ?? lesson.order ?? i,
      status: 'published',
      legacy_id: legacyId
    }

    const { data: newLesson, error: insertError } = await supabase
      .from('course_lessons')
      .insert(lessonData)
      .select()
      .single()

    if (insertError) {
      console.error(`  ❌ Error inserting "${lesson.title}":`, insertError.message)
    } else {
      console.log(`  ✅ Migrated: "${lesson.title}" (${legacyId} → ${newLesson.id})`)
      migrated++
    }
  }

  console.log(`\n✅ Migration complete! Migrated ${migrated} lessons`)
}

const courseId = process.argv[2] || '53f6f7aa-e096-46b4-938d-d5a8489a3572'
migrateLesson(courseId).catch(console.error)
