-- ============================================
-- ИСПРАВЛЕНИЕ БЕСКОНЕЧНОЙ РЕКУРСИИ В RLS ПОЛИТИКАХ
-- ============================================
-- Проблема: политики для courses и course_collaborators вызывают друг друга
-- Решение: использовать SECURITY DEFINER функцию для проверки авторства

-- Создаем функцию для проверки авторства без RLS
CREATE OR REPLACE FUNCTION public.is_course_author(course_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.courses 
    WHERE id = course_id_param 
    AND author_id = auth.uid()
  );
$$;

-- Обновляем политику для course_collaborators (SELECT)
DROP POLICY IF EXISTS "Authors can view collaborators for their courses" ON public.course_collaborators;

CREATE POLICY "Authors can view collaborators for their courses" 
  ON public.course_collaborators 
  FOR SELECT 
  USING (
    public.is_course_author(course_id) OR
    -- Соавтор может видеть список соавторов курса, где он является соавтором
    collaborator_user_id = auth.uid() OR
    auth.role() = 'service_role'
  );

-- Обновляем политику для course_collaborators (INSERT)
DROP POLICY IF EXISTS "Authors can add collaborators to their courses" ON public.course_collaborators;

CREATE POLICY "Authors can add collaborators to their courses" 
  ON public.course_collaborators 
  FOR INSERT 
  WITH CHECK (
    public.is_course_author(course_id) AND
    added_by = auth.uid()
  );

-- Обновляем политику для course_collaborators (DELETE)
DROP POLICY IF EXISTS "Authors can remove collaborators from their courses" ON public.course_collaborators;

CREATE POLICY "Authors can remove collaborators from their courses" 
  ON public.course_collaborators 
  FOR DELETE 
  USING (
    public.is_course_author(course_id) OR
    auth.role() = 'service_role'
  );

-- Комментарий к функции
COMMENT ON FUNCTION public.is_course_author IS 'Проверяет, является ли текущий пользователь автором курса. Использует SECURITY DEFINER для обхода RLS и предотвращения рекурсии.';

