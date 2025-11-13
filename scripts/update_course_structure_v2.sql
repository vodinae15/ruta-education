-- Обновление структуры курсов для поддержки 3-уровневой иерархии
-- Курс -> Уроки -> Блоки -> Элементы

-- Создаем новую таблицу для уроков
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    blocks JSONB DEFAULT '[]'::jsonb,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON course_lessons(course_id, order_index);

-- Обновляем таблицу courses для поддержки новой структуры
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS lesson_structure JSONB DEFAULT '{}'::jsonb;

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at в course_lessons
DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON course_lessons;
CREATE TRIGGER update_course_lessons_updated_at
    BEFORE UPDATE ON course_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Миграция существующих данных
-- Переносим блоки из modules в уроки для существующих курсов
DO $$
DECLARE
    course_record RECORD;
    lesson_id UUID;
BEGIN
    -- Для каждого курса с существующими блоками
    FOR course_record IN 
        SELECT id, modules, title 
        FROM courses 
        WHERE modules IS NOT NULL 
        AND modules::text != '{}'::text
        AND modules::text != 'null'
    LOOP
        -- Проверяем, есть ли уже уроки для этого курса
        IF NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = course_record.id) THEN
            -- Создаем урок из существующих блоков
            INSERT INTO course_lessons (course_id, title, description, order_index, blocks)
            VALUES (
                course_record.id,
                'Основной урок',
                'Автоматически созданный урок из существующих блоков',
                1,
                COALESCE(course_record.modules->'blocks', '[]'::jsonb)
            );
            
            RAISE NOTICE 'Создан урок для курса: %', course_record.title;
        END IF;
    END LOOP;
END $$;

-- Обновляем структуру для поддержки персонализации по типам авторов
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS author_type TEXT,
ADD COLUMN IF NOT EXISTS personalization_settings JSONB DEFAULT '{}'::jsonb;

-- Создаем таблицу для хранения шаблонов блоков по типам авторов
CREATE TABLE IF NOT EXISTS author_block_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_type TEXT NOT NULL,
    block_type TEXT NOT NULL,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(author_type, block_type)
);

-- Создаем индекс для быстрого поиска шаблонов
CREATE INDEX IF NOT EXISTS idx_author_templates_type ON author_block_templates(author_type, block_type);

-- Вставляем базовые шаблоны для разных типов авторов
INSERT INTO author_block_templates (author_type, block_type, template_data) VALUES
('Оратор', 'introduction', '{
    "recommended_elements": ["video", "audio", "text"],
    "hints": ["Сначала расскажите, потом оформите", "Используйте голосовой ввод"],
    "accent_button": "Добавить голосовую заметку"
}'::jsonb),
('Методист', 'introduction', '{
    "recommended_elements": ["title", "text", "image"],
    "hints": ["Создайте подробную карту урока", "Используйте чек-листы"],
    "accent_button": "Добавить план / схему"
}'::jsonb),
('Автор на вдохновении', 'introduction', '{
    "recommended_elements": ["video", "text", "image"],
    "hints": ["Используйте гибкие шаблоны", "Творческий подход приветствуется"],
    "accent_button": "Записать идею в потоке"
}'::jsonb),
('Первопроходец', 'introduction', '{
    "recommended_elements": ["video", "text", "file"],
    "hints": ["Экспериментируйте с новыми форматами", "Создавайте уникальный контент"],
    "accent_button": "Написать приветствие"
}'::jsonb),
('Загруженный эксперт', 'introduction', '{
    "recommended_elements": ["audio", "text", "title"],
    "hints": ["Используйте голосовой ввод", "Создавайте урок частями"],
    "accent_button": "Загрузить материалы"
}'::jsonb),
('Педагог с эмпатией', 'introduction', '{
    "recommended_elements": ["video", "text", "audio"],
    "hints": ["Добавьте блоки проверки понимания", "Включите FAQ"],
    "accent_button": "Добавить объяснение простыми словами"
}'::jsonb),
('Практик-рационал', 'introduction', '{
    "recommended_elements": ["text", "task", "file"],
    "hints": ["Фокусируйтесь на конкретных результатах", "Структура: проблема → решение"],
    "accent_button": "Добавить шаг"
}'::jsonb),
('Интуитивный автор', 'introduction', '{
    "recommended_elements": ["image", "video", "text"],
    "hints": ["Свобода в оформлении", "Комбинируйте разные типы контента"],
    "accent_button": "Добавить что угодно"
}'::jsonb)
ON CONFLICT (author_type, block_type) DO NOTHING;

-- Создаем представление для удобного получения данных курса с уроками
CREATE OR REPLACE VIEW course_with_lessons AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.author_id,
    c.status,
    c.is_published,
    c.author_type,
    c.personalization_settings,
    c.created_at,
    c.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', cl.id,
                'title', cl.title,
                'description', cl.description,
                'order_index', cl.order_index,
                'blocks', cl.blocks,
                'completed', cl.completed
            ) ORDER BY cl.order_index
        ) FILTER (WHERE cl.id IS NOT NULL),
        '[]'::json
    ) as lessons
