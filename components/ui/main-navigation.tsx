"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "./logo"
import { Button } from "./button"
import { LogOutIcon, UserIcon } from "./icons"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { NotificationsBell } from "./notifications-bell"

interface MainNavigationProps {
  user?: any
  className?: string
}

export function MainNavigation({ user, className = "" }: MainNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      console.log("Выход из системы...")
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Ошибка при выходе:", error)
      } else {
        console.log("Успешный выход из системы")
        // Принудительно перезагружаем страницу для очистки состояния
        window.location.href = "/"
      }
    } catch (err) {
      console.error("Ошибка при выходе:", err)
      // В случае ошибки все равно перенаправляем на главную
      window.location.href = "/"
    }
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className={`bg-white border-b border-light-gray ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <Logo />
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                isActive("/") ? "text-[#5589a7]" : "text-slate-600 hover:text-[#5589a7]"
              }`}
            >
              Главная
            </Link>

            {user && (
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  isActive("/dashboard") ? "text-[#5589a7]" : "text-slate-600 hover:text-[#5589a7]"
                }`}
              >
                Личный кабинет
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Уведомления (только для авторов) */}
                {user.user_metadata?.user_type === "teacher" && (
                  <NotificationsBell authorId={user.id} />
                )}
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-600">{user.email?.split("@")[0] || "Автор"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-slate-600 hover:text-[#5589a7] transition-colors"
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
