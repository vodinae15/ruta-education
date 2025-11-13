import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Middleware: Supabase credentials not found")
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Устанавливаем cookie в request для немедленного использования
            request.cookies.set(name, value)
            // И в response для будущих запросов
            // Определяем, находимся ли мы в production
            const isProduction = process.env.NODE_ENV === 'production'
            // Проверяем, используем ли мы HTTPS (для production обязательно)
            const isSecure = isProduction || request.nextUrl.protocol === 'https:'
            
            // Создаем опции для cookies
            const cookieOptions: any = {
              ...options,
              httpOnly: false, // Разрешаем доступ из JavaScript
              secure: isSecure, // В production обязательно HTTPS
              sameSite: 'lax' as const
            }
            
            // В production не устанавливаем domain явно, чтобы избежать проблем с поддоменами
            // Supabase сам управляет domain для cookies через свои настройки
            
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // createServerClient автоматически читает cookies в правильном формате
  // из createBrowserClient, поэтому дополнительная логика не нужна

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  // Логируем результат получения пользователя
  if (userError) {
    console.log("🔍 Middleware: Error getting user:", userError.message)
  } else {
    console.log("🔍 Middleware: User check:", user ? user.email : "No user found")
    console.log("🔍 Accessing path:", request.nextUrl.pathname)
  }

  // Определяем типы страниц  
  const isAuthPage = request.nextUrl.pathname === "/auth" || request.nextUrl.pathname.startsWith("/auth/")
  const isCourseAccess = request.nextUrl.pathname.startsWith("/course/")
  const isHomePage = request.nextUrl.pathname === "/"
  const isAuthorTest = request.nextUrl.pathname.startsWith("/author-test")
  const isStudentDashboard = request.nextUrl.pathname.startsWith("/student-dashboard")
  const isStudentTest = request.nextUrl.pathname.startsWith("/student-test")
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/")
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard")
  const isCourseConstructor = request.nextUrl.pathname.startsWith("/course-constructor")
  const isStudentTestResults = request.nextUrl.pathname.startsWith("/student-test-results")
  const isStudents = request.nextUrl.pathname.startsWith("/students")

  // Страницы, доступные без авторизации
  const publicPages = isAuthPage || isCourseAccess || isHomePage || isStudentTest || isApiRoute

  // Страницы, требующие авторизации teacher
  const teacherPages = isAuthorTest || isDashboard || isCourseConstructor || isStudents

  // Страницы, требующие авторизации student  
  const studentPages = isStudentDashboard || isStudentTestResults

  if (!user && !publicPages) {
    // Redirect unauthenticated users to login page
    console.log("🔄 Redirecting unauthenticated user to auth")
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    return NextResponse.redirect(url)
  }

  // If user is authenticated and trying to access auth page, redirect to appropriate dashboard
  if (user && isAuthPage) {
    const userType = user.user_metadata?.user_type
    console.log("🔄 Authenticated user accessing auth page, redirecting based on type:", userType)
    
    const url = request.nextUrl.clone()
    if (userType === "student") {
      url.pathname = "/student-dashboard"
    } else {
      // Для teacher или пользователей без типа перенаправляем на dashboard
      url.pathname = "/dashboard"
    }
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check their access rights
  if (user) {
    const userType = user.user_metadata?.user_type
    console.log(`🔍 Middleware: User ${user.email} (${userType || "NO TYPE"}) accessing ${request.nextUrl.pathname}`)
    
    // Если у пользователя нет типа, разрешаем доступ (по умолчанию teacher)
    if (!userType) {
      console.log("⚠️ User has no user_type, allowing access")
      return supabaseResponse
    }
    
    // Проверяем доступ teacher к teacher страницам
    if (userType === "teacher" && (teacherPages || publicPages)) {
      console.log("✅ Allowing teacher access")
      return supabaseResponse
    }
    
    // Проверяем доступ student к student страницам
    if (userType === "student" && (studentPages || publicPages)) {
      console.log("✅ Allowing student access")
      return supabaseResponse
    }
    
    // Если student пытается зайти на teacher страницы
    if (userType === "student" && teacherPages) {
      console.log("🔄 Redirecting student from teacher pages to student dashboard")
      const url = request.nextUrl.clone()
      url.pathname = "/student-dashboard"
      return NextResponse.redirect(url)
    }
    
    // Если teacher пытается зайти на student страницы
    if (userType === "teacher" && studentPages) {
      console.log("🔄 Redirecting teacher from student pages to teacher dashboard")
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
