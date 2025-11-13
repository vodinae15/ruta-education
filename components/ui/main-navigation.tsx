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
                isActive("/") ? "text-primary" : "text-slate-600 hover:text-primary"
              }`}
            >
              Главная
            </Link>

            {user && (
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  isActive("/dashboard") ? "text-primary" : "text-slate-600 hover:text-primary"
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
                  <span className="text-sm text-slate-700">{user.email?.split("@")[0] || "Автор"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </div>
            ) : (
              <Button asChild className="bg-primary hover:bg-primary-hover text-white">
                <Link href="/auth">Войти</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
