import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/migrate-introduction-blocks
 * Мигрирует первый блок каждого урока в тип "introduction"
 * для применения специальных стилей
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Migration] Starting introduction blocks migration...")

    // Получаем параметры
    const { courseId, dryRun = false, adminKey } = await request.json().catch(() => ({}))

    // Проверяем секретный ключ
    const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12)
    if (!adminKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Provide adminKey (last 12 chars of service role key)" },
        { status: 401 }
      )
    }

    // Используем service role для доступа к данным
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Загружаем уроки
    let query = supabase
      .from("course_lessons")
      .select("id, title, blocks, course_id")

    if (courseId) {
      query = query.eq("course_id", courseId)
    }

    const { data: lessons, error: lessonsError } = await query

    if (lessonsError) {
      console.error("❌ [Migration] Error loading lessons:", lessonsError)
      return NextResponse.json(
        { success: false, error: lessonsError.message },
        { status: 500 }
      )
    }

    if (!lessons || lessons.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No lessons found",
        updated: 0
      })
    }

    console.log(`📚 [Migration] Found ${lessons.length} lessons to process`)

    let totalUpdated = 0
    let skipped = 0
    const errors: any[] = []

    for (const lesson of lessons) {
      try {
        const blocks = lesson.blocks as any[]

        if (!blocks || blocks.length === 0) {
          console.log(`  ⏭️ Lesson "${lesson.title}" has no blocks, skipping`)
          skipped++
          continue
        }

        const firstBlock = blocks[0]

        // Пропускаем если уже introduction
        if (firstBlock.type === "introduction") {
          console.log(`  ✅ Lesson "${lesson.title}" already has introduction block`)
          skipped++
          continue
        }

        // Обновляем первый блок
        const updatedBlocks = [...blocks]
        updatedBlocks[0] = {
          ...firstBlock,
          type: "introduction"
        }

        if (dryRun) {
          console.log(`  🔍 [DRY RUN] Would update lesson "${lesson.title}": ${firstBlock.type || 'undefined'} → introduction`)
          totalUpdated++
          continue
        }

        const { error: updateError } = await supabase
          .from("course_lessons")
          .update({ blocks: updatedBlocks })
          .eq("id", lesson.id)

        if (updateError) {
          console.error(`  ❌ Error updating lesson "${lesson.title}":`, updateError)
          errors.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            error: updateError.message
          })
        } else {
          console.log(`  ✅ Updated: "${lesson.title}" (${firstBlock.type || 'undefined'} → introduction)`)
          totalUpdated++
        }
      } catch (lessonError) {
        console.error(`❌ [Migration] Error processing lesson ${lesson.id}:`, lessonError)
        errors.push({
          lessonId: lesson.id,
          error: String(lessonError)
        })
      }
    }

    console.log(`\n✅ [Migration] Complete! Updated ${totalUpdated} lessons, skipped ${skipped}`)
    if (errors.length > 0) {
      console.log(`⚠️ [Migration] ${errors.length} errors occurred:`, errors)
    }

    return NextResponse.json({
      success: true,
      message: dryRun ? "Dry run complete" : "Migration complete",
      updated: totalUpdated,
      skipped,
      total: lessons.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("❌ [Migration] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
