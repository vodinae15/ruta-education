import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Получаем данные из запроса
    const body = await request.json()
    const { courseId, title, description, lessons, blocks, personalizedInterface, authorType } = body

    // Валидация обязательных полей
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Название курса обязательно" }, { status: 400 })
    }

    // Подготавливаем данные для сохранения
    const courseData = {
      title: title.trim(),
      description: description || "",
      modules: {
        lessons: lessons || [],
        author_type: authorType,
        personalization: personalizedInterface || {},
        blocks: blocks || [],
      },
      updated_at: new Date().toISOString(),
    }

    let savedCourseId = courseId

    if (courseId) {
      // Обновляем существующий черновик
      const { data, error: updateError } = await supabase
        .from("courses")
        .update(courseData)
        .eq("id", courseId)
        .eq("author_id", user.id) // RLS проверка
        .select()
        .single()

      if (updateError) {
        console.error("Error updating draft:", updateError)
        return NextResponse.json({ error: "Ошибка при обновлении черновика" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        courseId: data.id,
        message: "Черновик обновлен",
      })
    } else {
      // Создаем новый черновик
      const tempId = crypto.randomUUID()
      const uniqueLink = `${request.nextUrl.origin}/course/${tempId}`

      const { data, error: insertError } = await supabase
        .from("courses")
        .insert({
          ...courseData,
          author_id: user.id,
          status: "draft",
          is_published: false,
          unique_link: uniqueLink,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating draft:", insertError)
        return NextResponse.json({ error: "Ошибка при создании черновика" }, { status: 500 })
      }

      savedCourseId = data.id

      // Обновляем unique_link с реальным ID
      const actualUniqueLink = `${request.nextUrl.origin}/course/${savedCourseId}`
      await supabase.from("courses").update({ unique_link: actualUniqueLink }).eq("id", savedCourseId)

      return NextResponse.json({
        success: true,
        courseId: savedCourseId,
        message: "Черновик создан",
      })
    }
  } catch (error) {
    console.error("Error in draft save API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
