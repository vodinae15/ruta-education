"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
      <div className="min-h-screen bg-background-gray">
        <div className="container-custom py-12">
          <div className="space-y-6">
            <Skeleton className="h-16 w-96" />
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <MainNavigation user={user} />

      {/* Hero Section */}
      <section className="section-white section-spacing">
        <div className="container-custom">
          <div className="text-center">
            <h1 className="h1 mb-6">
              Образовательная платформа
              <br />
              <span className="text-accent">с двойной персонализацией</span>
            </h1>

            <div className="bg-light-blue rounded-2xl p-8 lg:p-10 mb-12 max-w-4xl mx-auto">
              <p className="body-large" style={{ color: 'var(--color-text-primary)' }}>
                Ruta.education адаптирует коммуникацию{" "}
                <span className="text-accent">под стиль преподавателя</span> и тип восприятия каждого
                ученика — один курс дает <span className="text-accent">72 варианта подачи материала</span>{" "}
                для максимальной эффективности обучения
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/auth" className="btn-primary">
                Начать использовать платформу
              </Link>
              <Link href="#why-it-works" className="btn-secondary">
                Как это работает
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section-spacing">
        <div className="container-custom">
          <div className="text-center section-header">
            <h2 className="h2 mb-4">
              <span className="text-accent">Принцип</span> двойной персонализации
            </h2>
            <p className="body-large max-w-3xl mx-auto">
              Платформа определяет тип автора и локализует коммуникацию для каждого участника процесса.
              Преподаватель и студенты получают то, что близко именно им
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center mb-10">
            <div className="bg-light-gray rounded-lg p-1 flex">
              <button
                onClick={() => setActiveTab("teachers")}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  activeTab === "teachers" ? "tab-active" : "body hover:text-[#111827]"
                }`}
              >
                Для преподавателей
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  activeTab === "students" ? "tab-active" : "body hover:text-[#111827]"
                }`}
              >
                Для студентов
              </button>
            </div>
          </div>

          {/* Tabbed Content */}
          {activeTab === "teachers" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Пройдите тест на тип автора</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Определите свой стиль и начните работать с персонализированными рекомендациями
                  </p>
                </CardContent>
              </Card>

              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <BookIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Создавайте курс в конструкторе</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Наполните 9 модулей контентом в удобном формате. Получите оптимальную структуру курса
                    для вашего стиля
                  </p>
                </CardContent>
              </Card>

              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <PlayIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Добавьте почту ученика</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Укажите email учеников при публикации курса. Система автоматически откроет им доступ к обучению
                  </p>
                </CardContent>
              </Card>

              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <BarChartIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Получайте обратную связь</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Анализируйте статистику и применяйте конкретные рекомендации по улучшению курса
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "students" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <PlayIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Откройте доступ</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Получите приглашение от преподавателя и откройте доступ к обучению
                  </p>
                </CardContent>
              </Card>

              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Пройдите тест на тип восприятия</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Определите свой способ восприятия информации и выберите подходящий формат обратной связи
                  </p>
                </CardContent>
              </Card>

              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <EyeIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Приступите к обучению</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Получайте персонализированные рекомендации и адаптированную под ваш тип восприятия подачу
                  </p>
                </CardContent>
              </Card>

              <Card className="card-custom card-hover text-center h-full">
                <CardHeader className="pb-4">
                  <div className="icon-container-md icon-circle mx-auto mb-4">
                    <TrendingUpIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="h3 text-accent" style={{ fontSize: '1.125rem' }}>Отслеживайте свой прогресс</h3>
                </CardHeader>
                <CardContent>
                  <p className="small text-center">
                    Получайте мотивирующую обратную связь и делитесь прогрессом с преподавателем автоматически
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition Section */}
      <section id="why-it-works" className="section-white section-spacing">
        <div className="container-custom text-center" style={{ maxWidth: '72rem' }}>
          <h2 className="h2 mb-6">
            <span className="text-accent">Почему</span> это работает
          </h2>
          <p className="body-large max-w-3xl mx-auto">
            Ruta.education адаптирует один курс <span className="text-accent">под стиль автора</span> и{" "}
            <span className="text-accent">тип восприятия учеников</span>
          </p>

          {/* Stats Section */}
          <div className="mt-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="icon-container-lg icon-circle mx-auto mb-6">
                  <TrendingUpIcon className="w-10 h-10 text-white" />
                </div>
                <div className="h2 text-accent mb-2">8 типов</div>
                <p className="body">авторов с персонализированными конструкторами</p>
              </div>
              <div className="text-center">
                <div className="icon-container-lg icon-circle mx-auto mb-6">
                  <UserIcon className="w-10 h-10 text-white" />
                </div>
                <div className="h2 text-accent mb-2">9 типов</div>
                <p className="body">учеников с адаптивным контентом</p>
              </div>
              <div className="text-center">
                <div className="icon-container-lg icon-circle mx-auto mb-6">
                  <BookIcon className="w-10 h-10 text-white" />
                </div>
                <div className="h2 text-accent mb-2">72 подхода</div>
                <p className="body">к обучению и прохождению курсов</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="section-spacing">
        <div className="container-custom">
          <div className="cta-section p-8 lg:p-12 max-w-4xl mx-auto text-center">
            <h2 className="h2 mb-6" style={{ color: 'var(--color-text-primary)' }}>
              <span className="text-accent">Создайте</span> свой первый курс
              <br />
              за 15 минут
            </h2>
            <p className="body-large mb-10">
              Пройдите тест, выберите шаблон и наполните курс контентом. Система сама адаптирует материал
              под разные типы восприятия студентов
            </p>
            <Link href="/auth" className="btn-primary">
              Начать создание курса
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-gray py-8">
        <div className="container-custom">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Image
                src="/images/ruta-logo-compact.png"
                alt="Ruta.education"
                width={360}
                height={144}
                className="h-36 w-auto"
              />
            </div>
            <p className="body">Платформа персонализированного обучения</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
