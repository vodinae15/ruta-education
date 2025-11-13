-- ============================================
-- МИГРАЦИЯ: СИСТЕМА АДАПТАЦИИ УРОКОВ ПОД ТИПЫ ВОСПРИЯТИЯ
-- ============================================
-- Этот скрипт создает систему адаптации уроков для разных типов восприятия
-- Адаптированный контент сохраняется в БД и является единым для всех студентов одного типа
-- ============================================

-- ============================================
-- 1. ПРОВЕРКА И СОЗДАНИЕ ФУНКЦИИ update_updated_at_column
-- ============================================

-- Создаем функцию для автоматического обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ lesson_adaptations
-- ============================================

-- Создаем таблицу для хранения адаптированного контента уроков
CREATE TABLE IF NOT EXISTS public.lesson_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN ('visual', 'auditory', 'kinesthetic')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'edited', 'published')),
  
  -- Структура из 5 блоков с трехслойной структурой (подводка + улучшенный текст + адаптированный элемент)
  block1 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block2 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block3 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block4 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block5 JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Метаданные
  generated_at TIMESTAMP WITH TIME ZONE,
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Один урок может иметь только одну адаптацию каждого типа
  CONSTRAINT unique_lesson_adaptation_type UNIQUE (lesson_id, adaptation_type)
);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.lesson_adaptations IS 'Таблица для хранения адаптированного контента уроков под разные типы восприятия';
COMMENT ON COLUMN public.lesson_adaptations.lesson_id IS 'ID урока из таблицы course_lessons';
COMMENT ON COLUMN public.lesson_adaptations.adaptation_type IS 'Тип адаптации: visual, auditory, kinesthetic';
COMMENT ON COLUMN public.lesson_adaptations.status IS 'Статус адаптации: pending, generated, edited, published';
COMMENT ON COLUMN public.lesson_adaptations.block1 IS 'Блок 1: Обзор темы (JSONB с трехслойной структурой)';
COMMENT ON COLUMN public.lesson_adaptations.block2 IS 'Блок 2: Основы темы (JSONB с трехслойной структурой)';
COMMENT ON COLUMN public.lesson_adaptations.block3 IS 'Блок 3: Практическое закрепление (JSONB с трехслойной структурой)';
COMMENT ON COLUMN public.lesson_adaptations.block4 IS 'Блок 4: Углублённое изучение (JSONB с трехслойной структурой)';
COMMENT ON COLUMN public.lesson_adaptations.block5 IS 'Блок 5: Итоговое задание (JSONB с трехслойной структурой)';
COMMENT ON COLUMN public.lesson_adaptations.generated_at IS 'Дата и время генерации адаптации';
COMMENT ON COLUMN public.lesson_adaptations.edited_at IS 'Дата и время последнего редактирования';
COMMENT ON COLUMN public.lesson_adaptations.edited_by IS 'ID пользователя, который последний раз редактировал адаптацию';
COMMENT ON COLUMN public.lesson_adaptations.version IS 'Версия адаптации (увеличивается при каждом редактировании)';

-- ============================================
-- 3. СОЗДАНИЕ ТАБЛИЦЫ lesson_adaptation_metadata
-- ============================================

