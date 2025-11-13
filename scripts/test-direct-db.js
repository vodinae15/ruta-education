const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Отсутствуют переменные окружения')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testDirectDatabase() {
  try {
    console.log('🧪 Прямое тестирование базы данных...')
    
    const courseId = 'd09b07d9-7487-4a25-a7a6-651b62f96c72'
    
    // 1. Проверяем, что курс существует
    console.log('\n1️⃣ Проверяем курс...')
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, author_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      console.error('❌ Курс не найден:', courseError)
      return
    }
    
    console.log('✅ Курс найден:', course.title)
    console.log('   Автор ID:', course.author_id)
    
    // 2. Проверяем записи доступа
    console.log('\n2️⃣ Проверяем записи доступа...')
    const { data: accessRecords, error: accessError } = await supabase
      .from('student_course_access')
      .select(`
        id,
        student_id,
        course_id,
        first_accessed_at,
        last_accessed_at,
        progress,
        students (
          id,
          email,
          student_type
        )
      `)
      .eq('course_id', courseId)
      .order('first_accessed_at', { ascending: false })
    
    if (accessError) {
      console.error('❌ Ошибка загрузки записей доступа:', accessError)
      return
    }
    
    console.log('✅ Записи доступа загружены:', accessRecords?.length || 0, 'записей')
    
    if (accessRecords && accessRecords.length > 0) {
      accessRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.students.email} (ID: ${record.students.id})`)
        console.log(`      Доступ с: ${record.first_accessed_at}`)
      })
    } else {
      console.log('⚠️ Записи доступа не найдены')
    }
    
    // 3. Проверяем всех студентов
    console.log('\n3️⃣ Проверяем всех студентов...')
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('id, email, student_type')
      .order('created_at', { ascending: false })
    
    if (studentsError) {
      console.error('❌ Ошибка загрузки студентов:', studentsError)
      return
    }
    
    console.log('✅ Всего студентов в системе:', allStudents?.length || 0)
    if (allStudents && allStudents.length > 0) {
      allStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.email} (ID: ${student.id})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

testDirectDatabase()
