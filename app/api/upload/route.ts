import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// Максимальные размеры файлов (в байтах)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 200 * 1024 * 1024, // 200MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 20 * 1024 * 1024, // 20MB
}

// Разрешенные MIME типы
const ALLOWED_MIME_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  video: ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/x-m4a"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
}

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

    // Получаем данные из FormData
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileType = formData.get("fileType") as string // 'image' | 'video' | 'audio' | 'document'
    const courseId = formData.get("courseId") as string
    const lessonId = formData.get("lessonId") as string | null
    const blockId = formData.get("blockId") as string | null
    const elementId = formData.get("elementId") as string | null

    // Валидация
    if (!file) {
      return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 })
    }

    if (!fileType || !["image", "video", "audio", "document"].includes(fileType)) {
      return NextResponse.json({ error: "Недопустимый тип файла" }, { status: 400 })
    }

    if (!courseId) {
      return NextResponse.json({ error: "ID курса обязателен" }, { status: 400 })
    }

    // Проверяем размер файла
    const maxSize = MAX_FILE_SIZES[fileType as keyof typeof MAX_FILE_SIZES]
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Размер файла превышает ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Проверяем MIME тип
    const allowedTypes = ALLOWED_MIME_TYPES[fileType as keyof typeof ALLOWED_MIME_TYPES]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Недопустимый формат файла. Разрешены: ${allowedTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Проверяем доступ к курсу (автор или соавтор)
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, author_id")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    // Проверяем права доступа
    const isAuthor = course.author_id === user.id
    let isCollaborator = false

    if (!isAuthor) {
      const { data: collaborator } = await supabase
        .from("course_collaborators")
        .select("id")
        .eq("course_id", courseId)
        .eq("collaborator_user_id", user.id)
        .maybeSingle()

      isCollaborator = !!collaborator
    }

    if (!isAuthor && !isCollaborator) {
      return NextResponse.json({ error: "Нет доступа к курсу" }, { status: 403 })
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split(".").pop()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFileName = `${timestamp}-${randomString}-${sanitizedFileName}`

    // Путь в Storage: course-files/{courseId}/{fileType}/{uniqueFileName}
    const storagePath = `${courseId}/${fileType}/${uniqueFileName}`

    // Загружаем файл в Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("course-files")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: "Ошибка загрузки файла в хранилище" }, { status: 500 })
    }

    // Получаем публичный URL файла
    const { data: urlData } = supabase.storage.from("course-files").getPublicUrl(storagePath)

    const fileUrl = urlData.publicUrl

    // Извлекаем метаданные (для изображений и видео)
    let metadata: any = {}

    if (fileType === "image" || fileType === "video") {
      // Метаданные будут добавлены на клиенте через separate API call или можно использовать библиотеки
      // Пока оставляем пустыми, клиент может передать их отдельно
    }

    // Сохраняем метаданные в БД
    const { data: fileRecord, error: dbError } = await supabase
      .from("course_files")
      .insert({
        course_id: courseId,
        lesson_id: lessonId,
        block_id: blockId,
        element_id: elementId,
        file_type: fileType,
        file_name: file.name,
        file_size: file.size,
        file_url: fileUrl,
        storage_path: storagePath,
        mime_type: file.type,
        uploaded_by: user.id,
        ...metadata,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      // Пытаемся удалить файл из Storage, если не удалось сохранить в БД
      await supabase.storage.from("course-files").remove([storagePath])
      return NextResponse.json({ error: "Ошибка сохранения метаданных файла" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        url: fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileType,
        mimeType: file.type,
        storagePath: storagePath,
      },
    })
  } catch (error) {
    console.error("Upload API error:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    // Получаем fileId из URL параметров
    const url = new URL(request.url)
    const fileId = url.searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ error: "ID файла обязателен" }, { status: 400 })
    }

    // Получаем информацию о файле
    const { data: fileRecord, error: fetchError } = await supabase
      .from("course_files")
      .select("*, courses!inner(author_id)")
      .eq("id", fileId)
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }

    // Проверяем права доступа
    const isAuthor = fileRecord.courses.author_id === user.id
    const isUploader = fileRecord.uploaded_by === user.id

    let isCollaborator = false
    if (!isAuthor && !isUploader) {
      const { data: collaborator } = await supabase
        .from("course_collaborators")
        .select("id")
        .eq("course_id", fileRecord.course_id)
        .eq("collaborator_user_id", user.id)
        .maybeSingle()

      isCollaborator = !!collaborator
    }

    if (!isAuthor && !isUploader && !isCollaborator) {
      return NextResponse.json({ error: "Нет доступа к этому файлу" }, { status: 403 })
    }

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage.from("course-files").remove([fileRecord.storage_path])

    if (storageError) {
      console.error("Storage delete error:", storageError)
      // Продолжаем удаление из БД даже если Storage удаление не удалось
    }

    // Удаляем запись из БД
    const { error: dbError } = await supabase.from("course_files").delete().eq("id", fileId)

    if (dbError) {
      console.error("Database delete error:", dbError)
      return NextResponse.json({ error: "Ошибка удаления метаданных файла" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Файл успешно удален",
    })
  } catch (error) {
    console.error("Delete API error:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
