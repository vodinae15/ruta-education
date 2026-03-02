import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Блокируем фейковые Server Action запросы (от ботов/сканеров)
  // Наше приложение не использует Server Actions, поэтому любой такой запрос - это атака
  const nextAction = request.headers.get('next-action')
  if (nextAction) {
    console.log(`🚫 [Middleware] Blocked fake Server Action request: ${nextAction}`)
    return new NextResponse(
      JSON.stringify({ error: 'Server Actions not supported' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Пропускаем API routes без обработки сессии (они обрабатывают авторизацию сами)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Для API routes просто пропускаем или добавляем CORS заголовки если нужно
    const response = NextResponse.next()
    // API routes обрабатывают CORS сами
    return response
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
