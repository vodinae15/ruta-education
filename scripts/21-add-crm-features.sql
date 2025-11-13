-- ============================================
-- МИГРАЦИЯ: CRM-СИСТЕМА ДЛЯ УПРАВЛЕНИЯ УЧЕНИКАМИ
-- ============================================
-- Этот скрипт добавляет функционал для отслеживания статистики учеников
-- и двусторонних заметок между автором и учеником
-- ============================================

-- ============================================
-- 1. ДОБАВЛЕНИЕ ПОЛЯ ДЛЯ ОТСЛЕЖИВАНИЯ ВРЕМЕНИ ИЗУЧЕНИЯ
-- ============================================

-- Добавляем поле total_time_spent в таблицу student_course_access
-- Хранит общее время изучения курса в секундах
ALTER TABLE public.student_course_access 
ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.student_course_access.total_time_spent IS 'Общее время изучения курса в секундах';

-- ============================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ ЗАМЕТОК (ДВУСТОРОННИЕ)
-- ============================================

-- Создаем таблицу для хранения заметок между автором и учеником
CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id), -- Кто создал заметку (автор или ученик)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_notes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ============================================
-- 3. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индекс для быстрого поиска заметок по автору и курсу
CREATE INDEX IF NOT EXISTS idx_student_notes_author_course 
  ON public.student_notes(author_id, course_id);

-- Индекс для быстрого поиска заметок по ученику и курсу
CREATE INDEX IF NOT EXISTS idx_student_notes_student_course 
  ON public.student_notes(student_id, course_id);

-- Индекс для быстрого поиска заметок по курсу
CREATE INDEX IF NOT EXISTS idx_student_notes_course 
  ON public.student_notes(course_id);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_student_notes_created_at 
  ON public.student_notes(created_at DESC);

-- Индекс для поиска по создателю заметки
CREATE INDEX IF NOT EXISTS idx_student_notes_created_by 
  ON public.student_notes(created_by);

-- ============================================
-- 4. ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. СОЗДАНИЕ RLS-ПОЛИТИК
-- ============================================

-- Политика: Автор может просматривать все заметки по своим курсам
CREATE POLICY "Authors can view notes for their courses" 
  ON public.student_notes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_notes.course_id 
      AND courses.author_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Автор может создавать заметки для учеников своих курсов
CREATE POLICY "Authors can create notes for their courses" 
  ON public.student_notes 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_notes.course_id 
      AND courses.author_id = auth.uid()
    ) AND
    created_by = auth.uid() AND
    author_id = auth.uid()
  );

-- Политика: Автор может редактировать и удалять свои заметки
CREATE POLICY "Authors can update their own notes" 
  ON public.student_notes 
  FOR UPDATE 
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_notes.course_id 
      AND courses.author_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_notes.course_id 
      AND courses.author_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete their own notes" 
  ON public.student_notes 
  FOR DELETE 
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_notes.course_id 
      AND courses.author_id = auth.uid()
    )
  );

-- Политика: Ученик может просматривать свои заметки
CREATE POLICY "Students can view their own notes" 
  ON public.student_notes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_notes.student_id 
      AND (students.user_id = auth.uid() OR students.email = auth.jwt() ->> 'email')
    ) OR
    auth.role() = 'service_role'
  );

-- Политика: Ученик может создавать заметки для себя
CREATE POLICY "Students can create notes for themselves" 
  ON public.student_notes 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_notes.student_id 
      AND (students.user_id = auth.uid() OR students.email = auth.jwt() ->> 'email')
    ) AND
    created_by = auth.uid()
  );

-- Политика: Ученик может редактировать свои заметки
CREATE POLICY "Students can update their own notes" 
  ON public.student_notes 
  FOR UPDATE 
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_notes.student_id 
      AND (students.user_id = auth.uid() OR students.email = auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_notes.student_id 
      AND (students.user_id = auth.uid() OR students.email = auth.jwt() ->> 'email')
    )
  );

-- Политика: Ученик может удалять свои заметки
CREATE POLICY "Students can delete their own notes" 
  ON public.student_notes 
  FOR DELETE 
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_notes.student_id 
      AND (students.user_id = auth.uid() OR students.email = auth.jwt() ->> 'email')
    )
  );

-- ============================================
-- 6. СОЗДАНИЕ ТРИГГЕРА ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_student_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_student_notes_updated_at ON public.student_notes;
CREATE TRIGGER update_student_notes_updated_at
  BEFORE UPDATE ON public.student_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_student_notes_updated_at();

-- ============================================
-- 7. ВЫДАЧА ПРАВ ДОСТУПА
-- ============================================

-- Выдаем права на таблицу заметок
GRANT ALL ON public.student_notes TO authenticated;
GRANT ALL ON public.student_notes TO service_role;

-- ============================================
-- 8. ДОБАВЛЕНИЕ КОММЕНТАРИЕВ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON TABLE public.student_notes IS 'Таблица для двусторонних заметок между автором и учеником';
COMMENT ON COLUMN public.student_notes.author_id IS 'ID автора курса';
COMMENT ON COLUMN public.student_notes.student_id IS 'ID ученика';
COMMENT ON COLUMN public.student_notes.course_id IS 'ID курса';
COMMENT ON COLUMN public.student_notes.note IS 'Текст заметки';
COMMENT ON COLUMN public.student_notes.created_by IS 'ID пользователя, который создал заметку (автор или ученик)';

-- ============================================
-- 9. ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'CRM-система для управления учениками успешно настроена!';
  RAISE NOTICE 'Добавлено поле: student_course_access.total_time_spent';
  RAISE NOTICE 'Создана таблица: student_notes';
  RAISE NOTICE 'Созданы индексы: 5 индексов для оптимизации запросов';
  RAISE NOTICE 'Созданы RLS-политики: 8 политик для безопасности';
  RAISE NOTICE 'Создан триггер: автоматическое обновление updated_at';
END $$;

