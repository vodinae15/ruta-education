-- ============================================
-- МИГРАЦИЯ: Исправление заголовков блоков в адаптациях
-- ============================================
-- Проблема: Адаптации имеют захардкоженные заголовки "Блок 1", "Блок 2" и т.д.
-- вместо заголовков из оригинальных блоков урока.
-- Решение: Скопировать заголовки из course_lessons.blocks в lesson_adaptations.blockN.content.title
-- ============================================

-- Функция для обновления заголовков блоков в адаптациях
CREATE OR REPLACE FUNCTION fix_adaptation_block_titles()
RETURNS TABLE (
  adaptation_id UUID,
  lesson_id UUID,
  blocks_updated INTEGER
) AS $$
DECLARE
  adaptation_record RECORD;
  lesson_record RECORD;
  block_index INTEGER;
  original_title TEXT;
  updated_count INTEGER;
  total_updated INTEGER := 0;
BEGIN
  -- Перебираем все адаптации
  FOR adaptation_record IN
    SELECT la.id, la.lesson_id, la.block1, la.block2, la.block3, la.block4, la.block5
    FROM public.lesson_adaptations la
  LOOP
    updated_count := 0;

    -- Ищем урок по lesson_id (может быть UUID или TEXT)
    SELECT cl.blocks INTO lesson_record
    FROM public.course_lessons cl
    WHERE cl.id::text = adaptation_record.lesson_id::text
    LIMIT 1;

    -- Если урок найден и у него есть блоки
    IF lesson_record IS NOT NULL AND lesson_record.blocks IS NOT NULL THEN
      -- Обновляем каждый блок (1-5)
      FOR block_index IN 1..5 LOOP
        -- Получаем заголовок из оригинального блока (индекс 0-4)
        original_title := lesson_record.blocks->(block_index - 1)->>'title';

        IF original_title IS NOT NULL AND original_title != '' THEN
          -- Обновляем соответствующий блок адаптации
          CASE block_index
            WHEN 1 THEN
              IF adaptation_record.block1 IS NOT NULL AND
                 adaptation_record.block1->'content' IS NOT NULL AND
                 (adaptation_record.block1->'content'->>'title' IS NULL OR
                  adaptation_record.block1->'content'->>'title' LIKE 'Блок %') THEN
                UPDATE public.lesson_adaptations
                SET block1 = jsonb_set(block1, '{content,title}', to_jsonb(original_title))
                WHERE id = adaptation_record.id;
                updated_count := updated_count + 1;
              END IF;
            WHEN 2 THEN
              IF adaptation_record.block2 IS NOT NULL AND
                 adaptation_record.block2->'content' IS NOT NULL AND
                 (adaptation_record.block2->'content'->>'title' IS NULL OR
                  adaptation_record.block2->'content'->>'title' LIKE 'Блок %') THEN
                UPDATE public.lesson_adaptations
                SET block2 = jsonb_set(block2, '{content,title}', to_jsonb(original_title))
                WHERE id = adaptation_record.id;
                updated_count := updated_count + 1;
              END IF;
            WHEN 3 THEN
              IF adaptation_record.block3 IS NOT NULL AND
                 adaptation_record.block3->'content' IS NOT NULL AND
                 (adaptation_record.block3->'content'->>'title' IS NULL OR
                  adaptation_record.block3->'content'->>'title' LIKE 'Блок %') THEN
                UPDATE public.lesson_adaptations
                SET block3 = jsonb_set(block3, '{content,title}', to_jsonb(original_title))
                WHERE id = adaptation_record.id;
                updated_count := updated_count + 1;
              END IF;
            WHEN 4 THEN
              IF adaptation_record.block4 IS NOT NULL AND
                 adaptation_record.block4->'content' IS NOT NULL AND
                 (adaptation_record.block4->'content'->>'title' IS NULL OR
                  adaptation_record.block4->'content'->>'title' LIKE 'Блок %') THEN
                UPDATE public.lesson_adaptations
                SET block4 = jsonb_set(block4, '{content,title}', to_jsonb(original_title))
                WHERE id = adaptation_record.id;
                updated_count := updated_count + 1;
              END IF;
            WHEN 5 THEN
              IF adaptation_record.block5 IS NOT NULL AND
                 adaptation_record.block5->'content' IS NOT NULL AND
                 (adaptation_record.block5->'content'->>'title' IS NULL OR
                  adaptation_record.block5->'content'->>'title' LIKE 'Блок %') THEN
                UPDATE public.lesson_adaptations
                SET block5 = jsonb_set(block5, '{content,title}', to_jsonb(original_title))
                WHERE id = adaptation_record.id;
                updated_count := updated_count + 1;
              END IF;
          END CASE;
        END IF;
      END LOOP;

      IF updated_count > 0 THEN
        total_updated := total_updated + 1;
        adaptation_id := adaptation_record.id;
        lesson_id := adaptation_record.lesson_id;
        blocks_updated := updated_count;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Обновлено адаптаций: %', total_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ВЫПОЛНЕНИЕ МИГРАЦИИ
-- ============================================

-- Показываем текущее состояние (до миграции)
DO $$
DECLARE
  total_adaptations INTEGER;
  adaptations_with_block_titles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_adaptations FROM public.lesson_adaptations;

  SELECT COUNT(*) INTO adaptations_with_block_titles
  FROM public.lesson_adaptations
  WHERE block1->'content'->>'title' LIKE 'Блок %'
     OR block2->'content'->>'title' LIKE 'Блок %'
     OR block3->'content'->>'title' LIKE 'Блок %'
     OR block4->'content'->>'title' LIKE 'Блок %'
     OR block5->'content'->>'title' LIKE 'Блок %';

  RAISE NOTICE '=== СОСТОЯНИЕ ДО МИГРАЦИИ ===';
  RAISE NOTICE 'Всего адаптаций: %', total_adaptations;
  RAISE NOTICE 'Адаптаций с "Блок N" в заголовках: %', adaptations_with_block_titles;
END $$;

-- Выполняем миграцию
SELECT * FROM fix_adaptation_block_titles();

-- Показываем состояние после миграции
DO $$
DECLARE
  adaptations_with_block_titles INTEGER;
BEGIN
  SELECT COUNT(*) INTO adaptations_with_block_titles
  FROM public.lesson_adaptations
  WHERE block1->'content'->>'title' LIKE 'Блок %'
     OR block2->'content'->>'title' LIKE 'Блок %'
     OR block3->'content'->>'title' LIKE 'Блок %'
     OR block4->'content'->>'title' LIKE 'Блок %'
     OR block5->'content'->>'title' LIKE 'Блок %';

  RAISE NOTICE '=== СОСТОЯНИЕ ПОСЛЕ МИГРАЦИИ ===';
  RAISE NOTICE 'Адаптаций с "Блок N" в заголовках: %', adaptations_with_block_titles;
END $$;

-- Удаляем временную функцию
DROP FUNCTION IF EXISTS fix_adaptation_block_titles();

RAISE NOTICE 'Миграция завершена успешно!';
