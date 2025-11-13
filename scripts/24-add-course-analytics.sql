-- ============================================
-- МИГРАЦИЯ: ДЕТАЛЬНАЯ АНАЛИТИКА ПО КУРСАМ
-- ============================================
-- Этот скрипт добавляет функционал для отслеживания просмотров блоков уроков
-- Позволяет авторам видеть детальную статистику по урокам и поведению учеников
-- ============================================

-- ============================================
-- 1. ПРОВЕРКА И СОЗДАНИЕ ТАБЛИЦЫ course_lessons (если не существует)
-- ============================================

-- Создаем таблицу course_lessons, если она не существует
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  blocks JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для course_lessons (если не существуют)
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON public.course_lessons(course_id, order_index);

-- ============================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ ПРОСМОТРОВ БЛОКОВ
-- ============================================

-- Создаем таблицу для отслеживания просмотров блоков уроков
CREATE TABLE IF NOT EXISTS public.lesson_block_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL, -- ID блока из JSONB (например, "introduction", "main_block_1")
  block_type TEXT NOT NULL, -- тип блока (introduction, main_block_1, intermediate_practice, etc.)
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- когда блок был просмотрен
  time_spent INTEGER DEFAULT 0, -- время просмотра блока в секундах
  is_repeat BOOLEAN DEFAULT FALSE, -- является ли просмотр повторным
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_block_type CHECK (
    block_type IN (
      'introduction',
      'navigation',
      'main_block_1',
      'intermediate_practice',
      'main_block_2',
      'intermediate_test',
      'main_block_3',
      'conclusion',
      'bonus_support'
    )
  )
);

-- Комментарии к таблице
COMMENT ON TABLE public.lesson_block_views IS 'Таблица для отслеживания просмотров блоков уроков студентами';
COMMENT ON COLUMN public.lesson_block_views.block_id IS 'ID блока из JSONB структуры урока';
COMMENT ON COLUMN public.lesson_block_views.block_type IS 'Тип блока (introduction, main_block_1, etc.)';
COMMENT ON COLUMN public.lesson_block_views.time_spent IS 'Время просмотра блока в секундах';
COMMENT ON COLUMN public.lesson_block_views.is_repeat IS 'Флаг повторного просмотра блока';

-- ============================================
-- 3. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индекс для быстрого поиска просмотров по курсу
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_course_id 
  ON public.lesson_block_views(course_id);

-- Индекс для быстрого поиска просмотров по уроку
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_lesson_id 
  ON public.lesson_block_views(lesson_id);

-- Индекс для быстрого поиска просмотров по студенту
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_student_id 
  ON public.lesson_block_views(student_id);

-- Индекс для быстрого поиска просмотров по типу блока
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_block_type 
  ON public.lesson_block_views(block_type);

-- Составной индекс для аналитических запросов (курс + урок + блок)
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_course_lesson_block 
  ON public.lesson_block_views(course_id, lesson_id, block_id);

-- Составной индекс для поиска просмотров студента по курсу
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_student_course 
  ON public.lesson_block_views(student_id, course_id);

-- Индекс для фильтрации по дате просмотра
CREATE INDEX IF NOT EXISTS idx_lesson_block_views_viewed_at 
  ON public.lesson_block_views(viewed_at DESC);

-- ============================================
-- 4. ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.lesson_block_views ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. СОЗДАНИЕ RLS-ПОЛИТИК
-- ============================================

-- Политика: Студенты могут добавлять свои просмотры блоков
CREATE POLICY "Students can insert their own block views" 
  ON public.lesson_block_views 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = lesson_block_views.student_id 
      AND students.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Студенты могут просматривать свои просмотры блоков
CREATE POLICY "Students can view their own block views" 
  ON public.lesson_block_views 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = lesson_block_views.student_id 
      AND students.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Авторы могут просматривать аналитику по своим курсам
