-- ============================================
-- СКРИПТ ДЛЯ ВАЛИДАЦИИ МИГРИРОВАННЫХ ДАННЫХ
-- ============================================
-- Этот скрипт валидирует мигрированные данные адаптаций
-- и создает отчет о состоянии данных
-- ============================================

-- ============================================
-- 1. ФУНКЦИЯ ДЛЯ ВАЛИДАЦИИ ВСЕХ АДАПТАЦИЙ
-- ============================================

-- Функция для валидации всех адаптаций и создания отчета
CREATE OR REPLACE FUNCTION validate_all_adaptations()
RETURNS TABLE (
  lesson_id UUID,
  lesson_title TEXT,
  course_id UUID,
  course_title TEXT,
  adaptation_type TEXT,
  status TEXT,
  is_valid BOOLEAN,
  errors TEXT[],
  block1_valid BOOLEAN,
  block2_valid BOOLEAN,
  block3_valid BOOLEAN,
  block4_valid BOOLEAN,
  block5_valid BOOLEAN
) AS $$
DECLARE
  adaptation_record RECORD;
  block_keys TEXT[] := ARRAY['block1', 'block2', 'block3', 'block4', 'block5'];
  block_key TEXT;
  block_data JSONB;
  block_valid BOOLEAN;
  validation_errors TEXT[];
  overall_valid BOOLEAN;
  block1_valid_flag BOOLEAN := TRUE;
  block2_valid_flag BOOLEAN := TRUE;
  block3_valid_flag BOOLEAN := TRUE;
  block4_valid_flag BOOLEAN := TRUE;
  block5_valid_flag BOOLEAN := TRUE;
