-- ============================================
-- ИСПРАВЛЕНИЕ: Поддержка строковых ID уроков из modules.lessons
-- ============================================
-- Проблема: Уроки из modules.lessons имеют строковые ID (например, "first-lesson"),
-- но таблица lesson_adaptations использует UUID и ссылается на course_lessons.
-- Решение: Изменить lesson_id на TEXT и добавить course_id для связи с курсом.
-- ============================================

-- 1. Удаляем ВСЕ существующие политики RLS, которые зависят от lesson_id
-- Сначала получаем список всех политик и удаляем их
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Удаляем все политики для lesson_adaptations
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_adaptations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_adaptations', policy_record.policyname);
  END LOOP;
  
  -- Удаляем все политики для lesson_adaptation_metadata
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_adaptation_metadata'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_adaptation_metadata', policy_record.policyname);
  END LOOP;
END $$;

-- Также удаляем политики по известным названиям (на случай, если pg_policies не работает)
DROP POLICY IF EXISTS "Authors and collaborators can view adaptations for their lessons" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can create adaptations for their lessons" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can update adaptations for their lessons" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can delete adaptations for their lessons" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Students can view published adaptations" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can view their lesson adaptations" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can insert their lesson adaptations" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can update their lesson adaptations" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Authors and collaborators can delete their lesson adaptations" ON public.lesson_adaptations;
DROP POLICY IF EXISTS "Students can view published lesson adaptations" ON public.lesson_adaptations;

DROP POLICY IF EXISTS "Authors and collaborators can view metadata for their lessons" ON public.lesson_adaptation_metadata;
DROP POLICY IF EXISTS "Authors and collaborators can create metadata for their lessons" ON public.lesson_adaptation_metadata;
DROP POLICY IF EXISTS "Authors and collaborators can update metadata for their lessons" ON public.lesson_adaptation_metadata;
DROP POLICY IF EXISTS "Authors and collaborators can delete metadata for their lessons" ON public.lesson_adaptation_metadata;
DROP POLICY IF EXISTS "Authors and collaborators can insert metadata for their lessons" ON public.lesson_adaptation_metadata;

-- 2. Удаляем уникальное ограничение и внешний ключ
ALTER TABLE public.lesson_adaptations 
  DROP CONSTRAINT IF EXISTS unique_lesson_adaptation_type;

ALTER TABLE public.lesson_adaptations 
  DROP CONSTRAINT IF EXISTS lesson_adaptations_lesson_id_fkey;

ALTER TABLE public.lesson_adaptation_metadata 
  DROP CONSTRAINT IF EXISTS lesson_adaptation_metadata_lesson_id_fkey;

-- 3. Добавляем поле course_id в lesson_adaptations (если его еще нет)
ALTER TABLE public.lesson_adaptations 
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 4. Добавляем поле course_id в lesson_adaptation_metadata (если его еще нет)
ALTER TABLE public.lesson_adaptation_metadata 
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 5. Миграция данных: если lesson_id является UUID, пытаемся найти course_id из course_lessons
-- (Это безопасно, так как если урок в course_lessons, мы можем найти его course_id)
DO $$
DECLARE
  adaptation_record RECORD;
  lesson_course_id UUID;
BEGIN
  FOR adaptation_record IN 
    SELECT id, lesson_id 
    FROM public.lesson_adaptations 
    WHERE course_id IS NULL
  LOOP
    -- Пытаемся найти course_id для этого урока из course_lessons
    SELECT course_id INTO lesson_course_id
    FROM public.course_lessons
    WHERE id::text = adaptation_record.lesson_id::text
    LIMIT 1;
    
    -- Если нашли, обновляем
    IF lesson_course_id IS NOT NULL THEN
      UPDATE public.lesson_adaptations
      SET course_id = lesson_course_id
      WHERE id = adaptation_record.id;
    END IF;
  END LOOP;
END $$;

-- Аналогично для metadata
DO $$
DECLARE
  metadata_record RECORD;
  lesson_course_id UUID;
BEGIN
  FOR metadata_record IN 
    SELECT id, lesson_id 
    FROM public.lesson_adaptation_metadata 
    WHERE course_id IS NULL
  LOOP
    -- Пытаемся найти course_id для этого урока из course_lessons
    SELECT course_id INTO lesson_course_id
    FROM public.course_lessons
    WHERE id::text = metadata_record.lesson_id::text
    LIMIT 1;
    
    -- Если нашли, обновляем
    IF lesson_course_id IS NOT NULL THEN
      UPDATE public.lesson_adaptation_metadata
      SET course_id = lesson_course_id
      WHERE id = metadata_record.id;
    END IF;
  END LOOP;
