-- Скрипт для отладки и исправления проблем с сохранением профилей авторов

-- Проверим текущую структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'author_profiles' 
AND table_schema = 'public';

-- Убедимся, что RLS включен
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'author_profiles';

-- Проверим существующие политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'author_profiles';

-- Обновим CHECK constraint для author_type, добавив "Первопроходец"
ALTER TABLE public.author_profiles 
DROP CONSTRAINT IF EXISTS author_profiles_author_type_check;

ALTER TABLE public.author_profiles 
ADD CONSTRAINT author_profiles_author_type_check 
CHECK (author_type IN (
  'Первопроходец', 'Оратор', 'Методист', 'Автор на вдохновении', 
  'Загруженный эксперт', 'Педагог с эмпатией', 'Практик-рационал', 
  'Интуитивный автор', 'Уникальный'
));

-- Добавим индекс для быстрого поиска по user_id (если его нет)
CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id_unique 
ON public.author_profiles(user_id);

-- Проверим, что у нас есть все необходимые столбцы
ALTER TABLE public.author_profiles 
ADD COLUMN IF NOT EXISTS communication_style character varying,
ADD COLUMN IF NOT EXISTS motivation character varying,
ADD COLUMN IF NOT EXISTS barrier character varying;

-- Обновим RLS политики для большей ясности
DROP POLICY IF EXISTS "Users can view their own author profile" ON public.author_profiles;
DROP POLICY IF EXISTS "Users can insert their own author profile" ON public.author_profiles;
DROP POLICY IF EXISTS "Users can update their own author profile" ON public.author_profiles;

-- Создадим новые политики с отладочной информацией
CREATE POLICY "author_profiles_select_policy" ON public.author_profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "author_profiles_insert_policy" ON public.author_profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "author_profiles_update_policy" ON public.author_profiles
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Включим RLS если он отключен
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

-- Создадим функцию для отладки аутентификации
CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS TABLE(
  current_user_id uuid,
  is_authenticated boolean,
  session_info jsonb
) 
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    auth.uid() as current_user_id,
    auth.uid() IS NOT NULL as is_authenticated,
    auth.jwt() as session_info;
$$;

-- Предоставим права на выполнение функции
GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;
