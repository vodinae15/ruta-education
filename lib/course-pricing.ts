import { createClient } from "@/lib/supabase/client"

/**
 * Создает 3 тарифа по умолчанию для нового курса
 * @param courseId - ID курса
 * @returns Promise<boolean> - true если тарифы созданы успешно
 */
export async function createDefaultPricing(courseId: string): Promise<boolean> {
  try {
    console.log("💰 [Pricing] Создание тарифов по умолчанию для курса:", courseId)
    
    const supabase = createClient()

    // Проверяем, не созданы ли уже тарифы
    const { data: existingPricing } = await supabase
      .from("course_pricing")
      .select("id")
      .eq("course_id", courseId)
      .limit(1)

    if (existingPricing && existingPricing.length > 0) {
      console.log("⚠️ [Pricing] Тарифы уже существуют для курса:", courseId)
      return true // Уже созданы
    }

    // Создаем 3 тарифа по умолчанию
    const defaultPricing = [
      {
        course_id: courseId,
        name: "Базовый",
        price: 0,
        has_feedback: false,
        description: "Доступ к курсу без обратной связи",
        bonus_content: null,
        is_default: true,
        order_index: 0,
      },
      {
        course_id: courseId,
        name: "С обратной связью",
        price: 0, // Автор может изменить цену
        has_feedback: true,
        description: "Доступ к курсу с обратной связью от автора",
        bonus_content: null,
        is_default: false,
        order_index: 1,
      },
      {
        course_id: courseId,
        name: "Премиум",
        price: 0, // Автор может изменить цену
        has_feedback: true,
        description: "Доступ к курсу с обратной связью и дополнительными материалами",
        bonus_content: "", // Автор может добавить бонусный контент
        is_default: false,
        order_index: 2,
      },
    ]

    const { error: insertError } = await supabase
      .from("course_pricing")
      .insert(defaultPricing)

    if (insertError) {
      console.error("❌ [Pricing] Ошибка создания тарифов:", insertError)
      return false
    }

    console.log("✅ [Pricing] Тарифы по умолчанию успешно созданы для курса:", courseId)
    return true
  } catch (error) {
    console.error("❌ [Pricing] Критическая ошибка при создании тарифов:", error)
    return false
  }
}

/**
 * Получить тарифы курса
 * @param courseId - ID курса
 * @returns Promise с массивом тарифов
 */
export async function getCoursePricing(courseId: string) {
  try {
    const supabase = createClient()

    const { data: pricing, error } = await supabase
      .from("course_pricing")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true })

    if (error) {
      console.error("Error fetching pricing:", error)
      return []
    }

    return pricing || []
  } catch (error) {
    console.error("Error in getCoursePricing:", error)
    return []
  }
}

