import { createClient } from "@/lib/supabase/client"
import { canEditCourse } from "@/lib/course-access"
import type { CourseLesson } from "@/lib/course-constructor-logic"
import { createDefaultPricing } from "@/lib/course-pricing"

export interface CourseData {
  id: string
  title: string
  description: string
  author_id: string
  status: "draft" | "published" | "hidden"
  is_published: boolean
  author_type?: string
  personalization_settings?: any
  lessons: CourseLesson[]
  created_at: string
  updated_at: string
}

export interface LessonData {
  id: string
  course_id: string
  title: string
  description: string
  order_index: number
  blocks: any[]
  completed: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}

export class CourseDatabase {
  private supabase: any

  // Создать экземпляр с кастомным клиентом (для серверного использования)
  constructor(customClient?: any) {
    this.supabase = customClient || createClient()
  }

  // Получить курс с уроками
  async getCourseWithLessons(courseId: string, userId: string): Promise<CourseData | null> {
    try {
      // Проверяем доступ к редактированию (автор или соавтор)
      const hasAccess = await canEditCourse(courseId, userId)
      if (!hasAccess) {
        console.error("User does not have access to this course")
        return null
      }

      const { data: course, error: courseError } = await this.supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      if (courseError) {
        console.error("Error fetching course:", courseError)
        return null
      }

      const { data: lessons, error: lessonsError } = await this.supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (lessonsError) {
        console.error("Error fetching lessons:", lessonsError)
        return null
      }

      return {
        ...course,
        lessons: lessons || [],
      }
    } catch (error) {
      console.error("Error in getCourseWithLessons:", error)
      return null
    }
  }

  // Создать новый курс
  async createCourse(title: string, description: string, userId: string, authorType?: string): Promise<string | null> {
    try {
      const tempId = crypto.randomUUID()
      const uniqueLink = `${window.location.origin}/course/${tempId}`

      const { data: courseData, error: courseError } = await this.supabase
        .from("courses")
        .insert({
          title,
          description,
          author_id: userId,
          status: "draft",
          is_published: false,
          unique_link: uniqueLink,
          author_type: authorType,
          modules: {}, // Пустой объект для совместимости
        })
        .select()
        .single()

      if (courseError) {
        console.error("Error creating course:", courseError)
        return null
      }

      // Обновляем ссылку с реальным ID
      const actualUniqueLink = `${window.location.origin}/course/${courseData.id}`
      await this.supabase.from("courses").update({ unique_link: actualUniqueLink }).eq("id", courseData.id)

      // Создаем тарифы по умолчанию
      await createDefaultPricing(courseData.id)

      return courseData.id
    } catch (error) {
      console.error("Error in createCourse:", error)
      return null
    }
  }

