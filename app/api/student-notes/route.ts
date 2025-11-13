import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

interface StudentNote {
  id: string
  author_id: string
  student_id: string
  course_id: string
  note: string
  created_by: string
  created_at: string
  updated_at: string
  created_by_email?: string // Для отображения
  created_by_type?: "author" | "student" // Для удобства
}

/**
 * GET - Получить все заметки по ученику и курсу
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/student-notes - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    
    // Создаем обычный клиент для проверки авторизации
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      console.log("❌ [API] Пользователь не авторизован")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API] Пользователь авторизован:", user.email)
    
    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const courseId = searchParams.get("courseId")
    
    if (!studentId || !courseId) {
      console.log("❌ [API] Отсутствуют обязательные параметры")
      return NextResponse.json({ error: "Missing required parameters: studentId and courseId" }, { status: 400 })
    }
    
    console.log("📥 [API] Параметры запроса:", { studentId, courseId, userId: user.id })
    
    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    
    // Проверяем права доступа
    // Автор может видеть заметки по своим курсам
    // Ученик может видеть свои заметки
    
    // Получаем информацию о курсе
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, author_id")
      .eq("id", courseId)
      .single()
    
    if (courseError || !course) {
      console.error("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
    
    // Получаем информацию о студенте
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, user_id, email")
      .eq("id", studentId)
      .single()
    
    if (studentError || !student) {
      console.error("❌ [API] Студент не найден:", studentError)
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }
    
    // Проверяем права доступа
    const isAuthor = course.author_id === user.id
    // Проверяем, является ли соавтором
    const { data: isCollaborator } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_user_id", user.id)
      .maybeSingle()
    const isStudent = student.user_id === user.id || student.email === user.email
    
    if (!isAuthor && !isCollaborator && !isStudent) {
      console.log("❌ [API] Нет прав доступа")
      return NextResponse.json({ error: "Forbidden: No access to these notes" }, { status: 403 })
    }
    
    console.log("✅ [API] Права доступа подтверждены:", { isAuthor, isStudent })
    
    // Получаем все заметки
    const { data: notes, error: notesError } = await supabase
      .from("student_notes")
      .select("*")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
    
    if (notesError) {
      console.error("❌ [API] Ошибка загрузки заметок:", notesError)
      return NextResponse.json({ error: "Failed to load notes" }, { status: 500 })
    }
    
    // Обогащаем заметки информацией о создателе
    const enrichedNotes = await Promise.all(
      (notes || []).map(async (note) => {
        // Определяем тип создателя
        // Проверяем, является ли создатель автором или соавтором
        const isCreatorAuthor = note.created_by === course.author_id
        const { data: isCreatorCollaborator } = await supabase
          .from("course_collaborators")
          .select("id")
          .eq("course_id", courseId)
          .eq("collaborator_user_id", note.created_by)
          .maybeSingle()
        const createdByType: "author" | "student" = (isCreatorAuthor || isCreatorCollaborator) ? "author" : "student"
        
        // Получаем email создателя
        let creatorEmail = "Unknown"
        if (isCreatorAuthor) {
          // Если это автор, получаем из таблицы author_profiles или courses
          // Email автора можно получить из auth.users, но для упрощения используем текущего пользователя
          if (note.created_by === user.id) {
            creatorEmail = user.email || "Unknown"
          } else {
            // Пробуем получить из students (если автор также студент) или оставляем Unknown
            creatorEmail = "Автор курса"
          }
        } else {
          // Если это студент, получаем из таблицы students
          const { data: studentData } = await supabase
            .from("students")
            .select("email")
            .eq("user_id", note.created_by)
            .single()
          
          if (studentData) {
            creatorEmail = studentData.email
          } else if (note.created_by === user.id) {
            creatorEmail = user.email || "Unknown"
          }
        }
        
        return {
          ...note,
          created_by_email: creatorEmail,
          created_by_type: createdByType
        }
      })
    )
    
    console.log("✅ [API] Загружено заметок:", enrichedNotes.length)
    
    return NextResponse.json({
      notes: enrichedNotes
    })
    
  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * POST - Создать новую заметку
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [API] POST /api/student-notes - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    
    // Создаем обычный клиент для проверки авторизации
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      console.log("❌ [API] Пользователь не авторизован")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API] Пользователь авторизован:", user.email)
    
    // Получаем данные из запроса
    const body = await request.json()
    const { studentId, courseId, note } = body
    
    if (!studentId || !courseId || !note || !note.trim()) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields: studentId, courseId, note" }, { status: 400 })
    }
    
    console.log("📥 [API] Данные запроса:", { studentId, courseId, noteLength: note.length })
    
    // Создаем service client
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    
    // Получаем информацию о курсе
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, author_id")
      .eq("id", courseId)
      .single()
    
    if (courseError || !course) {
      console.error("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
    
    // Получаем информацию о студенте
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, user_id, email")
      .eq("id", studentId)
      .single()
    
    if (studentError || !student) {
      console.error("❌ [API] Студент не найден:", studentError)
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }
    
    // Проверяем права доступа
    const isAuthor = course.author_id === user.id
    // Проверяем, является ли соавтором
    const { data: isCollaborator } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_user_id", user.id)
      .maybeSingle()
    const isStudent = student.user_id === user.id || student.email === user.email
    
    if (!isAuthor && !isCollaborator && !isStudent) {
      console.log("❌ [API] Нет прав для создания заметки")
      return NextResponse.json({ error: "Forbidden: No permission to create note" }, { status: 403 })
    }
    
    // Если это автор, проверяем, что студент имеет доступ к курсу
    if (isAuthor) {
      const { data: access, error: accessError } = await supabase
        .from("student_course_access")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .single()
      
      if (accessError || !access) {
        console.log("❌ [API] Студент не имеет доступа к курсу")
        return NextResponse.json({ error: "Student does not have access to this course" }, { status: 403 })
      }
    }
    
    console.log("✅ [API] Права доступа подтверждены:", { isAuthor, isStudent })
    
    // Создаем заметку
    const { data: newNote, error: createError } = await supabase
      .from("student_notes")
      .insert({
        author_id: course.author_id,
        student_id: studentId,
        course_id: courseId,
        note: note.trim(),
        created_by: user.id
      })
      .select()
      .single()
    
    if (createError) {
      console.error("❌ [API] Ошибка создания заметки:", createError)
      return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
    }
    
    console.log("✅ [API] Заметка создана:", newNote.id)
    
    // Обогащаем заметку информацией о создателе
    const creatorEmail = user.email || "Unknown"
    const createdByType: "author" | "student" = isAuthor ? "author" : "student"
    
    return NextResponse.json({
      success: true,
      note: {
        ...newNote,
        created_by_email: creatorEmail,
        created_by_type: createdByType
      }
    })
    
  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * PUT - Обновить существующую заметку
 */
