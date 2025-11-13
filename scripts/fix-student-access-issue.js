const { createClient } = require('@supabase/supabase-js')

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Отсутствуют переменные окружения:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixStudentAccessIssue() {
  try {
    console.log('🔧 Исправление проблемы с доступом студентов...')
    
    // 1. Проверяем структуру таблицы students
    console.log('📋 Проверка структуры таблицы students...')
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .limit(1)
    
    if (studentsError) {
      console.error('❌ Ошибка при проверке таблицы students:', studentsError)
      return
    }
    
    console.log('✅ Таблица students доступна')
    
    // 2. Проверяем структуру таблицы student_course_access
    console.log('📋 Проверка структуры таблицы student_course_access...')
    const { data: access, error: accessError } = await supabase
      .from('student_course_access')
      .select('*')
      .limit(1)
    
    if (accessError) {
      console.error('❌ Ошибка при проверке таблицы student_course_access:', accessError)
      return
    }
    
    console.log('✅ Таблица student_course_access доступна')
    
    // 3. Пробуем создать тестового студента
    console.log('🧪 Тестирование создания студента...')
    const testEmail = `test-${Date.now()}@example.com`
    
    const { data: newStudent, error: createError } = await supabase
      .from('students')
      .insert({
        email: testEmail,
      })
      .select('id, email')
      .single()
    
    if (createError) {
      console.error('❌ Ошибка при создании студента:', createError)
      return
    }
    
    console.log('✅ Студент создан успешно:', newStudent)
    
    // 4. Удаляем тестового студента
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', newStudent.id)
    
    if (deleteError) {
      console.error('⚠️ Ошибка при удалении тестового студента:', deleteError)
    } else {
      console.log('✅ Тестовый студент удален')
    }
    
    console.log('🎉 Все проверки пройдены успешно!')
    console.log('💡 Проблема может быть в:')
    console.log('   - Отсутствии переменной SUPABASE_SERVICE_ROLE_KEY в .env.local')
    console.log('   - Неправильных RLS политиках')
    console.log('   - Проблемах с правами доступа')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

fixStudentAccessIssue()
