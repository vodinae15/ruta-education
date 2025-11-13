-- ============================================
-- БЫСТРОЕ СОЗДАНИЕ ФУНКЦИИ analyze_lesson_materials
-- ============================================
-- Этот скрипт создает или обновляет функцию для анализа материалов урока
-- Выполните этот скрипт в Supabase SQL Editor, если функция не работает
-- ============================================

-- Удаляем старые версии функции (если существуют)
DROP FUNCTION IF EXISTS analyze_lesson_materials(UUID);
DROP FUNCTION IF EXISTS analyze_lesson_materials(UUID, UUID);
DROP FUNCTION IF EXISTS analyze_lesson_materials(TEXT, UUID);

-- Создаем новую функцию, которая принимает TEXT lesson_id и UUID course_id
CREATE OR REPLACE FUNCTION analyze_lesson_materials(
  lesson_id_param TEXT,
  course_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  lesson_data JSONB;
  course_json_data JSONB;
  modules_data JSONB;
  blocks_data JSONB;
  has_audio BOOLEAN := FALSE;
  has_video BOOLEAN := FALSE;
  has_images BOOLEAN := FALSE;
  has_diagrams BOOLEAN := FALSE;
  has_practice BOOLEAN := FALSE;
  recommendations JSONB := '[]'::jsonb;
  block JSONB;
  element JSONB;
  element_type TEXT;
  element_content TEXT;
  lesson_found BOOLEAN := FALSE;
BEGIN
  -- Сначала пытаемся найти урок в modules.lessons (если передан course_id)
  IF course_id_param IS NOT NULL THEN
    -- Загружаем данные курса - проверяем колонку modules (основное место хранения)
    -- Пытаемся загрузить из колонки modules
    SELECT courses.modules INTO modules_data
    FROM public.courses
    WHERE courses.id = course_id_param;
    
    IF modules_data IS NOT NULL THEN
      -- Проверяем modules.lessons
      IF modules_data->'lessons' IS NOT NULL THEN
        -- Ищем урок по ID в modules.lessons
        SELECT lesson INTO lesson_data
        FROM jsonb_array_elements(modules_data->'lessons') AS lesson
        WHERE lesson->>'id' = lesson_id_param
        LIMIT 1;
        
        IF lesson_data IS NOT NULL THEN
          lesson_found := TRUE;
          blocks_data := lesson_data->'blocks';
        END IF;
      END IF;
    END IF;
    
    -- Если не нашли в modules, проверяем course_data
    IF NOT lesson_found THEN
      SELECT courses.course_data INTO course_json_data
      FROM public.courses
      WHERE courses.id = course_id_param;
      
      IF course_json_data IS NOT NULL THEN
        -- Проверяем course_data.modules.lessons
        IF course_json_data->'modules'->'lessons' IS NOT NULL THEN
          SELECT lesson INTO lesson_data
          FROM jsonb_array_elements(course_json_data->'modules'->'lessons') AS lesson
          WHERE lesson->>'id' = lesson_id_param
          LIMIT 1;
          
          IF lesson_data IS NOT NULL THEN
            lesson_found := TRUE;
            blocks_data := lesson_data->'blocks';
          END IF;
        END IF;
        
        -- Проверяем course_data.lessons (старый формат)
        IF NOT lesson_found AND course_json_data->'lessons' IS NOT NULL THEN
          SELECT lesson INTO lesson_data
          FROM jsonb_array_elements(course_json_data->'lessons') AS lesson
          WHERE lesson->>'id' = lesson_id_param
          LIMIT 1;
          
          IF lesson_data IS NOT NULL THEN
            lesson_found := TRUE;
            blocks_data := lesson_data->'blocks';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Если не нашли в JSONB, пытаемся найти в таблице course_lessons (если lesson_id является UUID)
  -- Проверяем, является ли lesson_id валидным UUID
  IF NOT lesson_found AND lesson_id_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Пытаемся загрузить из таблицы course_lessons
    SELECT blocks INTO blocks_data
    FROM public.course_lessons
    WHERE id::text = lesson_id_param
    LIMIT 1;
    
    IF blocks_data IS NOT NULL THEN
      lesson_found := TRUE;
    END IF;
  END IF;
  
  -- Если урок не найден, возвращаем пустой результат
  IF NOT lesson_found OR blocks_data IS NULL OR blocks_data = '{}'::jsonb OR blocks_data::text = 'null' THEN
    RETURN jsonb_build_object(
      'has_audio', FALSE,
      'has_video', FALSE,
      'has_images', FALSE,
      'has_diagrams', FALSE,
      'has_practice', FALSE,
      'recommendations', jsonb_build_array(
        jsonb_build_object(
          'type', 'general',
          'message', 'Урок не найден или не содержит блоков',
          'priority', 'high'
        )
      )
    );
  END IF;
  
  -- Анализируем блоки урока
  FOR block IN SELECT * FROM jsonb_array_elements(blocks_data)
  LOOP
    -- Проверяем элементы блока
    IF block->'elements' IS NOT NULL THEN
      FOR element IN SELECT * FROM jsonb_array_elements(block->'elements')
      LOOP
        element_type := element->>'type';
        element_content := COALESCE(element->>'content', '') || COALESCE(element->>'url', '') || COALESCE(element->>'text', '');
        
        IF element_type = 'audio' OR element_content ILIKE '%.mp3%' OR element_content ILIKE '%.wav%' OR element_content ILIKE '%.ogg%' THEN
          has_audio := TRUE;
        ELSIF element_type = 'video' OR element_content ILIKE '%.mp4%' OR element_content ILIKE '%.webm%' OR element_content ILIKE '%youtube%' OR element_content ILIKE '%vimeo%' THEN
          has_video := TRUE;
        ELSIF element_type = 'image' OR element_content ILIKE '%.png%' OR element_content ILIKE '%.jpg%' OR element_content ILIKE '%.jpeg%' OR element_content ILIKE '%.gif%' OR element_content ILIKE '%.svg%' THEN
          has_images := TRUE;
        ELSIF element_type = 'file' AND (
          element_content ILIKE '%.svg%' OR 
          element_content ILIKE '%.png%' OR 
          element_content ILIKE '%diagram%' OR
          element_content ILIKE '%scheme%' OR
          element_content ILIKE '%схема%' OR
          element_content ILIKE '%диаграмма%'
        ) THEN
          has_diagrams := TRUE;
          has_images := TRUE;
        END IF;
      END LOOP;
    END IF;
    
    -- Проверяем содержимое блока напрямую
    IF block->>'content' IS NOT NULL THEN
      element_content := block->>'content';
      
      IF element_content ILIKE '%схема%' OR 
         element_content ILIKE '%диаграмма%' OR 
         element_content ILIKE '%diagram%' OR
         element_content ILIKE '%scheme%' THEN
        has_diagrams := TRUE;
      END IF;
      
      IF element_content ILIKE '%задание%' OR 
         element_content ILIKE '%практика%' OR 
         element_content ILIKE '%упражнение%' OR
         element_content ILIKE '%task%' OR
         element_content ILIKE '%practice%' THEN
        has_practice := TRUE;
      END IF;
    END IF;
  END LOOP;
  
  -- Формируем рекомендации
  IF NOT has_audio THEN
    recommendations := recommendations || jsonb_build_object(
      'type', 'audio',
      'message', 'Добавьте аудио для усиления опыта аудиалов',
      'priority', 'medium'
    );
  END IF;
  
  IF NOT has_video AND NOT has_images THEN
    recommendations := recommendations || jsonb_build_object(
      'type', 'visual',
      'message', 'Добавьте схемы или изображения для визуалов',
      'priority', 'high'
    );
  ELSIF NOT has_diagrams THEN
    recommendations := recommendations || jsonb_build_object(
      'type', 'visual',
      'message', 'Добавьте схемы или диаграммы для лучшей визуализации для визуалов',
      'priority', 'medium'
    );
  END IF;
  
  IF NOT has_practice THEN
    recommendations := recommendations || jsonb_build_object(
      'type', 'practice',
      'message', 'Добавьте практические задания для кинестетиков',
      'priority', 'high'
    );
  END IF;
  
  -- Возвращаем результат анализа
  RETURN jsonb_build_object(
    'has_audio', has_audio,
    'has_video', has_video,
    'has_images', has_images,
    'has_diagrams', has_diagrams,
    'has_practice', has_practice,
    'recommendations', recommendations
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION analyze_lesson_materials(TEXT, UUID) IS 'Анализирует урок на наличие материалов для адаптации. Поддерживает как UUID из course_lessons, так и строковые ID из modules.lessons';

-- Проверяем, что функция создана
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'analyze_lesson_materials' 
    AND pronargs = 2
  ) THEN
    RAISE NOTICE '✅ Функция analyze_lesson_materials успешно создана';
  ELSE
    RAISE EXCEPTION '❌ Ошибка: функция analyze_lesson_materials не создана';
  END IF;
END $$;

