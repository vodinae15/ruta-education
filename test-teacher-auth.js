// Тестовый скрипт для проверки авторизации преподавателя
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTeacherAuth() {
  console.log('🔐 Testing teacher authentication...')
  
  // Тестовые данные преподавателя
  const testEmail = 'teacher@test.com'
  const testPassword = 'password123'
  
  try {
    // Попытка входа
    console.log('📧 Attempting login with:', testEmail)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (error) {
      console.error('❌ Login error:', error.message)
      return
    }
    
    if (data.user) {
      console.log('✅ Login successful!')
      console.log('👤 User ID:', data.user.id)
      console.log('📧 Email:', data.user.email)
      console.log('🏷️ User type:', data.user.user_metadata?.user_type)
      console.log('📅 Created at:', data.user.created_at)
      
      // Проверяем сессию
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('❌ Session error:', sessionError.message)
      } else {
        console.log('🔑 Session valid:', !!sessionData.session)
      }
      
      // Выход
      await supabase.auth.signOut()
      console.log('👋 Logged out successfully')
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

testTeacherAuth()
