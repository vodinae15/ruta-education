-- ============================================
-- МИГРАЦИЯ: ДОБАВЛЕНИЕ МЕТА-БЛОКОВ В АДАПТАЦИИ
-- ============================================
-- Добавляет колонки how_to_work, navigation, conclusion
-- для хранения мета-блоков из "Финальной настройки"
-- ============================================

-- Добавляем колонку how_to_work (Как работать с уроком)
ALTER TABLE public.lesson_adaptations
ADD COLUMN IF NOT EXISTS how_to_work JSONB DEFAULT NULL;

-- Добавляем колонку navigation (Навигация по уроку)
ALTER TABLE public.lesson_adaptations
ADD COLUMN IF NOT EXISTS navigation JSONB DEFAULT NULL;

-- Добавляем колонку conclusion (Интеграция и завершение)
ALTER TABLE public.lesson_adaptations
ADD COLUMN IF NOT EXISTS conclusion JSONB DEFAULT NULL;

-- Комментарии к новым колонкам
COMMENT ON COLUMN public.lesson_adaptations.how_to_work IS 'Блок "Как работать с уроком" - инструкция для ученика перед началом урока (JSONB)';
COMMENT ON COLUMN public.lesson_adaptations.navigation IS 'Блок "Навигация по уроку" - структура и переходы в уроке (JSONB)';
COMMENT ON COLUMN public.lesson_adaptations.conclusion IS 'Блок "Интеграция и завершение" - итоговый блок урока (JSONB)';

-- ============================================
-- ИНФОРМАЦИОННОЕ СООБЩЕНИЕ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'МИГРАЦИЯ: МЕТА-БЛОКИ В АДАПТАЦИЯХ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Добавлена колонка: how_to_work';
  RAISE NOTICE 'Добавлена колонка: navigation';
  RAISE NOTICE 'Добавлена колонка: conclusion';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА';
  RAISE NOTICE '========================================';
END $$;
