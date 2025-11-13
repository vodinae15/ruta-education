import { createClient } from "@/lib/supabase/client"

/**
 * Проверяет, может ли пользователь редактировать курс
 * Пользователь может редактировать, если он:
 * 1. Автор курса (author_id === user.id)
 * 2. Соавтор курса (есть запись в course_collaborators)
 * 
 * @param courseId - ID курса
 * @param userId - ID пользователя
 * @returns Promise<boolean> - true если пользователь может редактировать
 */
export async function canEditCourse(courseId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    // Проверяем, существует ли курс
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.error("Error checking course access:", courseError)
      return false
    }

    // Проверяем, является ли пользователь автором
    if (course.author_id === userId) {
      return true
    }

    // Проверяем, является ли пользователь соавтором
    const { data: collaborator, error: collaboratorError } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_user_id", userId)
      .maybeSingle()

    if (collaboratorError) {
      console.error("Error checking collaborator access:", collaboratorError)
      return false
    }

    return !!collaborator
  } catch (error) {
    console.error("Error in canEditCourse:", error)
    return false
  }
}

/**
 * Проверяет, является ли пользователь автором курса
 * 
 * @param courseId - ID курса
 * @param userId - ID пользователя
 * @returns Promise<boolean> - true если пользователь является автором
 */
export async function isCourseAuthor(courseId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      return false
    }

    return course.author_id === userId
  } catch (error) {
    console.error("Error in isCourseAuthor:", error)
    return false
  }
}

/**
 * Проверяет, является ли пользователь соавтором курса
 * 
 * @param courseId - ID курса
 * @param userId - ID пользователя
 * @returns Promise<boolean> - true если пользователь является соавтором
 */
export async function isCourseCollaborator(courseId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { data: collaborator, error: collaboratorError } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_user_id", userId)
      .maybeSingle()

    if (collaboratorError) {
      console.error("Error checking collaborator:", collaboratorError)
      return false
    }

    return !!collaborator
  } catch (error) {
    console.error("Error in isCourseCollaborator:", error)
    return false
  }
}

/**
 * Получает информацию о доступе пользователя к курсу
 * 
 * @param courseId - ID курса
 * @param userId - ID пользователя
 * @returns Promise<{ canEdit: boolean, isAuthor: boolean, isCollaborator: boolean }>
 */
export async function getCourseAccess(courseId: string, userId: string): Promise<{
  canEdit: boolean
  isAuthor: boolean
  isCollaborator: boolean
}> {
  try {
    const supabase = createClient()

    // Получаем информацию о курсе
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      return {
        canEdit: false,
        isAuthor: false,
        isCollaborator: false,
      }
    }

    const isAuthor = course.author_id === userId

    // Проверяем, является ли пользователь соавтором
    const { data: collaborator } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_user_id", userId)
      .maybeSingle()

    const isCollaborator = !!collaborator
    const canEdit = isAuthor || isCollaborator

    return {
      canEdit,
      isAuthor,
      isCollaborator,
    }
  } catch (error) {
    console.error("Error in getCourseAccess:", error)
    return {
      canEdit: false,
      isAuthor: false,
      isCollaborator: false,
    }
  }
}

