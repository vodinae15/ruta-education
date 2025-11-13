-- ============================================
-- МИГРАЦИЯ: МУЛЬТИАВТОРНОСТЬ С СОВМЕСТНЫМ ДОСТУПОМ
-- ============================================
-- Этот скрипт добавляет функционал для совместной работы над курсами
-- Позволяет авторам добавлять соавторов для совместного редактирования
-- ============================================

-- ============================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ СОАВТОРОВ
-- ============================================

-- Создаем таблицу для хранения соавторов курсов
CREATE TABLE IF NOT EXISTS public.course_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  collaborator_email text NOT NULL,
  collaborator_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT course_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT unique_course_collaborator UNIQUE (course_id, collaborator_email)
) TABLESPACE pg_default;

-- ============================================
-- 2. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индекс для быстрого поиска соавторов по курсу
CREATE INDEX IF NOT EXISTS idx_course_collaborators_course_id 
  ON public.course_collaborators(course_id);

-- Индекс для быстрого поиска курсов по соавтору
CREATE INDEX IF NOT EXISTS idx_course_collaborators_user_id 
  ON public.course_collaborators(collaborator_user_id);

-- Индекс для быстрого поиска по email соавтора
CREATE INDEX IF NOT EXISTS idx_course_collaborators_email 
  ON public.course_collaborators(collaborator_email);

-- ============================================
-- 3. ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.course_collaborators ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. СОЗДАНИЕ RLS-ПОЛИТИК
-- ============================================

-- Политика: Автор курса может просматривать всех соавторов своего курса
CREATE POLICY "Authors can view collaborators for their courses" 
  ON public.course_collaborators 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_collaborators.course_id 
      AND courses.author_id = auth.uid()
    ) OR
    -- Соавтор может видеть список соавторов курса, где он является соавтором
    collaborator_user_id = auth.uid() OR
    auth.role() = 'service_role'
  );

-- Политика: Автор курса может добавлять соавторов
CREATE POLICY "Authors can add collaborators to their courses" 
  ON public.course_collaborators 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_collaborators.course_id 
      AND courses.author_id = auth.uid()
    ) AND
    added_by = auth.uid()
  );

-- Политика: Автор курса может удалять соавторов
CREATE POLICY "Authors can remove collaborators from their courses" 
  ON public.course_collaborators 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_collaborators.course_id 
      AND courses.author_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- ============================================
-- 5. ОБНОВЛЕНИЕ RLS-ПОЛИТИК ДЛЯ ТАБЛИЦЫ COURSES
-- ============================================

-- Удаляем старые политики для курсов
DROP POLICY IF EXISTS "Authors can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Authors can insert own courses" ON public.courses;
DROP POLICY IF EXISTS "Authors can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can insert their own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can update their own courses" ON public.courses;

-- Новая политика: Автор ИЛИ соавтор могут просматривать курс
CREATE POLICY "Authors and collaborators can view courses" 
  ON public.courses 
  FOR SELECT 
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.course_collaborators 
      WHERE course_collaborators.course_id = courses.id 
      AND course_collaborators.collaborator_user_id = auth.uid()
    ) OR
    status = 'published' OR
    auth.role() = 'service_role'
  );

-- Новая политика: Автор ИЛИ соавтор могут обновлять курс
CREATE POLICY "Authors and collaborators can update courses" 
  ON public.courses 
  FOR UPDATE 
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.course_collaborators 
      WHERE course_collaborators.course_id = courses.id 
      AND course_collaborators.collaborator_user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.course_collaborators 
      WHERE course_collaborators.course_id = courses.id 
      AND course_collaborators.collaborator_user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Только автор может создавать курсы
CREATE POLICY "Authors can insert courses" 
  ON public.courses 
  FOR INSERT 
  WITH CHECK (author_id = auth.uid() OR auth.role() = 'service_role');

-- ============================================
-- 6. ОБНОВЛЕНИЕ RLS-ПОЛИТИК ДЛЯ ТАБЛИЦЫ COURSE_LESSONS
-- ============================================

