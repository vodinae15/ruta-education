-- ============================================
-- МИГРАЦИЯ: СИСТЕМА ОПЛАТЫ И ТАРИФОВ
-- ============================================
-- Этот скрипт добавляет функционал для платных курсов с тарифами
-- Поддерживает потоковый и постоянный режимы запуска
-- ============================================

-- ============================================
-- 1. ДОБАВЛЕНИЕ ПОЛЕЙ В ТАБЛИЦУ COURSES
-- ============================================

-- Добавляем поле режима запуска курса
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS launch_mode TEXT CHECK (launch_mode IN ('stream', 'permanent'));

-- Добавляем поле даты старта для потоковых курсов
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS stream_start_date TIMESTAMP WITH TIME ZONE;

-- Добавляем комментарии
COMMENT ON COLUMN public.courses.launch_mode IS 'Режим запуска: stream (потоковый) или permanent (постоянный)';
COMMENT ON COLUMN public.courses.stream_start_date IS 'Дата старта для потоковых курсов';

-- ============================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ ТАРИФОВ КУРСА
-- ============================================

CREATE TABLE IF NOT EXISTS public.course_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Базовый", "С обратной связью", "Премиум"
  price DECIMAL(10,2) NOT NULL DEFAULT 0, -- 0 для бесплатного тарифа
  has_feedback BOOLEAN DEFAULT FALSE, -- есть ли обратная связь
  description TEXT, -- описание тарифа
  bonus_content TEXT, -- бонусный контент для премиум тарифа
  is_default BOOLEAN DEFAULT FALSE, -- первый тариф = бесплатный по умолчанию
  order_index INTEGER DEFAULT 0, -- порядок отображения (0, 1, 2)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_course_pricing_order UNIQUE (course_id, order_index)
);

-- Индексы для таблицы тарифов
CREATE INDEX IF NOT EXISTS idx_course_pricing_course_id ON public.course_pricing(course_id);
CREATE INDEX IF NOT EXISTS idx_course_pricing_order ON public.course_pricing(course_id, order_index);

-- Включаем RLS
ALTER TABLE public.course_pricing ENABLE ROW LEVEL SECURITY;

-- RLS политики для тарифов
-- Автор и соавторы могут просматривать тарифы своих курсов
CREATE POLICY "Authors and collaborators can view pricing for their courses" 
  ON public.course_pricing 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_pricing.course_id 
      AND (
        courses.author_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.course_collaborators 
          WHERE course_collaborators.course_id = courses.id 
          AND course_collaborators.collaborator_user_id = auth.uid()
        )
      )
    ) OR
    -- Публичные тарифы для опубликованных курсов
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_pricing.course_id 
      AND courses.status = 'published'
    ) OR
    auth.role() = 'service_role'
  );

-- Автор и соавторы могут управлять тарифами своих курсов
CREATE POLICY "Authors and collaborators can manage pricing for their courses" 
  ON public.course_pricing 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_pricing.course_id 
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
      WHERE courses.id = course_pricing.course_id 
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

-- ============================================
-- 3. СОЗДАНИЕ ТАБЛИЦЫ ПОКУПОК
-- ============================================

CREATE TABLE IF NOT EXISTS public.course_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pricing_id UUID NOT NULL REFERENCES public.course_pricing(id) ON DELETE CASCADE,
  purchase_status TEXT DEFAULT 'completed' CHECK (purchase_status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT DEFAULT 'test', -- 'test' для тестовой оплаты
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- когда открыт доступ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Один студент может купить несколько тарифов одного курса
  CONSTRAINT unique_course_student_pricing UNIQUE (course_id, student_id, pricing_id)
);

-- Индексы для таблицы покупок
CREATE INDEX IF NOT EXISTS idx_course_purchases_course_id ON public.course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_student_id ON public.course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_pricing_id ON public.course_purchases(pricing_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_status ON public.course_purchases(purchase_status);

-- Включаем RLS
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

-- RLS политики для покупок
-- Студенты могут просматривать свои покупки
CREATE POLICY "Students can view own purchases" 
  ON public.course_purchases 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = course_purchases.student_id 
      AND students.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Студенты могут создавать покупки (через API)
CREATE POLICY "Students can create purchases" 
  ON public.course_purchases 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = course_purchases.student_id 
      AND students.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Автор может просматривать покупки своих курсов
CREATE POLICY "Authors can view purchases for their courses" 
  ON public.course_purchases 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_purchases.course_id 
      AND courses.author_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_purchases.course_id 
      AND EXISTS (
        SELECT 1 FROM public.course_collaborators 
        WHERE course_collaborators.course_id = courses.id 
        AND course_collaborators.collaborator_user_id = auth.uid()
      )
    ) OR
    auth.role() = 'service_role'
  );