  // Обновить курс
  async updateCourse(
    courseId: string,
    userId: string,
    updates: {
      title?: string
      description?: string
      status?: "draft" | "published" | "hidden"
      is_published?: boolean
      author_type?: string
      personalization_settings?: any
    },
  ): Promise<boolean> {
    try {
      // Проверяем доступ к редактированию (автор или соавтор)
      const hasAccess = await canEditCourse(courseId, userId)
      if (!hasAccess) {
        console.error("User does not have access to edit this course")
        return false
      }

      // Обновляем курс (RLS политики уже проверяют доступ)
      const { error } = await this.supabase.from("courses").update(updates).eq("id", courseId)

      if (error) {
        console.error("Error updating course:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in updateCourse:", error)
      return false
    }
  }

  // Удалить курс
  async deleteCourse(courseId: string, userId: string): Promise<boolean> {
    try {
      console.log("[CourseDatabase.deleteCourse] Starting deletion for course:", courseId, "user:", userId)

      // Сначала проверяем, что курс существует и пользователь - автор
      const { data: course, error: courseError } = await this.supabase
        .from("courses")
        .select("id, author_id")
        .eq("id", courseId)
        .single()

      if (courseError) {
        console.error("[CourseDatabase.deleteCourse] Error fetching course:", courseError)
        return false
      }

      if (!course) {
        console.error("[CourseDatabase.deleteCourse] Course not found:", courseId)
        return false
      }

      console.log("[CourseDatabase.deleteCourse] Course found. Author:", course.author_id, "Current user:", userId)

      // Проверяем, является ли пользователь автором
      if (course.author_id !== userId) {
        console.error("[CourseDatabase.deleteCourse] User is not the author. Access denied.")
        return false
      }

      console.log("[CourseDatabase.deleteCourse] User is author. Proceeding with deletion...")

      // Удаляем курс (связанные уроки удалятся каскадно через БД)
      const { error: deleteError } = await this.supabase
        .from("courses")
        .delete()
        .eq("id", courseId)
        .eq("author_id", userId) // Дополнительная проверка безопасности

      if (deleteError) {
        console.error("[CourseDatabase.deleteCourse] Error deleting course:", deleteError)
        return false
      }

      console.log("[CourseDatabase.deleteCourse] Course successfully deleted:", courseId)
      return true
    } catch (error) {
      console.error("[CourseDatabase.deleteCourse] Exception:", error)
      return false
    }
  }

  // Создать урок
  async createLesson(
    courseId: string,
    title: string,
    description = "",
    authorType = "standard",
  ): Promise<string | null> {
    try {
      // Используем функцию БД для создания урока с шаблоном
      const { data, error } = await this.supabase.rpc("create_lesson_with_template", {
        course_id_param: courseId,
        lesson_title: title,
        lesson_description: description,
        author_type_param: authorType,
      })

      if (error) {
        console.error("Error creating lesson:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in createLesson:", error)
      return null
    }
  }

  // Обновить урок
  async updateLesson(
    lessonId: string,
    updates: {
      title?: string
      description?: string
      blocks?: any[]
      completed?: boolean
      order_index?: number
      is_published?: boolean
    },
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("course_lessons").update(updates).eq("id", lessonId)

      if (error) {
        console.error("Error updating lesson:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in updateLesson:", error)
      return false
    }
  }

  // Удалить урок
  async deleteLesson(lessonId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("course_lessons").delete().eq("id", lessonId)

      if (error) {
        console.error("Error deleting lesson:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in deleteLesson:", error)
      return false
    }
  }

  // Получить все уроки курса
  async getCourseLessons(courseId: string): Promise<LessonData[]> {
    try {
      const { data, error } = await this.supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (error) {
        console.error("Error fetching lessons:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error in getCourseLessons:", error)
      return []
    }
  }

  // Сохранить весь курс с уроками (для совместимости)
  async saveCourseWithLessons(
    courseId: string,
    userId: string,
    courseData: {
      title: string
      description: string
      lessons: CourseLesson[]
      author_type?: string
      personalization?: any
    },
  ): Promise<boolean> {
    try {
      // Обновляем основную информацию о курсе
      const courseUpdateSuccess = await this.updateCourse(courseId, userId, {
        title: courseData.title,
        description: courseData.description,
        author_type: courseData.author_type,
        personalization_settings: courseData.personalization,
      })

      if (!courseUpdateSuccess) {
        return false
      }

      // Получаем существующие уроки
      const existingLessons = await this.getCourseLessons(courseId)
      const existingLessonIds = new Set(existingLessons.map((l) => l.id))

      // Обновляем или создаем уроки
      for (const lesson of courseData.lessons) {
        if (existingLessonIds.has(lesson.id)) {
          // Обновляем существующий урок
          await this.updateLesson(lesson.id, {
            title: lesson.title,
            description: lesson.description,
            blocks: lesson.blocks,
            completed: lesson.completed,
            order_index: lesson.order,
          })
        } else {
          // Создаем новый урок вручную (без шаблона)
          const { error } = await this.supabase.from("course_lessons").insert({
            id: lesson.id,
            course_id: courseId,
            title: lesson.title,
            description: lesson.description,
            order_index: lesson.order,
            blocks: lesson.blocks,
            completed: lesson.completed,
            is_published: false, // По умолчанию черновик
          })

          if (error) {
            console.error("Error creating lesson:", error)
            return false
          }
        }
      }

      // Удаляем уроки, которых больше нет
      const currentLessonIds = new Set(courseData.lessons.map((l) => l.id))
      for (const existingLesson of existingLessons) {
        if (!currentLessonIds.has(existingLesson.id)) {
          await this.deleteLesson(existingLesson.id)
        }
      }

      return true
    } catch (error) {
      console.error("Error in saveCourseWithLessons:", error)
      return false
    }
  }

  // Получить рекомендуемые элементы для типа автора
  async getRecommendedElements(authorType: string, blockType: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc("get_recommended_elements", {
        author_type_param: authorType,
        block_type_param: blockType,
      })

      if (error) {
        console.error("Error getting recommended elements:", error)
        return {
          recommended_elements: ["text", "video", "task"],
          hints: ["Базовые подсказки"],
        }
      }

      return data
    } catch (error) {
      console.error("Error in getRecommendedElements:", error)
      return {
        recommended_elements: ["text", "video", "task"],
        hints: ["Базовые подсказки"],
      }
    }
  }

  // Миграция старых курсов
  async migrateOldCourse(courseId: string, userId: string): Promise<boolean> {
    try {
      // Проверяем доступ к редактированию (автор или соавтор)
      const hasAccess = await canEditCourse(courseId, userId)
      if (!hasAccess) {
        console.error("User does not have access to this course")
        return false
      }

      const { data: course, error: courseError } = await this.supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      if (courseError || !course) {
        console.error("Error fetching course for migration:", courseError)
        return false
      }

      // Проверяем, есть ли уже уроки
      const existingLessons = await this.getCourseLessons(courseId)
      if (existingLessons.length > 0) {
        return true // Уже мигрирован
      }

      // Создаем урок из старых блоков
      if (course.modules && course.modules.blocks) {
        const { error: lessonError } = await this.supabase.from("course_lessons").insert({
          course_id: courseId,
          title: "Основной урок",
          description: "Автоматически созданный урок",
          order_index: 1,
          blocks: course.modules.blocks,
          completed: false,
        })

        if (lessonError) {
          console.error("Error creating migration lesson:", lessonError)
          return false
        }
      }

      return true
    } catch (error) {
      console.error("Error in migrateOldCourse:", error)
      return false
    }
  }
}

// Экспортируем singleton instance для клиентского использования
export const courseDatabase = new CourseDatabase()
