-- Скрипт для проверки типов блоков в курсах
-- Запустите в Supabase SQL Editor

-- 1. Проверяем типы блоков в course_lessons
SELECT
  cl.id as lesson_id,
  cl.title as lesson_title,
  c.title as course_title,
  c.created_at as course_created,
  jsonb_array_elements(cl.blocks) ->> 'type' as block_type,
  jsonb_array_elements(cl.blocks) ->> 'title' as block_title
FROM course_lessons cl
JOIN courses c ON c.id = cl.course_id
WHERE cl.blocks IS NOT NULL
  AND jsonb_array_length(cl.blocks) > 0
ORDER BY c.created_at DESC
LIMIT 50;

-- 2. Сводка по типам блоков
SELECT
  jsonb_array_elements(cl.blocks) ->> 'type' as block_type,
  COUNT(*) as count
FROM course_lessons cl
WHERE cl.blocks IS NOT NULL
  AND jsonb_array_length(cl.blocks) > 0
GROUP BY block_type
ORDER BY count DESC;

-- 3. Уроки где блоки БЕЗ типа или с неправильным типом
SELECT
  cl.id as lesson_id,
  cl.title as lesson_title,
  c.title as course_title,
  c.created_at,
  jsonb_array_elements(cl.blocks) as block_data
FROM course_lessons cl
JOIN courses c ON c.id = cl.course_id
WHERE cl.blocks IS NOT NULL
  AND jsonb_array_length(cl.blocks) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(cl.blocks) b
    WHERE b ->> 'type' IS NULL
       OR b ->> 'type' NOT IN ('introduction', 'navigation', 'main_block_1', 'main_block_2', 'main_block_3', 'intermediate_practice', 'intermediate_test', 'conclusion', 'bonus_support')
  )
ORDER BY c.created_at DESC;
