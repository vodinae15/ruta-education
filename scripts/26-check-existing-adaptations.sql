-- ============================================
-- СКРИПТ ДЛЯ ПРОВЕРКИ СУЩЕСТВУЮЩИХ АДАПТАЦИЙ
-- ============================================
-- Этот скрипт проверяет наличие адаптаций для уроков
-- и показывает статистику по адаптациям
-- ============================================

-- ============================================
-- 1. ПРОВЕРКА СУЩЕСТВУЮЩИХ АДАПТАЦИЙ
-- ============================================

-- Функция для получения статистики по адаптациям
CREATE OR REPLACE FUNCTION get_adaptations_statistics()
RETURNS TABLE (
  total_lessons INTEGER,
  lessons_with_adaptations INTEGER,
  lessons_without_adaptations INTEGER,
  total_adaptations INTEGER,
  visual_adaptations INTEGER,
  auditory_adaptations INTEGER,
  kinesthetic_adaptations INTEGER,
  original_adaptations INTEGER,
  published_adaptations INTEGER,
  pending_adaptations INTEGER,
  generated_adaptations INTEGER,
  edited_adaptations INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.course_lessons)::INTEGER as total_lessons,
    (SELECT COUNT(DISTINCT lesson_id) FROM public.lesson_adaptations)::INTEGER as lessons_with_adaptations,
    (
      SELECT COUNT(*) 
      FROM public.course_lessons cl
      WHERE NOT EXISTS (
        SELECT 1 FROM public.lesson_adaptations la
        WHERE la.lesson_id = cl.id
      )
    )::INTEGER as lessons_without_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations)::INTEGER as total_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE adaptation_type = 'visual')::INTEGER as visual_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE adaptation_type = 'auditory')::INTEGER as auditory_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE adaptation_type = 'kinesthetic')::INTEGER as kinesthetic_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE adaptation_type = 'original')::INTEGER as original_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE status = 'published')::INTEGER as published_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE status = 'pending')::INTEGER as pending_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE status = 'generated')::INTEGER as generated_adaptations,
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE status = 'edited')::INTEGER as edited_adaptations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION get_adaptations_statistics() IS 'Возвращает статистику по адаптациям уроков';

-- ============================================
-- 2. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ УРОКОВ БЕЗ АДАПТАЦИЙ
-- ============================================

-- Функция для получения списка уроков без адаптаций
CREATE OR REPLACE FUNCTION get_lessons_without_adaptations(
  course_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  lesson_id UUID,
  lesson_title TEXT,
  course_id UUID,
  course_title TEXT,
  author_id UUID,
  blocks_count INTEGER,
  has_elements BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id as lesson_id,
    cl.title as lesson_title,
    cl.course_id,
    c.title as course_title,
    c.author_id,
    (
      SELECT COUNT(*) 
      FROM jsonb_array_elements(cl.blocks)
    )::INTEGER as blocks_count,
    (
      SELECT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(cl.blocks) as block
        WHERE block->'elements' IS NOT NULL
        AND jsonb_array_length(block->'elements') > 0
      )
    ) as has_elements
  FROM public.course_lessons cl
  JOIN public.courses c ON c.id = cl.course_id
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.lesson_adaptations la
    WHERE la.lesson_id = cl.id
    AND la.status IN ('generated', 'edited', 'published')
  )
  AND (course_id_param IS NULL OR cl.course_id = course_id_param)
  ORDER BY c.title, cl.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION get_lessons_without_adaptations(UUID) IS 'Возвращает список уроков без адаптаций';

-- ============================================
-- 3. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ УРОКОВ С НЕПОЛНЫМИ АДАПТАЦИЯМИ
-- ============================================