END $$;

-- 6. Изменяем тип lesson_id на TEXT (может быть UUID или строка)
-- ВАЖНО: Это нужно делать ПОСЛЕ удаления всех политик RLS
-- Если есть данные с UUID, конвертируем их в строку
ALTER TABLE public.lesson_adaptations 
  ALTER COLUMN lesson_id TYPE TEXT USING lesson_id::TEXT;

ALTER TABLE public.lesson_adaptation_metadata 
  ALTER COLUMN lesson_id TYPE TEXT USING lesson_id::TEXT;

-- 7. Создаем новый уникальный индекс с учетом course_id
CREATE UNIQUE INDEX IF NOT EXISTS unique_lesson_adaptation_type_with_course 
  ON public.lesson_adaptations (course_id, lesson_id, adaptation_type);

-- 8. Обновляем комментарии
COMMENT ON COLUMN public.lesson_adaptations.lesson_id IS 'ID урока (может быть UUID для уроков из course_lessons или строка для уроков из modules.lessons)';
COMMENT ON COLUMN public.lesson_adaptations.course_id IS 'ID курса, к которому относится урок';

COMMENT ON COLUMN public.lesson_adaptation_metadata.lesson_id IS 'ID урока (может быть UUID для уроков из course_lessons или строка для уроков из modules.lessons)';
COMMENT ON COLUMN public.lesson_adaptation_metadata.course_id IS 'ID курса, к которому относится урок';

-- 9. Обновляем RLS политики для работы с course_id вместо course_lessons
-- Политика: Авторы и соавторы могут просматривать адаптации своих уроков
CREATE POLICY "Authors and collaborators can view their lesson adaptations"
  ON public.lesson_adaptations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptations.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Студенты могут просматривать опубликованные адаптации
CREATE POLICY "Students can view published lesson adaptations"
  ON public.lesson_adaptations
  FOR SELECT
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM public.student_course_access sca
      WHERE sca.course_id = lesson_adaptations.course_id
      AND sca.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptations.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы и соавторы могут создавать адаптации своих уроков
CREATE POLICY "Authors and collaborators can insert their lesson adaptations"
  ON public.lesson_adaptations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptations.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы и соавторы могут обновлять адаптации своих уроков
CREATE POLICY "Authors and collaborators can update their lesson adaptations"
  ON public.lesson_adaptations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptations.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptations.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы и соавторы могут удалять адаптации своих уроков
CREATE POLICY "Authors and collaborators can delete their lesson adaptations"
  ON public.lesson_adaptations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptations.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- 10. Обновляем политики для lesson_adaptation_metadata
-- Политика: Авторы и соавторы могут просматривать метаданные своих уроков
CREATE POLICY "Authors and collaborators can view metadata for their lessons"
  ON public.lesson_adaptation_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptation_metadata.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы и соавторы могут создавать метаданные своих уроков
CREATE POLICY "Authors and collaborators can insert metadata for their lessons"
  ON public.lesson_adaptation_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptation_metadata.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы и соавторы могут обновлять метаданные своих уроков
CREATE POLICY "Authors and collaborators can update metadata for their lessons"
  ON public.lesson_adaptation_metadata
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptation_metadata.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptation_metadata.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы и соавторы могут удалять метаданные своих уроков
CREATE POLICY "Authors and collaborators can delete metadata for their lessons"
  ON public.lesson_adaptation_metadata
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_adaptation_metadata.course_id
      AND (
        c.author_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.course_collaborators cc
          WHERE cc.course_id = c.id
          AND cc.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- 11. Обновляем функцию analyze_lesson_materials для поддержки строковых ID
-- Сначала удаляем старую функцию
DROP FUNCTION IF EXISTS analyze_lesson_materials(UUID);
DROP FUNCTION IF EXISTS analyze_lesson_materials(UUID, UUID);

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
  
  -- Анализируем блоки урока (код остается таким же, как в оригинальной функции)
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

-- 12. Обновляем функцию create_lesson_adaptation_metadata для работы с новой схемой
-- (Эта функция должна быть обновлена в trigger, чтобы передавать course_id)
-- Пока оставляем как есть, но нужно будет обновить trigger

-- ============================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================
