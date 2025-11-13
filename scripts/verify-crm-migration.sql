-- ============================================
-- СКРИПТ ПРОВЕРКИ МИГРАЦИИ CRM-СИСТЕМЫ
-- ============================================
-- Этот скрипт проверяет, что миграция выполнена успешно
-- Выполните его после миграции 21-add-crm-features.sql
-- ============================================

-- Проверка 1: Поле total_time_spent существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'student_course_access' 
    AND column_name = 'total_time_spent'
  ) THEN
    RAISE NOTICE '✅ Поле total_time_spent успешно добавлено в student_course_access';
  ELSE
    RAISE WARNING '❌ Поле total_time_spent НЕ найдено в student_course_access';
  END IF;
END $$;

-- Проверка 2: Таблица student_notes существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'student_notes'
  ) THEN
    RAISE NOTICE '✅ Таблица student_notes успешно создана';
  ELSE
    RAISE WARNING '❌ Таблица student_notes НЕ найдена';
  END IF;
END $$;

-- Проверка 3: Все колонки таблицы student_notes существуют
DO $$
DECLARE
  required_columns TEXT[] := ARRAY['id', 'author_id', 'student_id', 'course_id', 'note', 'created_by', 'created_at', 'updated_at'];
  col TEXT;
  missing_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'student_notes' 
      AND column_name = col
    ) THEN
      missing_cols := array_append(missing_cols, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_cols, 1) IS NULL THEN
    RAISE NOTICE '✅ Все колонки таблицы student_notes существуют';
  ELSE
    RAISE WARNING '❌ Отсутствуют колонки: %', array_to_string(missing_cols, ', ');
  END IF;
END $$;

-- Проверка 4: Индексы созданы
DO $$
DECLARE
  required_indexes TEXT[] := ARRAY[
    'idx_student_notes_author_course',
    'idx_student_notes_student_course',
    'idx_student_notes_course',
    'idx_student_notes_created_at',
    'idx_student_notes_created_by'
  ];
  idx TEXT;
  missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH idx IN ARRAY required_indexes
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = idx
    ) THEN
      missing_indexes := array_append(missing_indexes, idx);
    END IF;
  END LOOP;
  
  IF array_length(missing_indexes, 1) IS NULL THEN
    RAISE NOTICE '✅ Все индексы успешно созданы';
  ELSE
    RAISE WARNING '❌ Отсутствуют индексы: %', array_to_string(missing_indexes, ', ');
  END IF;
END $$;

-- Проверка 5: RLS включен
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'student_notes' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS включен для таблицы student_notes';
  ELSE
    RAISE WARNING '❌ RLS НЕ включен для таблицы student_notes';
  END IF;
END $$;

-- Проверка 6: RLS-политики созданы
DO $$
DECLARE
  required_policies TEXT[] := ARRAY[
    'Authors can view notes for their courses',
    'Authors can create notes for their courses',
    'Authors can update their own notes',
    'Authors can delete their own notes',
    'Students can view their own notes',
    'Students can create notes for themselves',
    'Students can update their own notes',
    'Students can delete their own notes'
  ];
  policy TEXT;
  missing_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH policy IN ARRAY required_policies
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'student_notes' 
      AND policyname = policy
    ) THEN
      missing_policies := array_append(missing_policies, policy);
    END IF;
  END LOOP;
  
  IF array_length(missing_policies, 1) IS NULL THEN
    RAISE NOTICE '✅ Все RLS-политики успешно созданы';
  ELSE
    RAISE WARNING '❌ Отсутствуют политики: %', array_to_string(missing_policies, ', ');
  END IF;
END $$;

-- Проверка 7: Триггер создан
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'update_student_notes_updated_at'
  ) THEN
    RAISE NOTICE '✅ Триггер update_student_notes_updated_at успешно создан';
  ELSE
    RAISE WARNING '❌ Триггер update_student_notes_updated_at НЕ найден';
  END IF;
END $$;

-- Итоговый отчет
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ПРОВЕРКА МИГРАЦИИ ЗАВЕРШЕНА';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Если все проверки пройдены успешно (✅),';
  RAISE NOTICE 'миграция выполнена корректно!';
  RAISE NOTICE '========================================';
END $$;

