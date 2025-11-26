"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PricingCard } from "@/components/ui/pricing-card"
import { MainNavigation } from "@/components/ui/main-navigation"
import { PageHeader } from "@/components/ui/page-header"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { BookOpenIcon, ArrowLeftIcon, CheckCircleIcon } from "@/components/ui/icons"
import { useToast } from "@/components/ui/use-toast"

interface Pricing {
  id: string
  name: string
  price: number
  description: string
  has_feedback: boolean
  bonus_content?: string | null
  is_default: boolean
  order_index: number
}

interface Course {
  id: string
  title: string
  description: string | null
  launch_mode: string | null
  stream_start_date: string | null
}

export default function CoursePricingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const courseId = params.courseId as string
  const { user, loading: authLoading } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [purchases, setPurchases] = useState<string[]>([]) // Массив ID купленных тарифов
  const [hasFreeAccess, setHasFreeAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    } else if (!authLoading && !user) {
      router.push(`/auth?courseId=${courseId}`)
    }
  }, [courseId, user, authLoading, router])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Загружаем курс
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, description, launch_mode, stream_start_date")
        .eq("id", courseId)
        .single()

      if (courseError || !courseData) {
        console.error("Error loading course:", courseError)
        router.push("/student-dashboard")
        return
      }

      setCourse(courseData)

      // Загружаем тарифы
      const response = await fetch(`/api/course-pricing?courseId=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setPricing(data.pricing || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: "Не удалось загрузить тарифы" }))
        console.error("Error loading pricing:", errorData)
        toast({
          title: "Ошибка загрузки тарифов",
          description: errorData.error || "Не удалось загрузить тарифы курса. Попробуйте обновить страницу.",
          variant: "destructive",
        })
      }

      // Проверяем бесплатный доступ
      if (user?.email) {
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("email", user.email)
          .maybeSingle()

        if (student) {
          // Проверяем бесплатный доступ
          const { data: freeAccess } = await supabase
            .from("student_course_access")
            .select("id")
            .eq("course_id", courseId)
            .eq("student_id", student.id)
            .maybeSingle()

          setHasFreeAccess(!!freeAccess)

          // Загружаем покупки
          const purchasesResponse = await fetch(`/api/course-purchase?courseId=${courseId}`)
          if (purchasesResponse.ok) {
            const purchasesData = await purchasesResponse.json()
            const purchasedPricingIds = (purchasesData.purchases || []).map((p: any) => p.pricing_id)
            setPurchases(purchasedPricingIds)
          } else {
            // Ошибка загрузки покупок не критична, просто логируем
            console.error("Error loading purchases:", purchasesResponse.status)
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (pricingId: string) => {
    if (!user) {
      router.push(`/auth?courseId=${courseId}`)
      return
    }

    try {
      setPurchasingId(pricingId)

      const response = await fetch("/api/course-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          pricingId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при покупке")
      }

      // Показываем успех
      setPurchaseSuccess(true)
      toast({
        title: "Покупка успешна!",
        description: "Тариф успешно активирован",
      })

      // Обновляем список покупок
      setPurchases([...purchases, pricingId])

      // Если это бесплатный тариф, обновляем статус бесплатного доступа
      const purchasedPricing = pricing.find((p) => p.id === pricingId)
      if (purchasedPricing?.is_default) {
        setHasFreeAccess(true)
      }

      // Редирект через 2 секунды
      setTimeout(() => {
        router.push(`/course/${courseId}/adaptation`)
      }, 2000)
    } catch (error) {
      console.error("Error purchasing:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось выполнить покупку",
        variant: "destructive",
      })
    } finally {
      setPurchasingId(null)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <MainNavigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64 bg-gray-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-white border border-[#E5E7EB]">
                  <Skeleton className="h-6 w-32 mb-4 bg-gray-200" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-200" />
                  <Skeleton className="h-4 w-3/4 bg-gray-200" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <MainNavigation user={user} />

      <PageHeader
        title="Тарифы курса"
        description="Выберите подходящий тариф для доступа к курсу"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push(`/course/${courseId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Назад к курсу
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Информация о курсе */}
        <Card className="text-center border mb-8">
          <CardHeader className="pb-4">
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpenIcon className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-lg text-[#5589a7]">{course.title}</CardTitle>
            {course.description && (
              <p className="text-sm text-slate-600 mt-2">{course.description}</p>
            )}
            {course.launch_mode === "stream" && course.stream_start_date && (
              <div className="mt-3 p-3 bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg inline-block">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Потоковый курс</span> — старт{" "}
                  {new Date(course.stream_start_date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Сообщение об успешной покупке */}
        {purchaseSuccess && (
          <Card className="mb-8 bg-green-50 border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Покупка успешна!</p>
                  <p className="text-sm text-green-700">Перенаправление на курс...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Тарифы */}
        {pricing.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-slate-600">Тарифы для этого курса пока не настроены</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {pricing.map((p) => (
              <PricingCard
                key={p.id}
                pricing={p}
                isPurchased={purchases.includes(p.id)}
                isFreeAccess={hasFreeAccess && p.is_default}
                onPurchase={handlePurchase}
                isPurchasing={purchasingId === p.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

