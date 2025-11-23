"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { UserIcon, MailIcon, LockIcon } from "@/components/ui/icons"
import { createClient } from "@/lib/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"

export default function AuthPage() {
  const [userType, setUserType] = useState<"teacher" | "student">("teacher")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showManualRedirect, setShowManualRedirect] = useState(false)
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
  })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get("courseId")

  const supabase = createClient()

  const getErrorMessage = (error: any): string => {
    const message = error.message || error.toString()

    // Common Supabase auth errors translated to Russian
    if (message.includes("Invalid login credentials")) {
      return "Неверный email или пароль. Проверьте правильность введенных данных."
    }
    if (message.includes("User not found")) {
      return "Аккаунт с такой почтой не зарегистрирован."
    }
    if (message.includes("Email not confirmed")) {
      return "Аккаунт с такой почтой не зарегистрирован."
    }
    if (message.includes("Password should be at least 6 characters")) {
      return "Пароль должен содержать минимум 6 символов."
    }
    if (message.includes("User already registered")) {
      return "Пользователь с таким email уже зарегистрирован. Попробуйте войти в систему."
    }
    if (message.includes("Invalid email")) {
      return "Введите корректный email адрес."
    }
    if (message.includes("Signup is disabled")) {
      return "Регистрация временно отключена. Обратитесь к администратору."
    }
    if (message.includes("Too many requests")) {
      return "Слишком много попыток. Попробуйте через несколько минут."
    }

    // Default fallback message
    return "Произошла ошибка при аутентификации. Попробуйте еще раз."
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
    if (success) setSuccess("")
  }

  const handleStudentAuth = async () => {
    try {
      if (isLogin) {
        // ВХОД СТУДЕНТА
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (error) throw error

        if (data.user) {
          // Устанавливаем user_type как student
          if (!data.user.user_metadata?.user_type) {
            await supabase.auth.updateUser({
              data: { user_type: "student" }
            })
          }

          // Проверяем, что это студент (не преподаватель)
          const { data: studentProfile, error: profileError } = await supabase
            .from("students")
            .select("*")
            .eq("email", formData.email)
            .single()

          if (profileError && profileError.code === "PGRST116") {
            // Если студент не найден в таблице students, создаем запись
            const { error: createError } = await supabase
              .from("students")
              .insert({ 
                email: formData.email,
                user_id: data.user.id 
              })

            if (createError) throw createError
          }

          // Перенаправляем на дашборд студента
          setTimeout(() => {
            router.replace("/student-dashboard")
          }, 100)
        }
      } else {
        // РЕГИСТРАЦИЯ СТУДЕНТА
        if (!agreements.terms || !agreements.privacy) {
          setError("Необходимо согласиться с условиями использования и политикой конфиденциальности")
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              user_type: "student", // Помечаем как студента
            },
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
                            (process.env.NEXT_PUBLIC_APP_URL 
                              ? `${process.env.NEXT_PUBLIC_APP_URL}/student-dashboard`
                              : `${window.location.origin}/student-dashboard`),
          },
        })

        if (error) throw error

        if (data.user) {
          // Создаем запись студента в таблице students
          const { error: createStudentError } = await supabase
            .from("students")
            .insert({ 
              email: formData.email,
              user_id: data.user.id 
            })

          if (createStudentError) {
            console.error("Error creating student profile:", createStudentError)
            // Не прерываем процесс, так как пользователь уже создан в auth
          }

          setSuccess("Ваш аккаунт студента зарегистрирован")

          setTimeout(() => {
            if (data.user.email_confirmed_at) {
              router.replace("/student-dashboard")
            } else {
              router.replace("/student-dashboard")
            }
          }, 2000)
        }
      }
    } catch (error: any) {
      console.error("Student auth error:", error)
      setError(getErrorMessage(error))
      throw error // Пробрасываем ошибку для обработки в handleSubmit
    }
  }

  const handleTeacherAuth = async () => {
    try {
      if (isLogin) {
        console.log("🔐 Attempting teacher login with:", formData.email)
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (error) {
          console.error("❌ Teacher login error:", error)
          throw error
        }

        if (data.user) {
          console.log("✅ Teacher login successful:", data.user.email)
          console.log("👤 User metadata:", data.user.user_metadata)
          console.log("🔒 Session:", data.session ? "Active" : "None")
          
          // Проверяем, есть ли user_type в метаданных, если нет - устанавливаем как teacher
          if (!data.user.user_metadata?.user_type) {
            console.log("🔄 Setting user_type to teacher")
            const { error: updateError } = await supabase.auth.updateUser({
              data: { user_type: "teacher" }
            })
            
            if (updateError) {
              console.error("❌ Error updating user metadata:", updateError)
            } else {
              console.log("✅ User metadata updated successfully")
            }
          }
          
          // Проверяем, что сессия действительно сохранена
          console.log("🔍 Checking session persistence...")
          const { data: sessionCheck } = await supabase.auth.getSession()
          console.log("📋 Session check result:", sessionCheck.session ? "Valid" : "Invalid")
          
          if (sessionCheck.session) {
            console.log("✅ Session confirmed, redirecting...")
            setSuccess("Вход выполнен успешно! Перенаправление через 2 секунды...")
            
            // Даем время middleware обновиться и переходим
            console.log("⏰ Setting timeout for redirect...")
            setTimeout(() => {
              console.log("🚀 Timeout fired! Attempting redirect to dashboard...")
              console.log("🌐 Current location:", window.location.href)
              try {
                window.location.href = "/dashboard"
                console.log("✅ Redirect command executed")
              } catch (error) {
                console.error("❌ Redirect failed:", error)
                setError("Не удалось перейти автоматически. Попробуйте перейти вручную.")
              }
            }, 2000) // Уменьшаем задержку

            // Добавляем ручной переход через 5 секунд, если автоматический не сработал
            setTimeout(() => {
              if (window.location.pathname === "/auth") {
                console.log("🔄 Auto redirect failed, showing manual option...")
                setSuccess("Автоматический переход не сработал. Используйте кнопку ниже.")
                setShowManualRedirect(true)
              }
            }, 5000)
          } else {
            console.error("❌ Session not found after login")
            setError("Ошибка сохранения сессии. Попробуйте еще раз.")
          }
        }
      } else {
        if (!agreements.terms || !agreements.privacy) {
          setError("Необходимо согласиться с условиями использования и политикой конфиденциальности")
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              user_type: "teacher", // Помечаем как преподавателя
            },
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
                            (process.env.NEXT_PUBLIC_APP_URL 
                              ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                              : `${window.location.origin}/dashboard`),
          },
        })

        if (error) throw error

        if (data.user) {
          setSuccess("Ваш аккаунт зарегистрирован")

          setTimeout(() => {
            if (data.user.email_confirmed_at) {
              router.replace("/dashboard")
            } else {
              router.replace("/dashboard")
            }
          }, 2000)
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      setError(getErrorMessage(error))
      throw error // Пробрасываем ошибку для обработки в handleSubmit
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🚀 Form submitted!")
    console.log("📧 Email:", formData.email)
    console.log("🔐 Password:", formData.password ? "***SET***" : "***NOT SET***")
    console.log("👤 User type:", userType)
    
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (userType === "student") {
        console.log("🎓 Processing student auth...")
        await handleStudentAuth()
      } else {
        console.log("👨‍🏫 Processing teacher auth...")
        await handleTeacherAuth()
      }
    } catch (error) {
      // Ошибка уже обработана в handleTeacherAuth/handleStudentAuth
      console.error("💥 Submit error:", error)
    } finally {
      console.log("🏁 Setting loading to false")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center py-8">
      <div className="w-full max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Добро пожаловать
          </h1>
        </div>

        {/* User type tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-light-gray rounded-lg p-1 flex border border-[#E5E7EB]">
            <button
              onClick={() => {
                setUserType("teacher")
                setFormData({ name: "", email: "", password: "" })
                setError("")
                setSuccess("")
              }}
              className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                userType === "teacher" ? "bg-white text-[#5589a7]" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Преподаватель
            </button>
            <button
              onClick={() => {
                setUserType("student")
                setFormData({ name: "", email: "", password: "" })
                setError("")
                setSuccess("")
              }}
              className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                userType === "student" ? "bg-white text-[#5589a7]" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Студент
            </button>
          </div>
        </div>

        <Card className="border border-[#E5E7EB] bg-white">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-slate-900 font-bold">
              {isLogin ? "Вход" : "Регистрация"}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-1">
              {isLogin
                ? "Введите ваши данные для входа"
                : userType === "student"
                  ? "Создайте аккаунт студента"
                  : "Создайте аккаунт преподавателя"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field for registration */}
              {!isLogin && (
                <Input
                  label="Имя"
                  type="text"
                  placeholder="Введите ваше имя"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  autoComplete="name"
                  icon={<UserIcon className="w-4 h-4 text-[#5589a7]" />}
                />
              )}

              {/* Email field */}
              <Input
                label="Электронная почта"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                autoComplete="email"
                icon={<MailIcon className="w-4 h-4 text-[#5589a7]" />}
              />

              {/* Password field */}
              <Input
                label="Пароль"
                type="password"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                autoComplete="current-password"
                helper={!isLogin ? "Минимум 6 символов" : undefined}
                icon={<LockIcon className="w-4 h-4 text-[#5589a7]" />}
              />

              {/* Agreement checkboxes */}
              {!isLogin && (
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreements.terms}
                      onCheckedChange={(checked) => setAgreements((prev) => ({ ...prev, terms: checked as boolean }))}
                    />
                    <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed">
                      Соглашаюсь с{" "}
                      <a href="https://docs.google.com/document/d/1gD6B9RPVtZDHXn9Jsha4GLi7kaSWY3Ve/edit?usp=drive_link&ouid=117485244745598251135&rtpof=true&sd=true" target="_blank" className="text-[#5589a7] hover:underline" rel="noreferrer">
                        пользовательским соглашением
                      </a>
                    </label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="privacy"
                      checked={agreements.privacy}
                      onCheckedChange={(checked) =>
                        setAgreements((prev) => ({ ...prev, privacy: checked as boolean }))
                      }
                    />
                    <label htmlFor="privacy" className="text-xs text-slate-600 leading-relaxed">
                      Соглашаюсь с{" "}
                      <a href="https://docs.google.com/document/d/18EkmXPeV0ays8ZGx_cz79duNZhr-cwnW/edit?usp=drive_link&ouid=117485244745598251135&rtpof=true&sd=true" target="_blank" className="text-[#5589a7] hover:underline" rel="noreferrer">
                        политикой конфиденциальности
                      </a>
                    </label>
                  </div>
                </div>
              )}

              {/* Success message */}
              {success && (
                <div className="p-3 bg-[#E8F4FA] border border-[#CDE6F9] rounded-lg">
                  <p className="text-sm text-[#5589a7]">{success}</p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg">
                  <p className="text-sm text-slate-900" dangerouslySetInnerHTML={{ __html: error }} />
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-10 text-sm bg-[#659AB8] hover:bg-[#5589a7] text-white border-2 border-[#659AB8] hover:border-[#5589a7] rounded-lg font-semibold"
                loading={loading}
                disabled={loading}
              >
                {loading
                  ? isLogin
                    ? "Вход..."
                    : "Создание..."
                  : isLogin
                    ? "Войти"
                    : "Создать аккаунт"}
              </Button>
            </form>

            {/* Toggle between login/register */}
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-600">{isLogin ? "Ещё нет аккаунта?" : "Уже есть аккаунт?"}</p>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setSuccess("")
                  setFormData({ name: "", email: "", password: "" })
                  setAgreements({ terms: false, privacy: false })
                }}
                className="mt-1 text-sm text-[#5589a7] hover:underline font-medium"
              >
                {isLogin ? "Зарегистрироваться" : "Войти"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Manual redirect button */}
        {showManualRedirect && (
          <div className="mt-4">
            <button
              onClick={() => {
                console.log("🔄 Manual redirect clicked")
                window.location.href = "/dashboard"
              }}
              className="w-full py-2 bg-[#659AB8] hover:bg-[#5589a7] text-white border-2 border-[#659AB8] hover:border-[#5589a7] rounded-lg text-sm font-semibold transition-colors duration-200"
            >
              Перейти в личный кабинет
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            {userType === "student" ? "Персонализированное обучение" : "Создание курсов и управление обучением"}
          </p>
        </div>
      </div>
    </div>
  )
}