BEGIN
  FOR adaptation_record IN 
    SELECT la.*, cl.title as lesson_title, cl.course_id, c.title as course_title
    FROM public.lesson_adaptations la
    JOIN public.course_lessons cl ON cl.id = la.lesson_id
    JOIN public.courses c ON c.id = cl.course_id
    WHERE la.status IN ('generated', 'edited', 'published')
    ORDER BY c.title, cl.order_index, la.adaptation_type
  LOOP
    validation_errors := '{}';
    overall_valid := TRUE;
    block1_valid_flag := TRUE;
    block2_valid_flag := TRUE;
    block3_valid_flag := TRUE;
    block4_valid_flag := TRUE;
    block5_valid_flag := TRUE;
    
    -- Проверяем каждый блок
    FOREACH block_key IN ARRAY block_keys
    LOOP
      block_data := CASE block_key
        WHEN 'block1' THEN adaptation_record.block1
        WHEN 'block2' THEN adaptation_record.block2
        WHEN 'block3' THEN adaptation_record.block3
        WHEN 'block4' THEN adaptation_record.block4
        WHEN 'block5' THEN adaptation_record.block5
      END;
      
      block_valid := TRUE;
      
      -- Проверяем наличие блока
      IF block_data IS NULL OR block_data = '{}'::jsonb THEN
        validation_errors := validation_errors || format('%s: блок отсутствует', block_key);
        block_valid := FALSE;
        overall_valid := FALSE;
        
        -- Устанавливаем флаг для соответствующего блока
        IF block_key = 'block1' THEN block1_valid_flag := FALSE; END IF;
        IF block_key = 'block2' THEN block2_valid_flag := FALSE; END IF;
        IF block_key = 'block3' THEN block3_valid_flag := FALSE; END IF;
        IF block_key = 'block4' THEN block4_valid_flag := FALSE; END IF;
        IF block_key = 'block5' THEN block5_valid_flag := FALSE; END IF;
        
        CONTINUE;
      END IF;
      
      -- Проверяем наличие подводки (intro)
      IF block_data->'intro' IS NULL THEN
        validation_errors := validation_errors || format('%s: отсутствует подводка (intro)', block_key);
        block_valid := FALSE;
        overall_valid := FALSE;
      ELSIF block_data->'intro'->>'text' IS NULL OR block_data->'intro'->>'text' = '' THEN
        validation_errors := validation_errors || format('%s: подводка (intro.text) пуста', block_key);
        block_valid := FALSE;
        overall_valid := FALSE;
      ELSIF length(block_data->'intro'->>'text') < 10 THEN
        validation_errors := validation_errors || format('%s: подводка (intro.text) слишком короткая (минимум 10 символов)', block_key);
        block_valid := FALSE;
        overall_valid := FALSE;
      END IF;
      
      -- Проверяем наличие контента (content)
      IF block_data->'content' IS NULL THEN
        validation_errors := validation_errors || format('%s: отсутствует контент (content)', block_key);
        block_valid := FALSE;
        overall_valid := FALSE;
      ELSE
        IF block_data->'content'->>'title' IS NULL OR block_data->'content'->>'title' = '' THEN
          validation_errors := validation_errors || format('%s: заголовок контента (content.title) пуст', block_key);
          block_valid := FALSE;
          overall_valid := FALSE;
        END IF;
        
        IF block_data->'content'->>'text' IS NULL OR block_data->'content'->>'text' = '' THEN
          validation_errors := validation_errors || format('%s: текст контента (content.text) пуст', block_key);
          block_valid := FALSE;
          overall_valid := FALSE;
        ELSIF length(block_data->'content'->>'text') < 50 THEN
          validation_errors := validation_errors || format('%s: текст контента (content.text) слишком короткий (минимум 50 символов)', block_key);
          block_valid := FALSE;
          overall_valid := FALSE;
        END IF;
        
        IF block_data->'content'->>'type' IS NULL OR block_data->'content'->>'type' != 'text' THEN
          validation_errors := validation_errors || format('%s: тип контента (content.type) должен быть "text"', block_key);
          block_valid := FALSE;
          overall_valid := FALSE;
        END IF;
      END IF;
      
      -- Проверяем наличие адаптации (adaptation)
      IF block_data->'adaptation' IS NULL THEN
        validation_errors := validation_errors || format('%s: отсутствует адаптация (adaptation)', block_key);
        block_valid := FALSE;
        overall_valid := FALSE;
      ELSE
        IF block_data->'adaptation'->>'type' IS NULL OR 
           block_data->'adaptation'->>'type' NOT IN ('visual', 'auditory', 'kinesthetic', 'original') THEN
          validation_errors := validation_errors || format('%s: тип адаптации (adaptation.type) неверный', block_key);
          block_valid := FALSE;
          overall_valid := FALSE;
        END IF;
        
        IF block_data->'adaptation'->'element' IS NULL THEN
          validation_errors := validation_errors || format('%s: отсутствует элемент адаптации (adaptation.element)', block_key);
          block_valid := FALSE;
          overall_valid := FALSE;
        ELSE
          IF block_data->'adaptation'->'element'->>'type' IS NULL OR 
             block_data->'adaptation'->'element'->>'type' = '' THEN
            validation_errors := validation_errors || format('%s: тип элемента адаптации (adaptation.element.type) пуст', block_key);
            block_valid := FALSE;
            overall_valid := FALSE;
          END IF;
          
          IF block_data->'adaptation'->'element'->>'data' IS NULL THEN
            validation_errors := validation_errors || format('%s: данные элемента адаптации (adaptation.element.data) отсутствуют', block_key);
            block_valid := FALSE;
            overall_valid := FALSE;
          END IF;
          
          IF block_data->'adaptation'->'element'->>'description' IS NULL OR 
             block_data->'adaptation'->'element'->>'description' = '' THEN
            validation_errors := validation_errors || format('%s: описание элемента адаптации (adaptation.element.description) пусто', block_key);
            block_valid := FALSE;
            overall_valid := FALSE;
          END IF;
        END IF;
      END IF;
      
      -- Устанавливаем флаг для соответствующего блока
      IF block_key = 'block1' THEN block1_valid_flag := block_valid; END IF;
      IF block_key = 'block2' THEN block2_valid_flag := block_valid; END IF;
      IF block_key = 'block3' THEN block3_valid_flag := block_valid; END IF;
      IF block_key = 'block4' THEN block4_valid_flag := block_valid; END IF;
      IF block_key = 'block5' THEN block5_valid_flag := block_valid; END IF;
    END LOOP;
    
    -- Возвращаем результат
    RETURN QUERY SELECT 
      adaptation_record.lesson_id,
      adaptation_record.lesson_title,
      adaptation_record.course_id,
      adaptation_record.course_title,
      adaptation_record.adaptation_type,
      adaptation_record.status,
      overall_valid,
      CASE WHEN array_length(validation_errors, 1) IS NULL THEN ARRAY[]::TEXT[] ELSE validation_errors END,
      block1_valid_flag,
      block2_valid_flag,
      block3_valid_flag,
      block4_valid_flag,
      block5_valid_flag;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION validate_all_adaptations() IS 'Валидирует все адаптации и создает отчет о состоянии данных';

-- ============================================
-- 2. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ СТАТИСТИКИ ВАЛИДАЦИИ
-- ============================================

