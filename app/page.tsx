"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MainNavigation } from "@/components/ui/main-navigation"
import { UserIcon, BookIcon, TrendingUpIcon, PlayIcon, EyeIcon, BarChartIcon } from "@/components/ui/icons"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"

export default function HomePage() {
  const user = null
  const loading = false
  const [activeTab, setActiveTab] = useState<"teachers" | "students">("teachers")

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === "#teachers-tab") {
        setActiveTab("teachers")
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
      } else if (hash === "#students-tab") {
        setActiveTab("students")
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
      }
    }

    const hash = window.location.hash
    if (hash === "#teachers-tab") {
      setActiveTab("teachers")
    } else if (hash === "#students-tab") {
      setActiveTab("students")
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="space-y-6">
            <Skeleton className="h-16 w-96 mx-auto" />
            <Skeleton className="h-8 w-64 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-14 w-14 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-6 w-32 mx-auto mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mx-auto" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <MainNavigation user={user} />

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-8">
              Образовательная платформа{" "}
              <br />
              <span className="text-[#5589a7]">с двойной персонализацией</span>
            </h1>

            <div className="bg-light-blue rounded-2xl p-6 sm:p-8 mb-8 max-w-4xl mx-auto">
              <p className="text-xl lg:text-2xl text-slate-900 font-medium">
                Ruta.education адаптирует коммуникацию{" "}
                <span className="text-primary">под стиль преподавателя</span> и тип восприятия каждого
                ученика — один курс дает <span className="text-primary">72 варианта подачи материала</span>{" "}
                для максимальной эффективности обучения
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth"
                className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
              >
                Начать использовать платформу
              </Link>
              <Link
                href="#why-it-works"
                className="bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
              >
                Как это работает
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              <span className="text-[#5589a7]">Принцип</span> двойной персонализации
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Платформа определяет тип автора и локализует коммуникацию для каждого участника процесса.
              Преподаватель и студенты получают то, что близко именно им
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center mb-8">
            <div className="bg-light-gray rounded-lg p-1 flex">
              <button
                onClick={() => setActiveTab("teachers")}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === "teachers" ? "bg-white text-[#5589a7]" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Для преподавателей
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === "students" ? "bg-white text-[#5589a7]" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Для студентов
              </button>
            </div>
          </div>

          {/* Tabbed Content */}
          {activeTab === "teachers" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Пройдите тест на тип автора</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>Определите свой стиль и начните работать с персонализированными рекомендациями</p>
                </CardContent>
              </Card>

              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Создавайте курс в конструкторе</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>
                    Наполните 9 модулей контентом в удобном формате. Получите оптимальную структуру курса
                    для вашего стиля
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlayIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Добавьте почту ученика</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>
                    Укажите email учеников при публикации курса. Система автоматически откроет им доступ к обучению
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChartIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Получайте обратную связь</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>Анализируйте статистику и применяйте конкретные рекомендации по улучшению курса</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "students" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlayIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Откройте доступ</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>
                    Получите приглашение от преподавателя и откройте доступ к обучению
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Пройдите тест на тип восприятия</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>Определите свой способ восприятия информации и выберите подходящий формат обратной связи</p>
                </CardContent>
              </Card>

              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <EyeIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Приступите к обучению</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>Получайте персонализированные рекомендации и адаптированную под ваш тип восприятия подачу</p>
                </CardContent>
              </Card>

              <Card className="text-center border h-full">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUpIcon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-[#5589a7]">Отслеживайте свой прогресс</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 text-center">
                  <p>Получайте мотивирующую обратную связь и делитесь прогрессом с преподавателем автоматически</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition Section */}
      <section id="why-it-works" className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            <span className="text-[#5589a7]">Почему</span> это работает
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-8">
            Ruta.education адаптирует один курс <span className="text-[#5589a7]">под стиль автора</span> и{" "}
            <span className="text-[#5589a7]">тип восприятия учеников</span>
          </p>

          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUpIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-[#5589a7] mb-2">8 типов</div>
              <p className="text-sm text-slate-600">авторов с персонализированными конструкторами</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-[#5589a7] mb-2">9 типов</div>
              <p className="text-sm text-slate-600">учеников с адаптивным контентом</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <BookIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-[#5589a7] mb-2">72 подхода</div>
              <p className="text-sm text-slate-600">к обучению и прохождению курсов</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-light-blue rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
              <span className="text-primary">Создайте</span> свой первый курс за 15 минут
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Пройдите тест, выберите шаблон и наполните курс контентом. Система сама адаптирует материал
              под разные типы восприятия студентов
            </p>
            <Link
              href="/auth"
              className="inline-block bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
            >
              Начать создание курса
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-light-gray py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <Image
              src="/images/ruta-logo-compact.png"
              alt="Ruta.education"
              width={360}
              height={144}
              className="h-36 w-auto"
            />
            <p className="text-sm text-slate-600">Платформа персонализированного обучения</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
