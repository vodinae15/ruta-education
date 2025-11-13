-- ============================================
-- АЛЬТЕРНАТИВНЫЙ СКРИПТ: Если основной скрипт не работает
-- ============================================
-- Этот скрипт использует более агрессивный подход:
-- 1. Временно отключает RLS
-- 2. Изменяет тип колонки
-- 3. Включает RLS обратно
-- 4. Создает новые политики
-- ============================================

-- 1. ВРЕМЕННО ОТКЛЮЧАЕМ RLS
ALTER TABLE public.lesson_adaptations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_adaptation_metadata DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все политики (теперь это безопасно, так как RLS отключен)
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

-- 3. Удаляем уникальное ограничение и внешний ключ
ALTER TABLE public.lesson_adaptations 
  DROP CONSTRAINT IF EXISTS unique_lesson_adaptation_type;

ALTER TABLE public.lesson_adaptations 
  DROP CONSTRAINT IF EXISTS lesson_adaptations_lesson_id_fkey;

ALTER TABLE public.lesson_adaptation_metadata 
  DROP CONSTRAINT IF EXISTS lesson_adaptation_metadata_lesson_id_fkey;

-- 4. Добавляем поле course_id в lesson_adaptations (если его еще нет)
ALTER TABLE public.lesson_adaptations 
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 5. Добавляем поле course_id в lesson_adaptation_metadata (если его еще нет)
ALTER TABLE public.lesson_adaptation_metadata 
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 6. Миграция данных: если lesson_id является UUID, пытаемся найти course_id из course_lessons
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
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        -- Игнорируем ошибки при поиске (например, если lesson_id не является UUID)
        NULL;
    END;
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
    BEGIN
      SELECT course_id INTO lesson_course_id
      FROM public.course_lessons
      WHERE id::text = metadata_record.lesson_id::text
      LIMIT 1;
      
      IF lesson_course_id IS NOT NULL THEN
        UPDATE public.lesson_adaptation_metadata
        SET course_id = lesson_course_id
        WHERE id = metadata_record.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;
END $$;

-- 7. Изменяем тип lesson_id на TEXT (теперь это безопасно, так как RLS отключен)
ALTER TABLE public.lesson_adaptations 
  ALTER COLUMN lesson_id TYPE TEXT USING lesson_id::TEXT;

ALTER TABLE public.lesson_adaptation_metadata 
  ALTER COLUMN lesson_id TYPE TEXT USING lesson_id::TEXT;

-- 8. Создаем новый уникальный индекс с учетом course_id
DROP INDEX IF EXISTS unique_lesson_adaptation_type_with_course;
CREATE UNIQUE INDEX unique_lesson_adaptation_type_with_course 
  ON public.lesson_adaptations (course_id, lesson_id, adaptation_type);

-- 9. Обновляем комментарии
COMMENT ON COLUMN public.lesson_adaptations.lesson_id IS 'ID урока (может быть UUID для уроков из course_lessons или строка для уроков из modules.lessons)';
COMMENT ON COLUMN public.lesson_adaptations.course_id IS 'ID курса, к которому относится урок';

COMMENT ON COLUMN public.lesson_adaptation_metadata.lesson_id IS 'ID урока (может быть UUID для уроков из course_lessons или строка для уроков из modules.lessons)';
COMMENT ON COLUMN public.lesson_adaptation_metadata.course_id IS 'ID курса, к которому относится урок';

-- 10. ВКЛЮЧАЕМ RLS ОБРАТНО
ALTER TABLE public.lesson_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_adaptation_metadata ENABLE ROW LEVEL SECURITY;

-- 11. Создаем новые политики RLS (используем course_id вместо course_lessons)
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

-- 12. Обновляем политики для lesson_adaptation_metadata
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

-- 13. Обновляем функцию analyze_lesson_materials (см. основной скрипт для полной версии)
-- Здесь нужно скопировать функцию из основного скрипта

-- ============================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================