-- Функция для получения уроков с неполными адаптациями (не все типы)
CREATE OR REPLACE FUNCTION get_lessons_with_incomplete_adaptations(
  course_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  lesson_id UUID,
  lesson_title TEXT,
  course_id UUID,
  course_title TEXT,
  existing_types TEXT[],
  missing_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id as lesson_id,
    cl.title as lesson_title,
    cl.course_id,
    c.title as course_title,
    ARRAY_AGG(la.adaptation_type) FILTER (WHERE la.adaptation_type IS NOT NULL) as existing_types,
    ARRAY['visual', 'auditory', 'kinesthetic', 'original']::TEXT[] - ARRAY_AGG(la.adaptation_type) FILTER (WHERE la.adaptation_type IS NOT NULL) as missing_types
  FROM public.course_lessons cl
  JOIN public.courses c ON c.id = cl.course_id
  LEFT JOIN public.lesson_adaptations la ON la.lesson_id = cl.id
  WHERE (course_id_param IS NULL OR cl.course_id = course_id_param)
  GROUP BY cl.id, cl.title, cl.course_id, c.title
  HAVING COUNT(la.id) < 3
  ORDER BY c.title, cl.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION get_lessons_with_incomplete_adaptations(UUID) IS 'Возвращает уроки с неполными адаптациями (не все типы)';

-- ============================================
-- 4. ФУНКЦИЯ ДЛЯ ВАЛИДАЦИИ АДАПТАЦИЙ
-- ============================================

-- Функция для валидации структуры адаптации
CREATE OR REPLACE FUNCTION validate_adaptation_structure(
  adaptation_id_param UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  errors TEXT[]
) AS $$
DECLARE
  validation_errors TEXT[] := '{}';
  adaptation_record RECORD;
  block_keys TEXT[] := ARRAY['block1', 'block2', 'block3', 'block4', 'block5'];
  block_key TEXT;
  block_data JSONB;
BEGIN
  -- Получаем адаптацию
  SELECT * INTO adaptation_record
  FROM public.lesson_adaptations
  WHERE id = adaptation_id_param;
  
  -- Если адаптация не найдена
  IF adaptation_record IS NULL THEN
    RETURN QUERY SELECT FALSE, ARRAY['Адаптация не найдена']::TEXT[];
    RETURN;
  END IF;
  
  -- Проверяем наличие всех блоков
  FOREACH block_key IN ARRAY block_keys
  LOOP
    block_data := adaptation_record.block1;
    IF block_key = 'block2' THEN block_data := adaptation_record.block2; END IF;
    IF block_key = 'block3' THEN block_data := adaptation_record.block3; END IF;
    IF block_key = 'block4' THEN block_data := adaptation_record.block4; END IF;
    IF block_key = 'block5' THEN block_data := adaptation_record.block5; END IF;
    
    -- Проверяем наличие блока
    IF block_data IS NULL OR block_data = '{}'::jsonb THEN
      validation_errors := validation_errors || format('%s: блок отсутствует', block_key);
      CONTINUE;
    END IF;
    
    -- Проверяем наличие подводки (intro)
    IF block_data->'intro' IS NULL THEN
      validation_errors := validation_errors || format('%s: отсутствует подводка (intro)', block_key);
    ELSIF block_data->'intro'->>'text' IS NULL OR block_data->'intro'->>'text' = '' THEN
      validation_errors := validation_errors || format('%s: подводка (intro.text) пуста', block_key);
    END IF;
    
    -- Проверяем наличие контента (content)
    IF block_data->'content' IS NULL THEN
      validation_errors := validation_errors || format('%s: отсутствует контент (content)', block_key);
    ELSIF block_data->'content'->>'text' IS NULL OR block_data->'content'->>'text' = '' THEN
      validation_errors := validation_errors || format('%s: текст контента (content.text) пуст', block_key);
    ELSIF length(block_data->'content'->>'text') < 50 THEN
      validation_errors := validation_errors || format('%s: текст контента (content.text) слишком короткий (минимум 50 символов)', block_key);
    END IF;
    
    -- Проверяем наличие адаптации (adaptation)
    IF block_data->'adaptation' IS NULL THEN
      validation_errors := validation_errors || format('%s: отсутствует адаптация (adaptation)', block_key);
    ELSIF block_data->'adaptation'->'element' IS NULL THEN
      validation_errors := validation_errors || format('%s: отсутствует элемент адаптации (adaptation.element)', block_key);
    END IF;
  END LOOP;
  
  -- Возвращаем результат
  IF array_length(validation_errors, 1) IS NULL THEN
    RETURN QUERY SELECT TRUE, ARRAY[]::TEXT[];
  ELSE
    RETURN QUERY SELECT FALSE, validation_errors;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION validate_adaptation_structure(UUID) IS 'Валидирует структуру адаптации урока';

-- ============================================
-- 5. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ АДАПТАЦИЙ С ОШИБКАМИ
-- ============================================

-- Функция для получения адаптаций с ошибками валидации
CREATE OR REPLACE FUNCTION get_adaptations_with_errors()
RETURNS TABLE (
  adaptation_id UUID,
  lesson_id UUID,
  lesson_title TEXT,
  course_id UUID,
  course_title TEXT,
  adaptation_type TEXT,
  status TEXT,
  errors TEXT[]
) AS $$
DECLARE
  adaptation_record RECORD;
  validation_result RECORD;
BEGIN
  FOR adaptation_record IN 
    SELECT la.*, cl.title as lesson_title, cl.course_id, c.title as course_title
    FROM public.lesson_adaptations la
    JOIN public.course_lessons cl ON cl.id = la.lesson_id
    JOIN public.courses c ON c.id = cl.course_id
    WHERE la.status IN ('generated', 'edited', 'published')
  LOOP
    -- Валидируем адаптацию
    SELECT * INTO validation_result
    FROM validate_adaptation_structure(adaptation_record.id);
    
    -- Если есть ошибки, добавляем в результат
    IF NOT validation_result.is_valid THEN
      RETURN QUERY SELECT 
        adaptation_record.id,
        adaptation_record.lesson_id,
        adaptation_record.lesson_title,
        adaptation_record.course_id,
        adaptation_record.course_title,
        adaptation_record.adaptation_type,
        adaptation_record.status,
        validation_result.errors;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION get_adaptations_with_errors() IS 'Возвращает адаптации с ошибками валидации';

-- ============================================
-- 6. ИНФОРМАЦИОННЫЕ СООБЩЕНИЯ
-- ============================================

DO $$
DECLARE
  stats RECORD;
BEGIN
  -- Получаем статистику
  SELECT * INTO stats FROM get_adaptations_statistics();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'СТАТИСТИКА ПО АДАПТАЦИЯМ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Всего уроков: %', stats.total_lessons;
  RAISE NOTICE 'Уроков с адаптациями: %', stats.lessons_with_adaptations;
  RAISE NOTICE 'Уроков без адаптаций: %', stats.lessons_without_adaptations;
  RAISE NOTICE 'Всего адаптаций: %', stats.total_adaptations;
  RAISE NOTICE 'Визуальных адаптаций: %', stats.visual_adaptations;
  RAISE NOTICE 'Аудиальных адаптаций: %', stats.auditory_adaptations;
  RAISE NOTICE 'Кинестетических адаптаций: %', stats.kinesthetic_adaptations;
  RAISE NOTICE 'Оригинальных адаптаций: %', stats.original_adaptations;
  RAISE NOTICE 'Опубликованных адаптаций: %', stats.published_adaptations;
  RAISE NOTICE 'Ожидающих адаптаций: %', stats.pending_adaptations;
  RAISE NOTICE 'Сгенерированных адаптаций: %', stats.generated_adaptations;
  RAISE NOTICE 'Отредактированных адаптаций: %', stats.edited_adaptations;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ГОТОВО
-- ============================================
-- Функции для проверки существующих адаптаций созданы
-- Используйте эти функции для проверки состояния миграции
-- ============================================

