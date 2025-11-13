import { createBrowserClient } from '@supabase/ssr'

// Глобальный клиент для избежания множественных экземпляров
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Если клиент уже создан, возвращаем его
  if (supabaseClient) {
    console.log("♻️ Reusing existing Supabase client instance")
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Проверяем наличие переменных окружения
  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not defined")
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required")
  }

  if (!supabaseAnonKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
  }

  console.log("🆕 Creating new Supabase client instance")
  console.log("🔗 URL:", supabaseUrl)
  console.log("🔑 Key:", supabaseAnonKey.substring(0, 20) + "...")
  
  // Используем createBrowserClient из @supabase/ssr
  // Он автоматически управляет cookies в правильном формате
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

  // Добавляем обработчик событий авторизации для логирования
  if (typeof window !== 'undefined') {
    supabaseClient.auth.onAuthStateChange((event: string, session: any) => {
      console.log(`🔄 Auth event: ${event}`)
      if (session?.user) {
        console.log(`✅ User: ${session.user.email}`)
      }
    })
  }

  return supabaseClient
}
