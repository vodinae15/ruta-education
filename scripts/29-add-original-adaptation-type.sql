-- ============================================
-- МИГРАЦИЯ: Добавление типа адаптации 'original'
-- ============================================
-- Проблема: Таблица lesson_adaptations не поддерживает тип 'original' для оригинальной версии контента
-- Решение: Обновить CHECK constraint для adaptation_type, добавив 'original'
-- ============================================
-- Дата создания: 2024
-- Описание: Добавляет поддержку типа адаптации 'original' для хранения отформатированного оригинального контента автора
-- ============================================

-- 1. Удаляем старый CHECK constraint для adaptation_type
ALTER TABLE public.lesson_adaptations 
  DROP CONSTRAINT IF EXISTS lesson_adaptations_adaptation_type_check;

-- 2. Добавляем новый CHECK constraint с поддержкой 'original'
ALTER TABLE public.lesson_adaptations 
  ADD CONSTRAINT lesson_adaptations_adaptation_type_check 
  CHECK (adaptation_type IN ('visual', 'auditory', 'kinesthetic', 'original'));

-- 3. Обновляем комментарий к колонке adaptation_type
COMMENT ON COLUMN public.lesson_adaptations.adaptation_type IS 'Тип адаптации: visual, auditory, kinesthetic, original (оригинальная версия, отформатированная для удобного чтения)';

-- 4. Проверяем, что constraint применен корректно
DO $$
BEGIN
  -- Проверяем, что constraint существует
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'lesson_adaptations_adaptation_type_check'
    AND conrelid = 'public.lesson_adaptations'::regclass
  ) THEN
    RAISE EXCEPTION 'CHECK constraint не был создан';
  END IF;
  
  RAISE NOTICE '✅ CHECK constraint для adaptation_type успешно обновлен';
  RAISE NOTICE '✅ Теперь поддерживаются типы: visual, auditory, kinesthetic, original';
END $$;

-- 5. Обновляем функцию валидации данных (если она существует)
-- Создаем или заменяем функцию validate_adaptation_data
CREATE OR REPLACE FUNCTION public.validate_adaptation_data(adaptation_type_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN adaptation_type_param IN ('visual', 'auditory', 'kinesthetic', 'original');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Обновляем комментарий к таблице (если нужно)
COMMENT ON TABLE public.lesson_adaptations IS 'Таблица для хранения адаптированного контента уроков под разные типы восприятия (visual, auditory, kinesthetic) и оригинальной версии (original)';

-- 7. Проверяем существующие данные (не должно быть конфликтов, так как 'original' - новый тип)
DO $$
DECLARE
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM public.lesson_adaptations
  WHERE adaptation_type = 'original';
  
  IF existing_count > 0 THEN
    RAISE NOTICE 'ℹ️ Найдено % существующих записей с типом original', existing_count;
  ELSE
    RAISE NOTICE 'ℹ️ Записей с типом original пока нет (это нормально)';
  END IF;
END $$;

-- 8. Создаем индекс для быстрого поиска по типу адаптации (если его еще нет)
CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_type_original 
  ON public.lesson_adaptations(adaptation_type) 
  WHERE adaptation_type = 'original';

-- 9. Обновляем RLS политики (если они проверяют adaptation_type)
-- Проверяем, нужно ли обновлять политики
-- Примечание: RLS политики для lesson_adaptations используют course_id для проверки доступа,
-- а не adaptation_type, поэтому обновление политик не требуется
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'lesson_adaptations';
  
  IF policy_count > 0 THEN
    RAISE NOTICE 'ℹ️ Найдено % RLS политик для lesson_adaptations. Политики используют course_id для проверки доступа, обновление не требуется.', policy_count;
  ELSE
    RAISE NOTICE 'ℹ️ RLS политики для lesson_adaptations не найдены';
  END IF;
END $$;

-- ============================================
-- ПРОВЕРКА МИГРАЦИИ
-- ============================================
-- Выполните следующие запросы для проверки:

-- 1. Проверить constraint:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.lesson_adaptations'::regclass 
-- AND conname = 'lesson_adaptations_adaptation_type_check';

-- 2. Попробовать вставить тестовую запись (должна работать):
-- INSERT INTO public.lesson_adaptations (lesson_id, adaptation_type, course_id, block1, block2, block3, block4, block5)
-- VALUES ('test-lesson-id', 'original', 'test-course-id', '{}', '{}', '{}', '{}', '{}')
-- ON CONFLICT DO NOTHING;

-- 3. Проверить все поддерживаемые типы:
-- SELECT DISTINCT adaptation_type 
-- FROM public.lesson_adaptations 
-- ORDER BY adaptation_type;

-- ============================================
-- МИГРАЦИЯ ЗАВЕРШЕНА
-- ============================================
-- Теперь таблица lesson_adaptations поддерживает тип 'original'
-- для хранения отформатированного оригинального контента автора
-- ============================================