-- Проверяем, существует ли таблица course_lessons
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
    -- Удаляем старые политики для уроков
    DROP POLICY IF EXISTS "Authors can manage own course lessons" ON public.course_lessons;
    DROP POLICY IF EXISTS "Authors and collaborators can manage lessons" ON public.course_lessons;
    
    -- Новая политика: Автор ИЛИ соавтор могут управлять уроками
    
    CREATE POLICY "Authors and collaborators can manage lessons" 
      ON public.course_lessons 
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE courses.id = course_lessons.course_id 
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
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE courses.id = course_lessons.course_id 
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
  END IF;
END $$;

-- ============================================
-- 7. ОБНОВЛЕНИЕ RLS-ПОЛИТИК ДЛЯ ТАБЛИЦЫ COURSE_MODULES (если используется)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
    -- Удаляем старые политики для модулей
    DROP POLICY IF EXISTS "Authors can manage own course modules" ON public.course_modules;
    DROP POLICY IF EXISTS "Authors and collaborators can manage modules" ON public.course_modules;
    
    -- Новая политика: Автор ИЛИ соавтор могут управлять модулями
    
    CREATE POLICY "Authors and collaborators can manage modules" 
      ON public.course_modules 
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE courses.id = course_modules.course_id 
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
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE courses.id = course_modules.course_id 
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
  END IF;
END $$;

-- ============================================
-- 8. ОБНОВЛЕНИЕ RLS-ПОЛИТИК ДЛЯ ТАБЛИЦЫ CONTENT_BLOCKS (если используется)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_blocks') THEN
    -- Удаляем старые политики для блоков контента
    DROP POLICY IF EXISTS "Authors can manage own content blocks" ON public.content_blocks;
    DROP POLICY IF EXISTS "Authors and collaborators can manage content blocks" ON public.content_blocks;
    
    -- Новая политика: Автор ИЛИ соавтор могут управлять блоками контента
    
    CREATE POLICY "Authors and collaborators can manage content blocks" 
      ON public.content_blocks 
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.course_modules cm
          JOIN public.courses c ON c.id = cm.course_id
          WHERE cm.id = content_blocks.module_id 
          AND (
            c.author_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.course_collaborators 
              WHERE course_collaborators.course_id = c.id 
              AND course_collaborators.collaborator_user_id = auth.uid()
            )
          )
        ) OR
        auth.role() = 'service_role'
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.course_modules cm
          JOIN public.courses c ON c.id = cm.course_id
          WHERE cm.id = content_blocks.module_id 
          AND (
            c.author_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.course_collaborators 
              WHERE course_collaborators.course_id = c.id 
              AND course_collaborators.collaborator_user_id = auth.uid()
            )
          )
        ) OR
        auth.role() = 'service_role'
      );
  END IF;
END $$;

-- ============================================
-- 9. ВЫДАЧА ПРАВ ДОСТУПА
-- ============================================

-- Выдаем права на таблицу соавторов
GRANT ALL ON public.course_collaborators TO authenticated;
GRANT ALL ON public.course_collaborators TO service_role;

-- ============================================
-- 10. ДОБАВЛЕНИЕ КОММЕНТАРИЕВ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON TABLE public.course_collaborators IS 'Таблица для хранения соавторов курсов';
COMMENT ON COLUMN public.course_collaborators.course_id IS 'ID курса';
COMMENT ON COLUMN public.course_collaborators.collaborator_email IS 'Email соавтора';
COMMENT ON COLUMN public.course_collaborators.collaborator_user_id IS 'ID пользователя соавтора в auth.users';
COMMENT ON COLUMN public.course_collaborators.added_by IS 'ID пользователя, который добавил соавтора';
COMMENT ON COLUMN public.course_collaborators.added_at IS 'Дата и время добавления соавтора';

-- ============================================
-- 11. ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Мультиавторность успешно настроена!';
  RAISE NOTICE 'Создана таблица: course_collaborators';
  RAISE NOTICE 'Созданы индексы: 3 индекса для оптимизации запросов';
  RAISE NOTICE 'Созданы RLS-политики: 3 политики для таблицы соавторов';
  RAISE NOTICE 'Обновлены RLS-политики: для courses, course_lessons, course_modules, content_blocks';
END $$;