-- Функция для получения статистики валидации
CREATE OR REPLACE FUNCTION get_validation_statistics()
RETURNS TABLE (
  total_adaptations INTEGER,
  valid_adaptations INTEGER,
  invalid_adaptations INTEGER,
  adaptations_with_errors INTEGER,
  block1_errors INTEGER,
  block2_errors INTEGER,
  block3_errors INTEGER,
  block4_errors INTEGER,
  block5_errors INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.lesson_adaptations WHERE status IN ('generated', 'edited', 'published'))::INTEGER as total_adaptations,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE is_valid = TRUE)::INTEGER as valid_adaptations,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE is_valid = FALSE)::INTEGER as invalid_adaptations,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE array_length(errors, 1) > 0)::INTEGER as adaptations_with_errors,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE block1_valid = FALSE)::INTEGER as block1_errors,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE block2_valid = FALSE)::INTEGER as block2_errors,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE block3_valid = FALSE)::INTEGER as block3_errors,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE block4_valid = FALSE)::INTEGER as block4_errors,
    (SELECT COUNT(*) FROM validate_all_adaptations() WHERE block5_valid = FALSE)::INTEGER as block5_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION get_validation_statistics() IS 'Возвращает статистику валидации адаптаций';

-- ============================================
-- 3. ФУНКЦИЯ ДЛЯ ИСПРАВЛЕНИЯ ОШИБОК В АДАПТАЦИЯХ
-- ============================================

-- Функция для исправления ошибок в адаптациях (устанавливает статус 'pending' для невалидных адаптаций)
CREATE OR REPLACE FUNCTION fix_invalid_adaptations()
RETURNS TABLE (
  adaptation_id UUID,
  lesson_id UUID,
  lesson_title TEXT,
  adaptation_type TEXT,
  errors_found TEXT[],
  status_changed BOOLEAN
) AS $$
DECLARE
  adaptation_record RECORD;
  validation_result RECORD;
BEGIN
  FOR adaptation_record IN 
    SELECT la.*, cl.title as lesson_title
    FROM public.lesson_adaptations la
    JOIN public.course_lessons cl ON cl.id = la.lesson_id
    WHERE la.status IN ('generated', 'edited', 'published')
  LOOP
    -- Валидируем адаптацию
    SELECT * INTO validation_result
    FROM validate_adaptation_structure(adaptation_record.id);
    
    -- Если есть ошибки, меняем статус на 'pending'
    IF NOT validation_result.is_valid THEN
      UPDATE public.lesson_adaptations
      SET status = 'pending',
          updated_at = NOW()
      WHERE id = adaptation_record.id;
      
      RETURN QUERY SELECT 
        adaptation_record.id,
        adaptation_record.lesson_id,
        adaptation_record.lesson_title,
        adaptation_record.adaptation_type,
        validation_result.errors,
        TRUE;
    ELSE
      RETURN QUERY SELECT 
        adaptation_record.id,
        adaptation_record.lesson_id,
        adaptation_record.lesson_title,
        adaptation_record.adaptation_type,
        ARRAY[]::TEXT[],
        FALSE;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION fix_invalid_adaptations() IS 'Исправляет ошибки в адаптациях, устанавливая статус "pending" для невалидных адаптаций';

-- ============================================
-- 4. ИНФОРМАЦИОННЫЕ СООБЩЕНИЯ
-- ============================================

DO $$
DECLARE
  stats RECORD;
BEGIN
  -- Получаем статистику валидации
  SELECT * INTO stats FROM get_validation_statistics();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'СТАТИСТИКА ВАЛИДАЦИИ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Всего адаптаций: %', stats.total_adaptations;
  RAISE NOTICE 'Валидных адаптаций: %', stats.valid_adaptations;
  RAISE NOTICE 'Невалидных адаптаций: %', stats.invalid_adaptations;
  RAISE NOTICE 'Адаптаций с ошибками: %', stats.adaptations_with_errors;
  RAISE NOTICE 'Ошибок в блоке 1: %', stats.block1_errors;
  RAISE NOTICE 'Ошибок в блоке 2: %', stats.block2_errors;
  RAISE NOTICE 'Ошибок в блоке 3: %', stats.block3_errors;
  RAISE NOTICE 'Ошибок в блоке 4: %', stats.block4_errors;
  RAISE NOTICE 'Ошибок в блоке 5: %', stats.block5_errors;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ГОТОВО
-- ============================================
-- Функции для валидации мигрированных данных созданы
-- Используйте эти функции для проверки состояния данных
-- ============================================

