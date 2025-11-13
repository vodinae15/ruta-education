-- Проверка RLS политик для таблицы author_profiles
-- Этот скрипт поможет убедиться, что пользователи могут сохранять свои профили

-- Проверяем существование таблицы
SELECT table_name, row_security 
FROM information_schema.tables 
WHERE table_name = 'author_profiles' AND table_schema = 'public';

-- Проверяем существующие политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'author_profiles';

-- Если политик нет, создаем их
DO $$
BEGIN
    -- Включаем RLS если не включен
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'author_profiles' 
        AND table_schema = 'public' 
        AND row_security = 'YES'
    ) THEN
        ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Политика для SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'author_profiles' 
        AND policyname = 'author_profiles_select_own'
    ) THEN
        CREATE POLICY "author_profiles_select_own"
        ON public.author_profiles FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    -- Политика для INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'author_profiles' 
        AND policyname = 'author_profiles_insert_own'
    ) THEN
        CREATE POLICY "author_profiles_insert_own"
        ON public.author_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Политика для UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'author_profiles' 
        AND policyname = 'author_profiles_update_own'
    ) THEN
        CREATE POLICY "author_profiles_update_own"
        ON public.author_profiles FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    -- Политика для DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'author_profiles' 
        AND policyname = 'author_profiles_delete_own'
    ) THEN
        CREATE POLICY "author_profiles_delete_own"
        ON public.author_profiles FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Проверяем результат
SELECT 'RLS policies for author_profiles table have been checked and created if needed' as status;
