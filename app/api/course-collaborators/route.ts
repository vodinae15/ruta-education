import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

interface Collaborator {
  id: string
  course_id: string
  collaborator_email: string
  collaborator_user_id: string | null
  added_by: string
  added_at: string
  collaborator_name?: string // Для отображения
}

/**
 * POST - Добавить соавтора к курсу
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [API] POST /api/course-collaborators - начало обработки")
    
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
    const { courseId, email } = await request.json()
    console.log("📥 [API] Получены данные:", { courseId, email })

    if (!courseId || !email) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields: courseId and email" }, { status: 400 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)
    console.log("🔧 [API] Service client создан")

    // Проверяем, что курс существует
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.log("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Проверяем, что пользователь является автором курса
    if (course.author_id !== user.id) {
      console.log("❌ [API] Пользователь не является автором курса")
      return NextResponse.json({ error: "Forbidden: Only course author can add collaborators" }, { status: 403 })
    }

    console.log("✅ [API] Пользователь является автором курса")

    // Нормализуем email
    const normalizedEmail = email.trim().toLowerCase()

    // Проверяем, что пользователь не пытается добавить самого себя
    if (normalizedEmail === user.email?.toLowerCase()) {
      console.log("❌ [API] Нельзя добавить самого себя как соавтора")
      return NextResponse.json({ error: "Cannot add yourself as a collaborator" }, { status: 400 })
    }

    // Проверяем, существует ли уже такой соавтор
    const { data: existingCollaborator, error: checkError } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_email", normalizedEmail)
      .maybeSingle()

    if (checkError) {
      console.error("❌ [API] Ошибка проверки существующего соавтора:", checkError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (existingCollaborator) {
      console.log("⚠️ [API] Соавтор уже добавлен")
      return NextResponse.json({ 
        error: "Collaborator already exists",
        message: `User ${normalizedEmail} is already a collaborator on this course`
      }, { status: 409 })
    }

    // Ищем пользователя по email в существующих таблицах
    // Если пользователь еще не зарегистрирован, collaborator_user_id будет null
    // Обновим его позже, когда пользователь зарегистрируется
    
    let collaboratorUserId: string | null = null

    // Пытаемся найти user_id через таблицу students
    const { data: studentData } = await supabase
      .from("students")
      .select("user_id")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (studentData?.user_id) {
      collaboratorUserId = studentData.user_id
      console.log("✅ [API] Найден user_id через students:", collaboratorUserId)
    } else {
      // Пытаемся найти через author_profiles (если есть связь с email)
      // Для этого нужно найти user_id через другие таблицы или оставить null
      // Если не нашли, оставляем null - обновим позже, когда пользователь зарегистрируется
      console.log("⚠️ [API] User_id не найден, сохраняем только email. Обновим при регистрации пользователя")
    }

    // Добавляем соавтора
    console.log("🎯 [API] Добавляем соавтора:", normalizedEmail, "к курсу:", courseId)
    const { data: newCollaborator, error: insertError } = await supabase
      .from("course_collaborators")
      .insert({
        course_id: courseId,
        collaborator_email: normalizedEmail,
        collaborator_user_id: collaboratorUserId,
        added_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("❌ [API] Ошибка добавления соавтора:", insertError)
      return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 })
    }

    console.log("🎉 [API] Соавтор успешно добавлен!")
    return NextResponse.json({ 
      success: true,
      collaborator: newCollaborator,
      message: `Collaborator ${normalizedEmail} added successfully`
    })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET - Получить список соавторов курса
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 [API] GET /api/course-collaborators - начало обработки")
    
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
    const courseId = searchParams.get("courseId")
    console.log("📥 [API] Получен courseId:", courseId)

    if (!courseId) {
      console.log("❌ [API] Отсутствует courseId")
      return NextResponse.json({ error: "Missing courseId parameter" }, { status: 400 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    // Проверяем, что курс существует
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.log("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Проверяем права доступа: автор или соавтор могут видеть список
    const isAuthor = course.author_id === user.id
    
    // Проверяем, является ли пользователь соавтором (по user_id или email)
    const { data: collaboratorByUserId } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_user_id", user.id)
      .maybeSingle()
    
    const { data: collaboratorByEmail } = await supabase
      .from("course_collaborators")
      .select("id")
      .eq("course_id", courseId)
      .eq("collaborator_email", user.email)
      .maybeSingle()
    
    const isCollaborator = !!collaboratorByUserId || !!collaboratorByEmail

    if (!isAuthor && !isCollaborator) {
      console.log("❌ [API] Нет прав доступа")
      return NextResponse.json({ error: "Forbidden: No access to this course" }, { status: 403 })
    }

    console.log("✅ [API] Права доступа подтверждены")

    // Получаем список соавторов
    const { data: collaborators, error: collaboratorsError } = await supabase
      .from("course_collaborators")
      .select("*")
      .eq("course_id", courseId)
      .order("added_at", { ascending: false })

    if (collaboratorsError) {
      console.error("❌ [API] Ошибка загрузки соавторов:", collaboratorsError)
      return NextResponse.json({ error: "Failed to fetch collaborators" }, { status: 500 })
    }

    console.log("✅ [API] Соавторы загружены:", collaborators?.length || 0, "записей")

    return NextResponse.json({ 
      collaborators: collaborators || [],
      course: {
        id: course.id,
        title: course.title,
        author_id: course.author_id
      }
    })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE - Удалить соавтора из курса
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("🚀 [API] DELETE /api/course-collaborators - начало обработки")
    
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
    const { courseId, collaboratorId } = await request.json()
    console.log("📥 [API] Получены данные:", { courseId, collaboratorId })

    if (!courseId || !collaboratorId) {
      console.log("❌ [API] Отсутствуют обязательные поля")
      return NextResponse.json({ error: "Missing required fields: courseId and collaboratorId" }, { status: 400 })
    }

    // Создаем service client для обхода RLS
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey)

    // Проверяем, что курс существует
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      console.log("❌ [API] Курс не найден:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Проверяем, что пользователь является автором курса
    if (course.author_id !== user.id) {
      console.log("❌ [API] Пользователь не является автором курса")
      return NextResponse.json({ error: "Forbidden: Only course author can remove collaborators" }, { status: 403 })
    }

    console.log("✅ [API] Пользователь является автором курса")

    // Проверяем, что соавтор существует
    const { data: collaborator, error: collaboratorError } = await supabase
      .from("course_collaborators")
      .select("id, collaborator_email")
      .eq("id", collaboratorId)
      .eq("course_id", courseId)
      .single()

    if (collaboratorError || !collaborator) {
      console.log("❌ [API] Соавтор не найден:", collaboratorError)
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })
    }

    // Удаляем соавтора
    console.log("🎯 [API] Удаляем соавтора:", collaborator.collaborator_email)
    const { error: deleteError } = await supabase
      .from("course_collaborators")
      .delete()
      .eq("id", collaboratorId)
      .eq("course_id", courseId)

    if (deleteError) {
      console.error("❌ [API] Ошибка удаления соавтора:", deleteError)
      return NextResponse.json({ error: "Failed to remove collaborator" }, { status: 500 })
    }

    console.log("🎉 [API] Соавтор успешно удален!")
    return NextResponse.json({ 
      success: true,
      message: `Collaborator ${collaborator.collaborator_email} removed successfully`
    })

  } catch (error) {
    console.error("❌ [API] Критическая ошибка:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