export async function PUT(request: NextRequest) {
  try {
    console.log("🚀 [API] PUT /api/student-notes - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    
    // Создаем обычный клиент для проверки авторизации
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      console.log("❌ [API] Пользователь не авторизован")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API] Пользователь авторизован:", user.email)
    
    // Получаем данные из запроса
    const body = await request.json()
    const { noteId, note } = body
    
    if (!noteId || !note || !note.trim()) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields: noteId, note" }, { status: 400 })
    }
    
    console.log("📥 [API] Обновление заметки:", { noteId, noteLength: note.length })
    
    // Создаем service client
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    
    // Получаем существующую заметку
    const { data: existingNote, error: fetchError } = await supabase
      .from("student_notes")
      .select("*")
      .eq("id", noteId)
      .single()
    
    if (fetchError || !existingNote) {
      console.error("❌ [API] Заметка не найдена:", fetchError)
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }
    
    // Проверяем, что пользователь является создателем заметки
    if (existingNote.created_by !== user.id) {
      console.log("❌ [API] Нет прав для редактирования заметки")
      return NextResponse.json({ error: "Forbidden: You can only edit your own notes" }, { status: 403 })
    }
    
    console.log("✅ [API] Права на редактирование подтверждены")
    
    // Обновляем заметку
    const { data: updatedNote, error: updateError } = await supabase
      .from("student_notes")
      .update({
        note: note.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", noteId)
      .select()
      .single()
    
    if (updateError) {
      console.error("❌ [API] Ошибка обновления заметки:", updateError)
      return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
    }
    
    console.log("✅ [API] Заметка обновлена:", updatedNote.id)
    
    // Определяем тип создателя
    const { data: course } = await supabase
      .from("courses")
      .select("author_id")
      .eq("id", existingNote.course_id)
      .single()
    
    const isCreatorAuthor = course?.author_id === user.id
    const { data: isCreatorCollaborator } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", existingNote.course_id)
      .eq("collaborator_user_id", user.id)
      .maybeSingle()
    const createdByType: "author" | "student" = (isCreatorAuthor || isCreatorCollaborator) ? "author" : "student"
    const creatorEmail = user.email || "Unknown"
    
    return NextResponse.json({
      success: true,
      note: {
        ...updatedNote,
        created_by_email: creatorEmail,
        created_by_type: createdByType
      }
    })
    
  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * DELETE - Удалить заметку
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("🚀 [API] DELETE /api/student-notes - начало обработки")
    
    // Проверяем переменные окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API] Отсутствуют переменные окружения")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    
    // Создаем обычный клиент для проверки авторизации
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      console.log("❌ [API] Пользователь не авторизован")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API] Пользователь авторизован:", user.email)
    
    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get("noteId")
    
    if (!noteId) {
      console.log("❌ [API] Отсутствует noteId")
      return NextResponse.json({ error: "Missing required parameter: noteId" }, { status: 400 })
    }
    
    console.log("📥 [API] Удаление заметки:", { noteId })
    
    // Создаем service client
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    
    // Получаем существующую заметку
    const { data: existingNote, error: fetchError } = await supabase
      .from("student_notes")
      .select("*")
      .eq("id", noteId)
      .single()
    
    if (fetchError || !existingNote) {
      console.error("❌ [API] Заметка не найдена:", fetchError)
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }
    
    // Проверяем, что пользователь является создателем заметки
    if (existingNote.created_by !== user.id) {
      console.log("❌ [API] Нет прав для удаления заметки")
      return NextResponse.json({ error: "Forbidden: You can only delete your own notes" }, { status: 403 })
    }
    
    console.log("✅ [API] Права на удаление подтверждены")
    
    // Удаляем заметку
    const { error: deleteError } = await supabase
      .from("student_notes")
      .delete()
      .eq("id", noteId)
    
    if (deleteError) {
      console.error("❌ [API] Ошибка удаления заметки:", deleteError)
      return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
    }
    
    console.log("✅ [API] Заметка удалена:", noteId)
    
    return NextResponse.json({
      success: true,
      message: "Note deleted successfully"
    })
    
  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

