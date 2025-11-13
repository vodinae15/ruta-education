const { createClient } = require('@supabase/supabase-js')

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Отсутствуют переменные окружения')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testStudentAccessFlow() {
  try {
    console.log('🧪 Тестирование полного потока доступа студента...')
    
    const testEmail = `test-student-${Date.now()}@example.com`
    const testCourseId = 'd09b07d9-7487-4a25-a7a6-651b62f96c72' // ID курса "История России"
    
    console.log(`📧 Тестовый email: ${testEmail}`)
    console.log(`📚 ID курса: ${testCourseId}`)
    
    // 1. Создаем студента
    console.log('\n1️⃣ Создание студента...')
    const { data: student, error: createError } = await supabase
      .from('students')
      .insert({
        email: testEmail,
      })
      .select('id, email')
      .single()
    
    if (createError) {
      console.error('❌ Ошибка создания студента:', createError)
      return
    }
    
    console.log('✅ Студент создан:', student)
    
    // 2. Предоставляем доступ к курсу
    console.log('\n2️⃣ Предоставление доступа к курсу...')
    const { error: accessError } = await supabase
      .from('student_course_access')
      .insert({
        student_id: student.id,
        course_id: testCourseId,
        first_accessed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        progress: {},
      })
    
    if (accessError) {
      console.error('❌ Ошибка предоставления доступа:', accessError)
      return
    }
    
    console.log('✅ Доступ предоставлен')
    
    // 3. Проверяем, что доступ действительно есть
    console.log('\n3️⃣ Проверка доступа...')
    const { data: access, error: checkError } = await supabase
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
          email
        ),
        courses (
          id,
          title,
          description,
          is_published
        )
      `)
      .eq('student_id', student.id)
      .eq('course_id', testCourseId)
      .single()
    
    if (checkError) {
      console.error('❌ Ошибка проверки доступа:', checkError)
      return
    }
    
    console.log('✅ Доступ подтвержден:', {
      student: access.students.email,
      course: access.courses.title,
      coursePublished: access.courses.is_published,
      firstAccess: access.first_accessed_at
    })
    
    // 4. Проверяем, что студент может получить свои курсы
    console.log('\n4️⃣ Проверка получения курсов студента...')
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_course_access')
      .select(`
        course_id,
        first_accessed_at,
        last_accessed_at,
        progress,
        courses (
          id,
          title,
          description,
          is_published,
          created_at
        )
      `)
      .eq('student_id', student.id)
      .order('last_accessed_at', { ascending: false })
    
    if (coursesError) {
      console.error('❌ Ошибка получения курсов студента:', coursesError)
      return
    }
    
    console.log('✅ Курсы студента получены:', studentCourses.length, 'курсов')
    studentCourses.forEach(course => {
      console.log(`   - ${course.courses.title} (${course.courses.is_published ? 'опубликован' : 'черновик'})`)
    })
    
    // 5. Очистка - удаляем тестовые данные
    console.log('\n5️⃣ Очистка тестовых данных...')
    
    // Удаляем доступ
    const { error: deleteAccessError } = await supabase
      .from('student_course_access')
      .delete()
      .eq('student_id', student.id)
      .eq('course_id', testCourseId)
    
    if (deleteAccessError) {
      console.error('⚠️ Ошибка удаления доступа:', deleteAccessError)
    } else {
      console.log('✅ Доступ удален')
    }
    
    // Удаляем студента
    const { error: deleteStudentError } = await supabase
      .from('students')
      .delete()
      .eq('id', student.id)
    
    if (deleteStudentError) {
      console.error('⚠️ Ошибка удаления студента:', deleteStudentError)
    } else {
      console.log('✅ Студент удален')
    }
    
    console.log('\n🎉 Все тесты пройдены успешно!')
    console.log('💡 Система доступа студентов работает корректно')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

testStudentAccessFlow()