-- Создаем таблицу для хранения метаданных о процессе адаптации
CREATE TABLE IF NOT EXISTS public.lesson_adaptation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN ('visual', 'auditory', 'kinesthetic')),
  
  -- Информация о наличии материалов в оригинальном уроке
  has_audio BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT FALSE,
  has_images BOOLEAN DEFAULT FALSE,
  has_diagrams BOOLEAN DEFAULT FALSE,
  has_practice BOOLEAN DEFAULT FALSE,
  
  -- Рекомендации для автора по улучшению контента
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Статус генерации адаптации через ИИ
  ai_generation_status TEXT DEFAULT 'pending' CHECK (ai_generation_status IN ('pending', 'processing', 'completed', 'error')),
  ai_generation_error TEXT,
  ai_generation_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Один урок может иметь только одну метаинформацию для каждого типа адаптации
  CONSTRAINT unique_lesson_adaptation_metadata UNIQUE (lesson_id, adaptation_type)
);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.lesson_adaptation_metadata IS 'Таблица для хранения метаданных о процессе адаптации уроков';
COMMENT ON COLUMN public.lesson_adaptation_metadata.has_audio IS 'Наличие аудио-материалов в уроке';
COMMENT ON COLUMN public.lesson_adaptation_metadata.has_video IS 'Наличие видео-материалов в уроке';
COMMENT ON COLUMN public.lesson_adaptation_metadata.has_images IS 'Наличие изображений в уроке';
COMMENT ON COLUMN public.lesson_adaptation_metadata.has_diagrams IS 'Наличие схем и диаграмм в уроке';
COMMENT ON COLUMN public.lesson_adaptation_metadata.has_practice IS 'Наличие практических заданий в уроке';
COMMENT ON COLUMN public.lesson_adaptation_metadata.recommendations IS 'Рекомендации для автора по улучшению контента (JSONB массив)';
COMMENT ON COLUMN public.lesson_adaptation_metadata.ai_generation_status IS 'Статус генерации адаптации через ИИ: pending, processing, completed, error';
COMMENT ON COLUMN public.lesson_adaptation_metadata.ai_generation_error IS 'Текст ошибки при генерации адаптации (если была ошибка)';
COMMENT ON COLUMN public.lesson_adaptation_metadata.ai_generation_timestamp IS 'Дата и время генерации адаптации через ИИ';