-- ============================================
-- 4. СОЗДАНИЕ ТАБЛИЦЫ УВЕДОМЛЕНИЙ АВТОРА
-- ============================================

CREATE TABLE IF NOT EXISTS public.author_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('purchase_with_feedback', 'stream_started')),
  message TEXT, -- текст уведомления
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для таблицы уведомлений
CREATE INDEX IF NOT EXISTS idx_author_notifications_author_id ON public.author_notifications(author_id);
CREATE INDEX IF NOT EXISTS idx_author_notifications_course_id ON public.author_notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_author_notifications_is_read ON public.author_notifications(author_id, is_read);
CREATE INDEX IF NOT EXISTS idx_author_notifications_created_at ON public.author_notifications(created_at DESC);

-- Включаем RLS
ALTER TABLE public.author_notifications ENABLE ROW LEVEL SECURITY;

-- RLS политики для уведомлений
-- Автор может просматривать свои уведомления
CREATE POLICY "Authors can view own notifications" 
  ON public.author_notifications 
  FOR SELECT 
  USING (
    author_id = auth.uid() OR
    auth.role() = 'service_role'
  );

-- Автор может обновлять свои уведомления (отмечать как прочитанные)
CREATE POLICY "Authors can update own notifications" 
  ON public.author_notifications 
  FOR UPDATE 
  USING (
    author_id = auth.uid() OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    author_id = auth.uid() OR
    auth.role() = 'service_role'
  );

-- Service role может создавать уведомления
CREATE POLICY "Service role can create notifications" 
  ON public.author_notifications 
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 5. ВЫДАЧА ПРАВ ДОСТУПА
-- ============================================

-- Права на таблицу тарифов
GRANT ALL ON public.course_pricing TO authenticated;
GRANT ALL ON public.course_pricing TO service_role;

-- Права на таблицу покупок
GRANT ALL ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;

-- Права на таблицу уведомлений
GRANT ALL ON public.author_notifications TO authenticated;
GRANT ALL ON public.author_notifications TO service_role;

-- ============================================
-- 6. ДОБАВЛЕНИЕ КОММЕНТАРИЕВ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON TABLE public.course_pricing IS 'Тарифы курсов (3 тарифа по умолчанию: Базовый, С обратной связью, Премиум)';
COMMENT ON COLUMN public.course_pricing.course_id IS 'ID курса';
COMMENT ON COLUMN public.course_pricing.name IS 'Название тарифа';
COMMENT ON COLUMN public.course_pricing.price IS 'Цена тарифа (0 для бесплатного)';
COMMENT ON COLUMN public.course_pricing.has_feedback IS 'Есть ли обратная связь от автора';
COMMENT ON COLUMN public.course_pricing.is_default IS 'Является ли тариф бесплатным по умолчанию';
COMMENT ON COLUMN public.course_pricing.order_index IS 'Порядок отображения (0, 1, 2)';

COMMENT ON TABLE public.course_purchases IS 'Покупки тарифов студентами';
COMMENT ON COLUMN public.course_purchases.course_id IS 'ID курса';
COMMENT ON COLUMN public.course_purchases.student_id IS 'ID студента';
COMMENT ON COLUMN public.course_purchases.pricing_id IS 'ID тарифа';
COMMENT ON COLUMN public.course_purchases.purchase_status IS 'Статус покупки (pending, completed, cancelled)';
COMMENT ON COLUMN public.course_purchases.payment_method IS 'Метод оплаты (test для тестовой оплаты)';
COMMENT ON COLUMN public.course_purchases.access_granted_at IS 'Дата открытия доступа';

COMMENT ON TABLE public.author_notifications IS 'Уведомления для авторов курсов';
COMMENT ON COLUMN public.author_notifications.author_id IS 'ID автора';
COMMENT ON COLUMN public.author_notifications.course_id IS 'ID курса';
COMMENT ON COLUMN public.author_notifications.student_id IS 'ID студента';
COMMENT ON COLUMN public.author_notifications.notification_type IS 'Тип уведомления (purchase_with_feedback, stream_started)';
COMMENT ON COLUMN public.author_notifications.is_read IS 'Прочитано ли уведомление';

-- ============================================
-- 7. ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Система оплаты успешно настроена!';
  RAISE NOTICE 'Добавлены поля в таблицу courses: launch_mode, stream_start_date';
  RAISE NOTICE 'Создана таблица: course_pricing (тарифы курсов)';
  RAISE NOTICE 'Создана таблица: course_purchases (покупки)';
  RAISE NOTICE 'Создана таблица: author_notifications (уведомления авторам)';
  RAISE NOTICE 'Созданы индексы: 10 индексов для оптимизации запросов';
  RAISE NOTICE 'Созданы RLS-политики: для всех новых таблиц';
END $$;