CREATE POLICY "Authors can view analytics for their courses" 
  ON public.lesson_block_views 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lesson_block_views.course_id 
      AND (
        courses.author_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.course_collaborators 
          WHERE course_collaborators.course_id = courses.id 
          AND course_collaborators.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Студенты могут обновлять свои просмотры (для обновления time_spent)
CREATE POLICY "Students can update their own block views" 
  ON public.lesson_block_views 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = lesson_block_views.student_id 
      AND students.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = lesson_block_views.student_id 
      AND students.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- ============================================
-- 6. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ОПРЕДЕЛЕНИЯ ПОВТОРНЫХ ПРОСМОТРОВ
-- ============================================

-- Функция для автоматического определения повторного просмотра
-- Вызывается перед вставкой записи через триггер
CREATE OR REPLACE FUNCTION public.determine_repeat_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем, есть ли уже просмотр этого блока этим студентом
  -- Для INSERT: проверяем все существующие записи
  -- Для UPDATE: проверяем все записи кроме текущей
  IF EXISTS (
    SELECT 1 FROM public.lesson_block_views
    WHERE student_id = NEW.student_id
    AND course_id = NEW.course_id
    AND lesson_id = NEW.lesson_id
    AND block_id = NEW.block_id
    AND (TG_OP = 'INSERT' OR id != NEW.id)
  ) THEN
    NEW.is_repeat = TRUE;
  ELSE
    NEW.is_repeat = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического определения повторных просмотров
CREATE TRIGGER trigger_determine_repeat_view
  BEFORE INSERT OR UPDATE ON public.lesson_block_views
  FOR EACH ROW
  EXECUTE FUNCTION public.determine_repeat_view();

-- ============================================
-- 7. СОЗДАНИЕ ФУНКЦИЙ ДЛЯ АНАЛИТИКИ
-- ============================================

-- Функция для получения средней статистики по урокам курса
CREATE OR REPLACE FUNCTION public.get_lesson_analytics(
  p_course_id UUID
)
RETURNS TABLE (
  lesson_id UUID,
  lesson_title TEXT,
  total_views BIGINT,
  unique_students BIGINT,
  average_time_spent NUMERIC,
  repeat_views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id AS lesson_id,
    cl.title AS lesson_title,
    COUNT(lbv.id) AS total_views,
    COUNT(DISTINCT lbv.student_id) AS unique_students,
    COALESCE(AVG(lbv.time_spent), 0) AS average_time_spent,
    COUNT(CASE WHEN lbv.is_repeat = TRUE THEN 1 END) AS repeat_views
  FROM public.course_lessons cl
  LEFT JOIN public.lesson_block_views lbv ON lbv.lesson_id = cl.id
  WHERE cl.course_id = p_course_id
  GROUP BY cl.id, cl.title, cl.order_index
  ORDER BY cl.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения статистики по блокам урока
CREATE OR REPLACE FUNCTION public.get_block_analytics(
  p_lesson_id UUID
)
RETURNS TABLE (
  block_id TEXT,
  block_type TEXT,
  students_completed BIGINT,
  total_views BIGINT,
  repeat_views BIGINT,
  average_time_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lbv.block_id,
    lbv.block_type,
    COUNT(DISTINCT lbv.student_id) AS students_completed,
    COUNT(lbv.id) AS total_views,
    COUNT(CASE WHEN lbv.is_repeat = TRUE THEN 1 END) AS repeat_views,
    COALESCE(AVG(lbv.time_spent), 0) AS average_time_spent
  FROM public.lesson_block_views lbv
  WHERE lbv.lesson_id = p_lesson_id
  GROUP BY lbv.block_id, lbv.block_type
  ORDER BY 
    CASE lbv.block_type
      WHEN 'introduction' THEN 1
      WHEN 'navigation' THEN 2
      WHEN 'main_block_1' THEN 3
      WHEN 'intermediate_practice' THEN 4
      WHEN 'main_block_2' THEN 5
      WHEN 'intermediate_test' THEN 6
      WHEN 'main_block_3' THEN 7
      WHEN 'conclusion' THEN 8
      WHEN 'bonus_support' THEN 9
      ELSE 10
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии к функциям
COMMENT ON FUNCTION public.get_lesson_analytics(UUID) IS 'Возвращает аналитику по урокам курса';
COMMENT ON FUNCTION public.get_block_analytics(UUID) IS 'Возвращает аналитику по блокам урока';

-- ============================================
-- 8. ВКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦЫ course_lessons (если еще не включено)
-- ============================================

-- Включаем RLS для course_lessons
-- Если RLS уже включено, команда просто проигнорируется
DO $$
BEGIN
  -- Пытаемся включить RLS (не выдаст ошибку, если уже включено)
  ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS уже включено или таблица не существует - продолжаем
    NULL;
END $$;

-- ============================================
-- ГОТОВО
-- ============================================
-- Таблица lesson_block_views создана и готова к использованию
-- RLS политики настроены для безопасности
-- Индексы созданы для производительности
-- Функции аналитики готовы к использованию
-- ============================================

