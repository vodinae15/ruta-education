-- ============================================
-- Добавление статуса публикации для уроков
-- ============================================

-- Добавляем поле is_published в таблицу course_lessons
ALTER TABLE public.course_lessons
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Добавляем индекс для оптимизации запросов по статусу публикации
CREATE INDEX IF NOT EXISTS idx_course_lessons_published
ON public.course_lessons(course_id, is_published);

-- Комментарий к полю
COMMENT ON COLUMN public.course_lessons.is_published IS
'Статус публикации урока: false - черновик (не виден студентам), true - опубликован (виден студентам)';

-- Обновляем существующие уроки:
-- Если у урока опубликованы ВСЕ 4 адаптации, помечаем урок как опубликованный
UPDATE public.course_lessons cl
SET is_published = true
WHERE EXISTS (
  SELECT 1
  FROM public.lesson_adaptations la
  WHERE la.lesson_id = cl.id
  AND la.status = 'published'
  GROUP BY la.lesson_id
  HAVING COUNT(DISTINCT la.adaptation_type) = 4
);

-- Логируем результаты
DO $$
DECLARE
  total_lessons INTEGER;
  published_lessons INTEGER;
  draft_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons FROM public.course_lessons;
  SELECT COUNT(*) INTO published_lessons FROM public.course_lessons WHERE is_published = true;
  SELECT COUNT(*) INTO draft_lessons FROM public.course_lessons WHERE is_published = false;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total lessons: %', total_lessons;
  RAISE NOTICE 'Published lessons: %', published_lessons;
  RAISE NOTICE 'Draft lessons: %', draft_lessons;
  RAISE NOTICE '============================================';
END $$;