FROM courses c
LEFT JOIN course_lessons cl ON c.id = cl.course_id
GROUP BY c.id, c.title, c.description, c.author_id, c.status, c.is_published, 
         c.author_type, c.personalization_settings, c.created_at, c.updated_at;

-- Создаем функцию для получения рекомендуемых элементов по типу автора
CREATE OR REPLACE FUNCTION get_recommended_elements(author_type_param TEXT, block_type_param TEXT)
RETURNS JSONB AS $$
DECLARE
    template_data JSONB;
BEGIN
    SELECT template_data INTO template_data
    FROM author_block_templates
    WHERE author_type = author_type_param AND block_type = block_type_param;
    
    IF template_data IS NULL THEN
        -- Возвращаем базовые элементы если шаблон не найден
        RETURN '{"recommended_elements": ["text", "video", "task"], "hints": ["Базовые подсказки"]}'::jsonb;
    END IF;
    
    RETURN template_data;
END;
$$ LANGUAGE plpgsql;

-- Обновляем RLS политики для новых таблиц
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- Политика для course_lessons: пользователи могут видеть только свои уроки
CREATE POLICY "Users can view their own course lessons" ON course_lessons
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE author_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert lessons for their courses" ON course_lessons
    FOR INSERT WITH CHECK (
        course_id IN (
            SELECT id FROM courses WHERE author_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own course lessons" ON course_lessons
    FOR UPDATE USING (
        course_id IN (
            SELECT id FROM courses WHERE author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own course lessons" ON course_lessons
    FOR DELETE USING (
        course_id IN (
            SELECT id FROM courses WHERE author_id = auth.uid()
        )
    );

-- Политики для author_block_templates (только чтение для всех)
ALTER TABLE author_block_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view author templates" ON author_block_templates
    FOR SELECT USING (true);

-- Создаем функцию для создания урока с базовыми блоками
CREATE OR REPLACE FUNCTION create_lesson_with_template(
    course_id_param UUID,
    lesson_title TEXT,
    lesson_description TEXT DEFAULT '',
    author_type_param TEXT DEFAULT 'standard'
)
RETURNS UUID AS $$
DECLARE
    lesson_id UUID;
    template_blocks JSONB;
BEGIN
    -- Получаем шаблон блоков для данного типа автора
    IF author_type_param != 'standard' THEN
        -- Создаем базовые блоки для персонализированного режима
        template_blocks := '[
            {
                "id": "introduction",
                "type": "introduction",
                "title": "Введение",
                "description": "Познакомьте с уроком и объясните его ценность",
                "elements": [],
                "required": true,
                "completed": false
            },
            {
                "id": "main_block_1",
                "type": "main_block_1", 
                "title": "Основной блок 1",
                "description": "Первая ключевая тема урока",
                "elements": [],
                "required": true,
                "completed": false
            },
            {
                "id": "intermediate_practice",
                "type": "intermediate_practice",
                "title": "Промежуточная практика", 
                "description": "Закрепление материала через действие",
                "elements": [],
                "required": true,
                "completed": false
            },
            {
                "id": "conclusion",
                "type": "conclusion",
                "title": "Итог и завершение",
                "description": "Подведение итогов урока", 
                "elements": [],
                "required": true,
                "completed": false
            }
        ]'::jsonb;
    ELSE
        -- Стандартные блоки
        template_blocks := '[
            {
                "id": "introduction",
                "type": "introduction",
                "title": "Введение",
                "description": "Введение в урок",
                "elements": [],
                "required": true,
                "completed": false
            },
            {
                "id": "main_content",
                "type": "main_block_1",
                "title": "Основное содержание",
                "description": "Основной материал урока",
                "elements": [],
                "required": true,
                "completed": false
            },
            {
                "id": "conclusion",
                "type": "conclusion", 
                "title": "Заключение",
                "description": "Подведение итогов",
                "elements": [],
                "required": true,
                "completed": false
            }
        ]'::jsonb;
    END IF;

    -- Создаем урок
    INSERT INTO course_lessons (course_id, title, description, order_index, blocks)
    VALUES (
        course_id_param,
        lesson_title,
        lesson_description,
        (SELECT COALESCE(MAX(order_index), 0) + 1 FROM course_lessons WHERE course_id = course_id_param),
        template_blocks
    )
    RETURNING id INTO lesson_id;

    RETURN lesson_id;
END;
$$ LANGUAGE plpgsql;

-- Создаем индексы для оптимизации производительности
CREATE INDEX IF NOT EXISTS idx_courses_author_type ON courses(author_type);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

COMMIT;