-- ============================================
-- 4. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индексы для таблицы lesson_adaptations
CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_lesson_id 
  ON public.lesson_adaptations(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_type 
  ON public.lesson_adaptations(adaptation_type);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_status 
  ON public.lesson_adaptations(status);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_lesson_type 
  ON public.lesson_adaptations(lesson_id, adaptation_type);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_published 
  ON public.lesson_adaptations(lesson_id, adaptation_type, status) 
  WHERE status = 'published';

-- Индексы для таблицы lesson_adaptation_metadata
CREATE INDEX IF NOT EXISTS idx_lesson_adaptation_metadata_lesson_id 
  ON public.lesson_adaptation_metadata(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptation_metadata_type 
  ON public.lesson_adaptation_metadata(adaptation_type);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptation_metadata_lesson_type 
  ON public.lesson_adaptation_metadata(lesson_id, adaptation_type);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptation_metadata_status 
  ON public.lesson_adaptation_metadata(ai_generation_status);

-- ============================================
-- 5. СОЗДАНИЕ ТРИГГЕРОВ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- ============================================

-- Триггер для таблицы lesson_adaptations
DROP TRIGGER IF EXISTS update_lesson_adaptations_updated_at ON public.lesson_adaptations;
CREATE TRIGGER update_lesson_adaptations_updated_at
  BEFORE UPDATE ON public.lesson_adaptations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггер для таблицы lesson_adaptation_metadata
DROP TRIGGER IF EXISTS update_lesson_adaptation_metadata_updated_at ON public.lesson_adaptation_metadata;
CREATE TRIGGER update_lesson_adaptation_metadata_updated_at
  BEFORE UPDATE ON public.lesson_adaptation_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. СОЗДАНИЕ ФУНКЦИИ ДЛЯ АНАЛИЗА МАТЕРИАЛОВ УРОКА
-- ============================================

-- Функция для анализа урока на наличие материалов для адаптации
CREATE OR REPLACE FUNCTION analyze_lesson_materials(lesson_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  has_audio BOOLEAN := FALSE;
  has_video BOOLEAN := FALSE;
  has_images BOOLEAN := FALSE;
  has_diagrams BOOLEAN := FALSE;
  has_practice BOOLEAN := FALSE;
  recommendations JSONB := '[]'::jsonb;
  blocks_data JSONB;
  block JSONB;
  element JSONB;
  element_type TEXT;
  element_content TEXT;
BEGIN
  -- Получаем данные урока
  SELECT blocks INTO blocks_data
  FROM public.course_lessons
  WHERE id = lesson_id_param;
  
  -- Если урок не найден или блоки отсутствуют, возвращаем пустой результат
  IF blocks_data IS NULL OR blocks_data = '[]'::jsonb OR blocks_data = '{}'::jsonb OR blocks_data::text = 'null' THEN
    RETURN jsonb_build_object(
      'has_audio', FALSE,
      'has_video', FALSE,
      'has_images', FALSE,
      'has_diagrams', FALSE,
      'has_practice', FALSE,
      'recommendations', '[]'::jsonb
    );
  END IF;
  
  -- Анализируем блоки урока
  FOR block IN SELECT * FROM jsonb_array_elements(blocks_data)
  LOOP
    -- Проверяем элементы в блоке
    IF block->'elements' IS NOT NULL AND jsonb_typeof(block->'elements') = 'array' THEN
      FOR element IN SELECT * FROM jsonb_array_elements(block->'elements')
      LOOP
        -- Получаем тип элемента
        element_type := element->>'type';
        element_content := element->>'content';
        
        -- Проверяем тип элемента
        IF element_type = 'audio' THEN
          has_audio := TRUE;
        ELSIF element_type = 'video' THEN
          has_video := TRUE;
        ELSIF element_type = 'image' THEN
          has_images := TRUE;
        ELSIF element_type = 'task' OR element_type = 'test' THEN
          has_practice := TRUE;
        ELSIF element_type = 'file' THEN
          -- Файлы могут содержать схемы или диаграммы
          -- Проверяем по расширению или содержимому (если возможно)
          IF element_content IS NOT NULL AND (
            element_content ILIKE '%.svg%' OR 
            element_content ILIKE '%.png%' OR 
            element_content ILIKE '%.jpg%' OR 
            element_content ILIKE '%.jpeg%' OR
            element_content ILIKE '%diagram%' OR
            element_content ILIKE '%scheme%' OR
            element_content ILIKE '%схема%' OR
            element_content ILIKE '%диаграмма%'
          ) THEN
            has_diagrams := TRUE;
            has_images := TRUE;
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    -- Также проверяем содержимое блока напрямую (если есть текстовое описание)
    IF block->>'content' IS NOT NULL THEN
      element_content := block->>'content';
      
      -- Проверяем наличие упоминаний о диаграммах или схемах в тексте
      IF element_content ILIKE '%схема%' OR 
         element_content ILIKE '%диаграмма%' OR 
         element_content ILIKE '%diagram%' OR
         element_content ILIKE '%scheme%' THEN
        has_diagrams := TRUE;
      END IF;
      
      -- Проверяем наличие упоминаний о практических заданиях
      IF element_content ILIKE '%задание%' OR 
         element_content ILIKE '%практика%' OR 
         element_content ILIKE '%упражнение%' OR
         element_content ILIKE '%task%' OR
         element_content ILIKE '%practice%' THEN
        has_practice := TRUE;
      END IF;
    END IF;
  END LOOP;
  
  -- Формируем рекомендации на основе отсутствующих материалов
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
COMMENT ON FUNCTION analyze_lesson_materials(UUID) IS 'Анализирует урок на наличие материалов для адаптации и возвращает рекомендации для автора';

-- ============================================
-- 7. ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- ============================================

-- Включаем RLS для таблицы lesson_adaptations
ALTER TABLE public.lesson_adaptations ENABLE ROW LEVEL SECURITY;

-- Включаем RLS для таблицы lesson_adaptation_metadata
ALTER TABLE public.lesson_adaptation_metadata ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. СОЗДАНИЕ RLS-ПОЛИТИК ДЛЯ lesson_adaptations
-- ============================================

-- Политика: Авторы и соавторы могут просматривать адаптации своих уроков
CREATE POLICY "Authors and collaborators can view adaptations for their lessons"
  ON public.lesson_adaptations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
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

-- Политика: Авторы и соавторы могут создавать адаптации для своих уроков
CREATE POLICY "Authors and collaborators can create adaptations for their lessons"
  ON public.lesson_adaptations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
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
CREATE POLICY "Authors and collaborators can update adaptations for their lessons"
  ON public.lesson_adaptations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
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
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
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
CREATE POLICY "Authors and collaborators can delete adaptations for their lessons"
  ON public.lesson_adaptations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
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

-- Политика: Студенты могут просматривать опубликованные адаптации опубликованных курсов
CREATE POLICY "Students can view published adaptations"
  ON public.lesson_adaptations
  FOR SELECT
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
      AND c.status = 'published'
      AND c.is_published = TRUE
    ) OR
    auth.role() = 'service_role'
  );

-- ============================================
-- 9. СОЗДАНИЕ RLS-ПОЛИТИК ДЛЯ lesson_adaptation_metadata
-- ============================================

-- Политика: Авторы и соавторы могут просматривать метаданные своих уроков
CREATE POLICY "Authors and collaborators can view metadata for their lessons"
  ON public.lesson_adaptation_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptation_metadata.lesson_id
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

-- Политика: Авторы и соавторы могут создавать метаданные для своих уроков
CREATE POLICY "Authors and collaborators can create metadata for their lessons"
  ON public.lesson_adaptation_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptation_metadata.lesson_id
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
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptation_metadata.lesson_id
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
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptation_metadata.lesson_id
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
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptation_metadata.lesson_id
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

-- ============================================
-- 10. СОЗДАНИЕ ФУНКЦИИ ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ МЕТАДАННЫХ
-- ============================================

-- Функция для автоматического создания метаданных при создании урока
CREATE OR REPLACE FUNCTION create_lesson_adaptation_metadata()
RETURNS TRIGGER AS $$
DECLARE
  analysis_result JSONB;
  adaptation_types TEXT[] := ARRAY['visual', 'auditory', 'kinesthetic'];
  adaptation_type_item TEXT;
BEGIN
  -- Анализируем материалы урока
  BEGIN
    analysis_result := analyze_lesson_materials(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Если анализ не удался, используем пустые значения
      analysis_result := jsonb_build_object(
        'has_audio', FALSE,
        'has_video', FALSE,
        'has_images', FALSE,
        'has_diagrams', FALSE,
        'has_practice', FALSE,
        'recommendations', '[]'::jsonb
      );
  END;
  
  -- Если результат анализа NULL, используем пустые значения
  IF analysis_result IS NULL THEN
    analysis_result := jsonb_build_object(
      'has_audio', FALSE,
      'has_video', FALSE,
      'has_images', FALSE,
      'has_diagrams', FALSE,
      'has_practice', FALSE,
      'recommendations', '[]'::jsonb
    );
  END IF;
  
  -- Создаем метаданные для каждого типа адаптации
  FOREACH adaptation_type_item IN ARRAY adaptation_types
  LOOP
    BEGIN
      INSERT INTO public.lesson_adaptation_metadata (
        lesson_id,
        adaptation_type,
        has_audio,
        has_video,
        has_images,
        has_diagrams,
        has_practice,
        recommendations,
        ai_generation_status
      ) VALUES (
        NEW.id,
        adaptation_type_item,
        COALESCE((analysis_result->>'has_audio')::boolean, FALSE),
        COALESCE((analysis_result->>'has_video')::boolean, FALSE),
        COALESCE((analysis_result->>'has_images')::boolean, FALSE),
        COALESCE((analysis_result->>'has_diagrams')::boolean, FALSE),
        COALESCE((analysis_result->>'has_practice')::boolean, FALSE),
        COALESCE(analysis_result->'recommendations', '[]'::jsonb),
        'pending'
      )
      ON CONFLICT (lesson_id, adaptation_type) DO UPDATE
      SET
        has_audio = COALESCE((analysis_result->>'has_audio')::boolean, FALSE),
        has_video = COALESCE((analysis_result->>'has_video')::boolean, FALSE),
        has_images = COALESCE((analysis_result->>'has_images')::boolean, FALSE),
        has_diagrams = COALESCE((analysis_result->>'has_diagrams')::boolean, FALSE),
        has_practice = COALESCE((analysis_result->>'has_practice')::boolean, FALSE),
        recommendations = COALESCE(analysis_result->'recommendations', '[]'::jsonb),
        updated_at = NOW();
    EXCEPTION
      WHEN OTHERS THEN
        -- Если вставка не удалась, пропускаем этот тип адаптации
        -- Но не прерываем выполнение триггера
        RAISE NOTICE 'Error creating metadata for adaptation type %: %', adaptation_type_item, SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION create_lesson_adaptation_metadata() IS 'Автоматически создает метаданные адаптации при создании или обновлении урока';

-- Триггер для автоматического создания метаданных при создании урока
DROP TRIGGER IF EXISTS trigger_create_lesson_adaptation_metadata ON public.course_lessons;
CREATE TRIGGER trigger_create_lesson_adaptation_metadata
  AFTER INSERT OR UPDATE ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION create_lesson_adaptation_metadata();

-- ============================================
-- 11. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ АДАПТАЦИИ УРОКА
-- ============================================

-- Функция для получения адаптации урока по типу
CREATE OR REPLACE FUNCTION get_lesson_adaptation(
  lesson_id_param UUID,
  adaptation_type_param TEXT
)
RETURNS TABLE (
  id UUID,
  lesson_id UUID,
  adaptation_type TEXT,
  status TEXT,
  block1 JSONB,
  block2 JSONB,
  block3 JSONB,
  block4 JSONB,
  block5 JSONB,
  generated_at TIMESTAMP WITH TIME ZONE,
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID,
  version INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.lesson_id,
    la.adaptation_type,
    la.status,
    la.block1,
    la.block2,
    la.block3,
    la.block4,
    la.block5,
    la.generated_at,
    la.edited_at,
    la.edited_by,
    la.version,
    la.created_at,
    la.updated_at
  FROM public.lesson_adaptations la
  WHERE la.lesson_id = lesson_id_param
    AND la.adaptation_type = adaptation_type_param
    AND la.status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION get_lesson_adaptation(UUID, TEXT) IS 'Возвращает опубликованную адаптацию урока по типу восприятия';

-- ============================================
-- 12. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПРОВЕРКИ НАЛИЧИЯ АДАПТАЦИИ
-- ============================================

-- Функция для проверки наличия адаптации урока
CREATE OR REPLACE FUNCTION check_adaptation_exists(
  lesson_id_param UUID,
  adaptation_type_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  adaptation_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.lesson_adaptations
    WHERE lesson_id = lesson_id_param
      AND adaptation_type = adaptation_type_param
      AND status IN ('generated', 'edited', 'published')
  ) INTO adaptation_exists;
  
  RETURN adaptation_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION check_adaptation_exists(UUID, TEXT) IS 'Проверяет наличие адаптации урока по типу восприятия';

-- ============================================
-- 13. ФИНАЛЬНАЯ ПРОВЕРКА И ИНФОРМАЦИОННЫЕ СООБЩЕНИЯ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'МИГРАЦИЯ: СИСТЕМА АДАПТАЦИИ УРОКОВ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Создана таблица: lesson_adaptations';
  RAISE NOTICE 'Создана таблица: lesson_adaptation_metadata';
  RAISE NOTICE 'Создана функция: analyze_lesson_materials';
  RAISE NOTICE 'Создана функция: create_lesson_adaptation_metadata';
  RAISE NOTICE 'Создана функция: get_lesson_adaptation';
  RAISE NOTICE 'Создана функция: check_adaptation_exists';
  RAISE NOTICE 'Созданы индексы: 8 индексов для оптимизации запросов';
  RAISE NOTICE 'Созданы RLS-политики: для всех таблиц';
  RAISE NOTICE 'Созданы триггеры: для автоматического обновления updated_at';
  RAISE NOTICE 'Создан триггер: для автоматического создания метаданных';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ГОТОВО
-- ============================================
-- Таблицы для адаптации уроков созданы и готовы к использованию
-- RLS политики настроены для безопасности
-- Индексы созданы для производительности
-- Функции для работы с адаптациями готовы к использованию
-- Триггеры настроены для автоматического обновления метаданных
-- ============================================

