# 📋 ПЛАН РЕАЛИЗАЦИИ НОВОЙ СИСТЕМЫ АДАПТАЦИИ КУРСОВ

## 🎯 ЦЕЛЬ

Реализовать систему адаптации курсов с сохранением адаптированного контента в БД, единым контентом для всех студентов одного типа, трехслойной структурой блоков и возможностью редактирования автором.

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### Что есть сейчас:
1. ✅ Таблица `course_lessons` с полем `blocks` (JSONB)
2. ✅ API `/api/ai-adaptation` для адаптации через ИИ
3. ✅ Компонент `UnifiedAdaptation` для отображения адаптированного контента
4. ✅ Страница адаптации для автора `/course/[courseId]/adaptation`
5. ✅ Страница изучения для студента `/course/[courseId]/learn`
6. ✅ Система определения типа студента

### Что нужно изменить:
1. ❌ Адаптированный контент не сохраняется в БД
2. ❌ Адаптация происходит "на лету" для каждого студента
3. ❌ Нет режима "Оригинал"
4. ❌ Нет переключателя режимов (Визуал/Аудиал/Кинестетик/Оригинал)
5. ❌ Нет трехслойной структуры блоков (подводка + улучшенный текст + адаптированный элемент)
6. ❌ Автор не может редактировать адаптированный контент
7. ❌ Нет системы проверки наличия материалов для адаптации
8. ❌ Нет базового отображения при недостатке материалов

---

## 🗄️ ЭТАП 1: БАЗА ДАННЫХ

### 1.1. Создание таблицы для адаптированного контента

**Файл**: `scripts/25-create-lesson-adaptations.sql`

**Задача**: Создать таблицу `lesson_adaptations` для хранения адаптированного контента уроков.

**Структура таблицы**:
```sql
CREATE TABLE IF NOT EXISTS public.lesson_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN ('visual', 'auditory', 'kinesthetic')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'edited', 'published')),
  
  -- Структура из 5 блоков
  block1 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block2 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block3 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block4 JSONB NOT NULL DEFAULT '{}'::jsonb,
  block5 JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Метаданные
  generated_at TIMESTAMP WITH TIME ZONE,
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Один урок может иметь только одну адаптацию каждого типа
  CONSTRAINT unique_lesson_adaptation_type UNIQUE (lesson_id, adaptation_type)
);
```

**Структура каждого блока (JSONB)**:
```json
{
  "intro": {
    "text": "Подводка (2-3 предложения)",
    "type": "intro"
  },
  "content": {
    "title": "Заголовок",
    "text": "Улучшенная текстовая версия (полный контент автора)",
    "sections": [
      {
        "title": "Подзаголовок",
        "content": "Содержание",
        "highlighted": ["ключевые", "термины"]
      }
    ],
    "type": "text"
  },
  "adaptation": {
    "type": "visual" | "auditory" | "kinesthetic",
    "element": {
      "type": "diagram" | "audio" | "simulation" | "table" | "story" | "interactive",
      "data": { /* данные элемента */ },
      "description": "Описание элемента"
    }
  }
}
```

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_lesson_id 
  ON public.lesson_adaptations(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_type 
  ON public.lesson_adaptations(adaptation_type);

CREATE INDEX IF NOT EXISTS idx_lesson_adaptations_status 
  ON public.lesson_adaptations(status);
```

**RLS политики**:
```sql
ALTER TABLE public.lesson_adaptations ENABLE ROW LEVEL SECURITY;

-- Авторы могут видеть адаптации своих уроков
CREATE POLICY "Authors can view adaptations for their lessons"
  ON public.lesson_adaptations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
      AND (c.author_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM public.course_collaborators cc
             WHERE cc.course_id = c.id
             AND cc.collaborator_user_id = auth.uid()
           ))
    )
  );

-- Авторы могут создавать и обновлять адаптации
CREATE POLICY "Authors can manage adaptations for their lessons"
  ON public.lesson_adaptations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
      AND (c.author_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM public.course_collaborators cc
             WHERE cc.course_id = c.id
             AND cc.collaborator_user_id = auth.uid()
           ))
    )
  );

-- Студенты могут видеть опубликованные адаптации
CREATE POLICY "Students can view published adaptations"
  ON public.lesson_adaptations
  FOR SELECT
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = lesson_adaptations.lesson_id
      AND c.status = 'published'
    )
  );
```

**Триггер для автоматического обновления `updated_at`**:
```sql
CREATE TRIGGER update_lesson_adaptations_updated_at
  BEFORE UPDATE ON public.lesson_adaptations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.2. Создание таблицы для метаданных адаптации

**Файл**: `scripts/25-create-lesson-adaptations.sql` (продолжение)

**Задача**: Создать таблицу `lesson_adaptation_metadata` для хранения метаданных о процессе адаптации.

**Структура таблицы**:
```sql
CREATE TABLE IF NOT EXISTS public.lesson_adaptation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  adaptation_type TEXT NOT NULL,
  
  -- Информация о наличии материалов
  has_audio BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT FALSE,
  has_images BOOLEAN DEFAULT FALSE,
  has_diagrams BOOLEAN DEFAULT FALSE,
  has_practice BOOLEAN DEFAULT FALSE,
  
  -- Рекомендации для автора
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Статус адаптации
  ai_generation_status TEXT DEFAULT 'pending',
  ai_generation_error TEXT,
  ai_generation_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_lesson_adaptation_metadata UNIQUE (lesson_id, adaptation_type)
);
```

### 1.3. Создание функции для проверки наличия материалов

**Файл**: `scripts/25-create-lesson-adaptations.sql` (продолжение)

**Задача**: Создать функцию для анализа урока и определения наличия материалов для адаптации.

**Функция**:
```sql
CREATE OR REPLACE FUNCTION analyze_lesson_materials(lesson_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  lesson_data RECORD;
  has_audio BOOLEAN := FALSE;
  has_video BOOLEAN := FALSE;
  has_images BOOLEAN := FALSE;
  has_diagrams BOOLEAN := FALSE;
  has_practice BOOLEAN := FALSE;
  recommendations JSONB := '[]'::jsonb;
  blocks_data JSONB;
  block JSONB;
  element JSONB;
BEGIN
  -- Получаем данные урока
  SELECT blocks INTO lesson_data
  FROM public.course_lessons
  WHERE id = lesson_id_param;
  
  IF lesson_data.blocks IS NULL THEN
    RETURN jsonb_build_object(
      'has_audio', FALSE,
      'has_video', FALSE,
      'has_images', FALSE,
      'has_diagrams', FALSE,
      'has_practice', FALSE,
      'recommendations', '[]'::jsonb
    );
  END IF;
  
  blocks_data := lesson_data.blocks;
  
  -- Анализируем блоки
  FOR block IN SELECT * FROM jsonb_array_elements(blocks_data)
  LOOP
    -- Проверяем элементы в блоке
    IF block->'elements' IS NOT NULL THEN
      FOR element IN SELECT * FROM jsonb_array_elements(block->'elements')
      LOOP
        -- Проверяем тип элемента
        IF element->>'type' = 'audio' THEN
          has_audio := TRUE;
        ELSIF element->>'type' = 'video' THEN
          has_video := TRUE;
        ELSIF element->>'type' = 'image' THEN
          has_images := TRUE;
        ELSIF element->>'type' = 'task' OR element->>'type' = 'test' THEN
          has_practice := TRUE;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Формируем рекомендации
  IF NOT has_audio THEN
    recommendations := recommendations || '{"type": "audio", "message": "Добавьте аудио для усиления опыта аудиалов"}'::jsonb;
  END IF;
  
  IF NOT has_video AND NOT has_images THEN
    recommendations := recommendations || '{"type": "visual", "message": "Добавьте схемы или изображения для визуалов"}'::jsonb;
  END IF;
  
  IF NOT has_practice THEN
    recommendations := recommendations || '{"type": "practice", "message": "Добавьте практические задания для кинестетиков"}'::jsonb;
  END IF;
  
  RETURN jsonb_build_object(
    'has_audio', has_audio,
    'has_video', has_video,
    'has_images', has_images,
    'has_diagrams', has_diagrams,
    'has_practice', has_practice,
    'recommendations', recommendations
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 ЭТАП 2: ОБНОВЛЕНИЕ API АДАПТАЦИИ

### 2.1. Обновление API `/api/ai-adaptation`

**Файл**: `app/api/ai-adaptation/route.ts`

**Задачи**:
1. Обновить промпты для генерации трехслойной структуры блоков
2. Добавить логику сохранения адаптированного контента в БД
3. Добавить проверку наличия существующей адаптации
4. Обновить формат ответа ИИ для поддержки новой структуры

**Изменения**:

#### 2.1.1. Обновление интерфейсов

```typescript
interface AdaptationBlock {
  intro: {
    text: string
    type: 'intro'
  }
  content: {
    title: string
    text: string
    sections?: Array<{
      title: string
      content: string
      highlighted?: string[]
    }>
    type: 'text'
  }
  adaptation: {
    type: 'visual' | 'auditory' | 'kinesthetic'
    element: {
      type: 'diagram' | 'audio' | 'simulation' | 'table' | 'story' | 'interactive' | 'checklist'
      data: any
      description: string
    }
  }
}

interface AdaptationContent {
  block1: AdaptationBlock
  block2: AdaptationBlock
  block3: AdaptationBlock
  block4: AdaptationBlock
  block5: AdaptationBlock
}

interface AdaptationRequest {
  lessonContent: LessonContent
  studentType: 'visual' | 'auditory' | 'kinesthetic'
  lessonId: string
  saveToDatabase?: boolean // Флаг сохранения в БД
  forceRegenerate?: boolean // Флаг принудительной регенерации
}
```

#### 2.1.2. Обновление промптов для трехслойной структуры

**Для визуала**:
```typescript
const getVisualAdaptationPrompt = (lessonContent: LessonContent): string => {
  return `
Ты - эксперт по адаптации образовательного контента для визуалов.

ИСХОДНЫЙ КОНТЕНТ УРОКА:
Название: ${lessonContent.title}
Описание: ${lessonContent.description || 'Не указано'}
Блоки урока:
${lessonContent.blocks.map((block, index) => `${index + 1}. ${block.title}: ${block.content}`).join('\n')}

ЗАДАЧА: Адаптировать этот контент под визуальный тип восприятия, создав 5 блоков с трехслойной структурой.

СТРУКТУРА КАЖДОГО БЛОКА:
1. Подводка (intro) - 2-3 предложения, объясняющие что будет происходить
2. Улучшенная текстовая версия (content) - полный контент автора, структурированный с заголовками, списками, выделениями
3. Адаптированный элемент (adaptation) - схема, диаграмма, таблица или инфографика, которая визуализирует содержание текста

БЛОК 1 - Обзор темы:
- Подводка: "В этом уроке вы изучите [тема]. Ниже вы найдёте карту урока..."
- Контент: Структурированный список того, что будет изучено
- Адаптация: Концептуальная карта урока (интерактивная схема)

БЛОК 2 - Основы темы:
- Подводка: "Теперь разберём ключевые концепции..."
- Контент: Теория, разбитая на подблоки с заголовками, списками, выделениями
- Адаптация: Сравнительная таблица или иерархическая схема понятий

БЛОК 3 - Практическое закрепление:
- Подводка: "Проверьте понимание через визуальное задание..."
- Контент: Описание задания и объяснение правильных ответов
- Адаптация: Визуальный тест (drag-and-drop, маркировка схемы, классификация)

БЛОК 4 - Углублённое изучение:
- Подводка: "Теперь углубимся в тему..."
- Контент: Дополнительная теория и кейсы, структурированные с подзаголовками
- Адаптация: Многослойная инфографика или интерактивная схема

БЛОК 5 - Итоговое задание:
- Подводка: "Создайте собственную схему..."
- Контент: Инструкция к заданию и критерии оценки
- Адаптация: Конструктор схемы или визуализации

ВАЖНО:
- Текстовая версия должна содержать ВЕСЬ контент автора, только структурированный
- Адаптированный элемент НЕ заменяет текст, а дополняет его визуализацией
- Схемы должны быть описаны в текстовом формате (можно использовать ASCII-арт или JSON-структуру)

Верни результат в формате JSON:
{
  "block1": {
    "intro": {
      "text": "Подводка (2-3 предложения)",
      "type": "intro"
    },
    "content": {
      "title": "Содержание урока",
      "text": "Полный текст контента автора, структурированный",
      "sections": [
        {
          "title": "Подзаголовок",
          "content": "Содержание",
          "highlighted": ["ключевые", "термины"]
        }
      ],
      "type": "text"
    },
    "adaptation": {
      "type": "visual",
      "element": {
        "type": "diagram",
        "data": {
          "nodes": [
            {"id": "node1", "label": "Узел 1", "position": {"x": 100, "y": 100}},
            {"id": "node2", "label": "Узел 2", "position": {"x": 300, "y": 100}}
          ],
          "connections": [
            {"from": "node1", "to": "node2", "label": "Связь"}
          ]
        },
        "description": "Описание схемы"
      }
    }
  },
  "block2": { /* аналогично */ },
  "block3": { /* аналогично */ },
  "block4": { /* аналогично */ },
  "block5": { /* аналогично */ }
}
`
}
```

**Аналогично для аудиала и кинестетика** с соответствующими адаптированными элементами.

#### 2.1.3. Добавление логики сохранения в БД

```typescript
// После получения адаптированного контента от ИИ
if (saveToDatabase) {
  // Проверяем, существует ли уже адаптация
  const { data: existingAdaptation } = await supabase
    .from('lesson_adaptations')
    .select('id, status')
    .eq('lesson_id', lessonId)
    .eq('adaptation_type', studentType)
    .single()

  if (existingAdaptation && !forceRegenerate) {
    // Обновляем существующую адаптацию
    const { error: updateError } = await supabase
      .from('lesson_adaptations')
      .update({
        block1: adaptedContent.block1,
        block2: adaptedContent.block2,
        block3: adaptedContent.block3,
        block4: adaptedContent.block4,
        block5: adaptedContent.block5,
        status: 'generated',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingAdaptation.id)

    if (updateError) {
      console.error('Error updating adaptation:', updateError)
      return NextResponse.json(
        { success: false, error: 'Ошибка при сохранении адаптации' },
        { status: 500 }
      )
    }
  } else {
    // Создаем новую адаптацию
    const { error: insertError } = await supabase
      .from('lesson_adaptations')
      .insert({
        lesson_id: lessonId,
        adaptation_type: studentType,
        block1: adaptedContent.block1,
        block2: adaptedContent.block2,
        block3: adaptedContent.block3,
        block4: adaptedContent.block4,
        block5: adaptedContent.block5,
        status: 'generated',
        generated_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error creating adaptation:', insertError)
      return NextResponse.json(
        { success: false, error: 'Ошибка при сохранении адаптации' },
        { status: 500 }
      )
    }
  }

  // Обновляем метаданные
  const materialsAnalysis = await analyzeLessonMaterials(lessonId)
  await supabase
    .from('lesson_adaptation_metadata')
    .upsert({
      lesson_id: lessonId,
      adaptation_type: studentType,
      has_audio: materialsAnalysis.has_audio,
      has_video: materialsAnalysis.has_video,
      has_images: materialsAnalysis.has_images,
      has_practice: materialsAnalysis.has_practice,
      recommendations: materialsAnalysis.recommendations,
      ai_generation_status: 'completed',
      ai_generation_timestamp: new Date().toISOString()
    }, {
      onConflict: 'lesson_id,adaptation_type'
    })
}
```

### 2.2. Создание API для получения адаптированного контента

**Файл**: `app/api/lesson-adaptation/route.ts` (новый)

**Задачи**:
1. GET - получить адаптированный контент урока
2. PUT - обновить адаптированный контент (для автора)
3. POST - запустить генерацию адаптации

**Структура API**:

```typescript
// GET /api/lesson-adaptation?lessonId=xxx&type=visual
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get('lessonId')
  const type = searchParams.get('type') as 'visual' | 'auditory' | 'kinesthetic'

  // Получаем адаптацию из БД
  const { data: adaptation, error } = await supabase
    .from('lesson_adaptations')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('adaptation_type', type)
    .single()

  if (error || !adaptation) {
    return NextResponse.json(
      { success: false, error: 'Адаптация не найдена' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    adaptation: {
      block1: adaptation.block1,
      block2: adaptation.block2,
      block3: adaptation.block3,
      block4: adaptation.block4,
      block5: adaptation.block5,
      status: adaptation.status
    }
  })
}

// PUT /api/lesson-adaptation
export async function PUT(request: NextRequest) {
  const { lessonId, type, blocks } = await request.json()

  // Проверяем права доступа (автор или соавтор)
  // ... проверка прав ...

  // Обновляем адаптацию
  const { error } = await supabase
    .from('lesson_adaptations')
    .update({
      block1: blocks.block1,
      block2: blocks.block2,
      block3: blocks.block3,
      block4: blocks.block4,
      block5: blocks.block5,
      status: 'edited',
      edited_at: new Date().toISOString(),
      edited_by: user.id,
      version: adaptation.version + 1
    })
    .eq('lesson_id', lessonId)
    .eq('adaptation_type', type)

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при сохранении' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

// POST /api/lesson-adaptation/generate
export async function POST(request: NextRequest) {
  const { lessonId, type, forceRegenerate } = await request.json()

  // Запускаем генерацию через /api/ai-adaptation
  // ... логика генерации ...
}
```

### 2.3. Создание API для анализа материалов урока

**Файл**: `app/api/lesson-materials/route.ts` (новый)

**Задачи**:
1. Анализировать урок на наличие материалов
2. Возвращать рекомендации для автора

```typescript
// GET /api/lesson-materials?lessonId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get('lessonId')

  // Вызываем функцию БД для анализа
  const { data, error } = await supabase.rpc('analyze_lesson_materials', {
    lesson_id_param: lessonId
  })

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при анализе' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    materials: data
  })
}
```

---

## 🎨 ЭТАП 3: ОБНОВЛЕНИЕ КОМПОНЕНТОВ ОТОБРАЖЕНИЯ

### 3.1. Создание переключателя режимов

**Файл**: `components/ui/adaptation-mode-switcher.tsx` (новый)

**Задачи**:
1. Создать компонент с 4 вкладками: Визуал / Аудиал / Кинестетик / Оригинал
2. Реализовать визуальную индикацию активного режима
3. Сохранять выбранный режим в состоянии

**Структура компонента**:
```typescript
interface AdaptationModeSwitcherProps {
  currentMode: 'visual' | 'auditory' | 'kinesthetic' | 'original'
  onModeChange: (mode: 'visual' | 'auditory' | 'kinesthetic' | 'original') => void
  availableModes?: ('visual' | 'auditory' | 'kinesthetic' | 'original')[]
  studentType?: string // Для автоподстановки режима студента
}

export function AdaptationModeSwitcher({
  currentMode,
  onModeChange,
  availableModes = ['visual', 'auditory', 'kinesthetic', 'original'],
  studentType
}: AdaptationModeSwitcherProps) {
  // Реализация переключателя с вкладками
}
```

### 3.2. Обновление компонента UnifiedAdaptation

**Файл**: `components/ui/unified-adaptation.tsx`

**Задачи**:
1. Обновить интерфейс для поддержки трехслойной структуры блоков
2. Добавить рендеринг подводки, улучшенного текста и адаптированного элемента
3. Добавить поддержку режима "Оригинал"
4. Добавить базовое отображение при недостатке материалов

**Изменения**:

#### 3.2.1. Обновление интерфейсов

```typescript
interface AdaptationBlock {
  intro: {
    text: string
    type: 'intro'
  }
  content: {
    title: string
    text: string
    sections?: Array<{
      title: string
      content: string
      highlighted?: string[]
    }>
    type: 'text'
  }
  adaptation: {
    type: 'visual' | 'auditory' | 'kinesthetic'
    element: {
      type: 'diagram' | 'audio' | 'simulation' | 'table' | 'story' | 'interactive' | 'checklist'
      data: any
      description: string
    }
  }
}

interface UnifiedAdaptationProps {
  mode: 'visual' | 'auditory' | 'kinesthetic' | 'original'
  lessonTitle: string
  adaptedContent?: {
    block1: AdaptationBlock
    block2: AdaptationBlock
    block3: AdaptationBlock
    block4: AdaptationBlock
    block5: AdaptationBlock
  }
  originalContent?: {
    blocks: Array<{
      title: string
      content: string
      type: string
    }>
  }
  isStudent?: boolean
  courseId?: string
  lessonId?: string
  onProgressUpdate?: (progress: number, completedBlocks: string[]) => void
  onSaveProgress?: (data: any) => void
  materialsAnalysis?: {
    has_audio: boolean
    has_video: boolean
    has_images: boolean
    has_practice: boolean
    recommendations: Array<{
      type: string
      message: string
    }>
  }
}
```

#### 3.2.2. Добавление рендеринга трехслойной структуры

```typescript
function renderBlock(block: AdaptationBlock, blockId: string, blockNumber: number) {
  return (
    <Card key={blockId} className="mb-6">
      <CardHeader>
        <CardTitle>Блок {blockNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Слой 1: Подводка */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-blue-800 italic">{block.intro.text}</p>
        </div>

        {/* Слой 2: Улучшенная текстовая версия */}
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-3">{block.content.title}</h3>
          <div className="prose prose-slate max-w-none">
            <p>{block.content.text}</p>
            {block.content.sections?.map((section, index) => (
              <div key={index} className="mt-4">
                <h4 className="text-lg font-semibold mb-2">{section.title}</h4>
                <p>{section.content}</p>
                {section.highlighted && (
                  <div className="mt-2">
                    <strong>Ключевые термины: </strong>
                    {section.highlighted.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Слой 3: Адаптированный элемент */}
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-3">Адаптированный элемент</h4>
          {renderAdaptationElement(block.adaptation.element)}
        </div>
      </CardContent>
    </Card>
  )
}

function renderAdaptationElement(element: {
  type: string
  data: any
  description: string
}) {
  switch (element.type) {
    case 'diagram':
      return <InteractiveDiagram data={element.data} description={element.description} />
    case 'audio':
      return <AudioPlayer src={element.data.src} description={element.description} />
    case 'simulation':
      return <Simulation data={element.data} description={element.description} />
    case 'table':
      return <ComparisonTable data={element.data} description={element.description} />
    case 'story':
      return <StoryContent data={element.data} description={element.description} />
    case 'interactive':
      return <InteractiveElement data={element.data} description={element.description} />
    case 'checklist':
      return <Checklist data={element.data} description={element.description} />
    default:
      return <div>{element.description}</div>
  }
}
```

#### 3.2.3. Добавление режима "Оригинал"

```typescript
function renderOriginalContent(originalContent: {
  blocks: Array<{
    title: string
    content: string
    type: string
  }>
}) {
  return (
    <div className="space-y-6">
      {originalContent.blocks.map((block, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <p>{block.content}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

#### 3.2.4. Добавление базового отображения при недостатке материалов

```typescript
function renderBasicContent(
  originalContent: any,
  mode: 'visual' | 'auditory' | 'kinesthetic',
  materialsAnalysis: {
    has_audio: boolean
    has_video: boolean
    has_images: boolean
    has_practice: boolean
    recommendations: Array<{
      type: string
      message: string
    }>
  }
) {
  // Определяем, какие материалы отсутствуют
  const missingMaterials = materialsAnalysis.recommendations.filter(rec => {
    if (mode === 'auditory' && rec.type === 'audio') return true
    if (mode === 'visual' && rec.type === 'visual') return true
    if (mode === 'kinesthetic' && rec.type === 'practice') return true
    return false
  })

  return (
    <div className="space-y-6">
      {/* Показываем оригинальный контент */}
      <div className="prose prose-slate max-w-none">
        {renderOriginalContent(originalContent)}
      </div>

      {/* Показываем рекомендации для автора (только для автора, не для студента) */}
      {missingMaterials.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">
              Рекомендации по улучшению контента
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {missingMaterials.map((rec, index) => (
                <li key={index} className="text-yellow-700">{rec.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### 3.3. Создание компонентов для адаптированных элементов

**Файлы**:
- `components/ui/adaptation-elements/visual-diagram.tsx` (новый)
- `components/ui/adaptation-elements/audio-player.tsx` (новый)
- `components/ui/adaptation-elements/interactive-simulation.tsx` (новый)
- `components/ui/adaptation-elements/comparison-table.tsx` (новый)
- `components/ui/adaptation-elements/story-content.tsx` (новый)
- `components/ui/adaptation-elements/interactive-element.tsx` (новый)
- `components/ui/adaptation-elements/checklist.tsx` (новый)

**Задачи**: Создать специализированные компоненты для каждого типа адаптированного элемента.

---

## 📝 ЭТАП 4: ОБНОВЛЕНИЕ СТРАНИЦЫ АДАПТАЦИИ ДЛЯ АВТОРА

### 4.1. Обновление страницы адаптации

**Файл**: `app/course/[courseId]/adaptation/page.tsx`

**Задачи**:
1. Добавить переключатель режимов (Визуал / Аудиал / Кинестетик / Оригинал)
2. Добавить возможность редактирования адаптированного контента
3. Добавить кнопку сохранения изменений
4. Добавить отображение рекомендаций по материалам
5. Добавить возможность запуска генерации адаптации для всех типов

**Изменения**:

#### 4.1.1. Добавление состояния для редактирования

```typescript
const [editingMode, setEditingMode] = useState<'view' | 'edit'>('view')
const [editedContent, setEditedContent] = useState<AdaptationContent | null>(null)
const [currentBlock, setCurrentBlock] = useState<string | null>(null)
```

#### 4.1.2. Добавление редактора блоков

```typescript
function BlockEditor({
  block,
  blockId,
  onSave,
  onCancel
}: {
  block: AdaptationBlock
  blockId: string
  onSave: (block: AdaptationBlock) => void
  onCancel: () => void
}) {
  const [editedBlock, setEditedBlock] = useState<AdaptationBlock>(block)

  return (
    <div className="space-y-4">
      {/* Редактор подводки */}
      <div>
        <Label>Подводка (2-3 предложения)</Label>
        <Textarea
          value={editedBlock.intro.text}
          onChange={(e) => setEditedBlock({
            ...editedBlock,
            intro: { ...editedBlock.intro, text: e.target.value }
          })}
          rows={3}
        />
      </div>

      {/* Редактор контента */}
      <div>
        <Label>Заголовок</Label>
        <Input
          value={editedBlock.content.title}
          onChange={(e) => setEditedBlock({
            ...editedBlock,
            content: { ...editedBlock.content, title: e.target.value }
          })}
        />
      </div>

      <div>
        <Label>Текст</Label>
        <Textarea
          value={editedBlock.content.text}
          onChange={(e) => setEditedBlock({
            ...editedBlock,
            content: { ...editedBlock.content, text: e.target.value }
          })}
          rows={10}
        />
      </div>

      {/* Редактор адаптированного элемента */}
      <div>
        <Label>Описание адаптированного элемента</Label>
        <Textarea
          value={editedBlock.adaptation.element.description}
          onChange={(e) => setEditedBlock({
            ...editedBlock,
            adaptation: {
              ...editedBlock.adaptation,
              element: {
                ...editedBlock.adaptation.element,
                description: e.target.value
              }
            }
          })}
          rows={5}
        />
      </div>

      {/* Кнопки сохранения */}
      <div className="flex gap-2">
        <Button onClick={() => onSave(editedBlock)}>Сохранить</Button>
        <Button variant="outline" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  )
}
```

#### 4.1.3. Добавление логики сохранения

```typescript
const handleSaveAdaptation = async () => {
  if (!editedContent || !selectedLesson) return

  try {
    const response = await fetch('/api/lesson-adaptation', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId: selectedLesson.id,
        type: activeTab,
        blocks: editedContent
      })
    })

    if (response.ok) {
      toast({
        title: 'Успешно',
        description: 'Адаптация сохранена'
      })
      setEditingMode('view')
      // Обновляем данные
      loadAdaptations()
    } else {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить адаптацию',
        variant: 'destructive'
      })
    }
  } catch (error) {
    console.error('Error saving adaptation:', error)
    toast({
      title: 'Ошибка',
      description: 'Не удалось сохранить адаптацию',
      variant: 'destructive'
    })
  }
}
```

### 4.2. Добавление анализа материалов

**Задачи**:
1. Загружать анализ материалов при открытии страницы
2. Отображать рекомендации для автора
3. Показывать, какие материалы отсутствуют

```typescript
const [materialsAnalysis, setMaterialsAnalysis] = useState<any>(null)

useEffect(() => {
  if (selectedLesson) {
    loadMaterialsAnalysis(selectedLesson.id)
  }
}, [selectedLesson])

const loadMaterialsAnalysis = async (lessonId: string) => {
  try {
    const response = await fetch(`/api/lesson-materials?lessonId=${lessonId}`)
    if (response.ok) {
      const data = await response.json()
      setMaterialsAnalysis(data.materials)
    }
  } catch (error) {
    console.error('Error loading materials analysis:', error)
  }
}
```

---

## 🎓 ЭТАП 5: ОБНОВЛЕНИЕ СТРАНИЦЫ ИЗУЧЕНИЯ ДЛЯ СТУДЕНТА

### 5.1. Обновление страницы изучения

**Файл**: `app/course/[courseId]/learn/page.tsx`

**Задачи**:
1. Добавить переключатель режимов (Визуал / Аудиал / Кинестетик / Оригинал)
2. Загружать адаптированный контент из БД вместо генерации "на лету"
3. Режим "Оригинал" по умолчанию при первом открытии
4. Сохранять выбранный режим в локальном хранилище
5. Показывать базовый контент при отсутствии адаптации

**Изменения**:

#### 5.1.1. Добавление состояния для режима

```typescript
const [currentMode, setCurrentMode] = useState<'visual' | 'auditory' | 'kinesthetic' | 'original'>('original')
const [adaptedContent, setAdaptedContent] = useState<AdaptationContent | null>(null)
const [loadingAdaptation, setLoadingAdaptation] = useState(false)
```

#### 5.1.2. Загрузка адаптированного контента из БД

```typescript
const loadAdaptedContent = async (lessonId: string, mode: 'visual' | 'auditory' | 'kinesthetic') => {
  if (mode === 'original') {
    setAdaptedContent(null)
    return
  }

  setLoadingAdaptation(true)
  try {
    const response = await fetch(`/api/lesson-adaptation?lessonId=${lessonId}&type=${mode}`)
    if (response.ok) {
      const data = await response.json()
      setAdaptedContent(data.adaptation)
    } else {
      // Если адаптация не найдена, показываем базовый контент
      console.log('Адаптация не найдена, показываем базовый контент')
      setAdaptedContent(null)
    }
  } catch (error) {
    console.error('Error loading adaptation:', error)
    setAdaptedContent(null)
  } finally {
    setLoadingAdaptation(false)
  }
}

useEffect(() => {
  if (currentLessonData && currentMode !== 'original') {
    loadAdaptedContent(currentLessonData.id, currentMode)
  }
}, [currentLessonData, currentMode])
```

#### 5.1.3. Сохранение выбранного режима

```typescript
useEffect(() => {
  // Сохраняем выбранный режим в локальное хранилище
  localStorage.setItem(`adaptation_mode_${params.courseId}`, currentMode)
}, [currentMode, params.courseId])

useEffect(() => {
  // Загружаем сохраненный режим при загрузке страницы
  const savedMode = localStorage.getItem(`adaptation_mode_${params.courseId}`)
  if (savedMode && ['visual', 'auditory', 'kinesthetic', 'original'].includes(savedMode)) {
    setCurrentMode(savedMode as 'visual' | 'auditory' | 'kinesthetic' | 'original')
  } else {
    // Если режим не сохранен, используем тип студента или "original"
    if (studentSession?.student_type) {
      const studentType = studentSession.student_type
      if (studentType.includes('visual')) {
        setCurrentMode('visual')
      } else if (studentType.includes('auditory')) {
        setCurrentMode('auditory')
      } else if (studentType.includes('kinesthetic')) {
        setCurrentMode('kinesthetic')
      } else {
        setCurrentMode('original')
      }
    } else {
      setCurrentMode('original')
    }
  }
}, [studentSession, params.courseId])
```

#### 5.1.4. Добавление переключателя режимов

```typescript
<AdaptationModeSwitcher
  currentMode={currentMode}
  onModeChange={setCurrentMode}
  studentType={studentSession?.student_type}
/>
```

#### 5.1.5. Обновление отображения контента

```typescript
{currentMode === 'original' ? (
  <div className="prose prose-slate max-w-none">
    {renderOriginalContent(currentLessonData)}
  </div>
) : (
  <UnifiedAdaptation
    mode={currentMode}
    lessonTitle={currentLessonData.title}
    adaptedContent={adaptedContent}
    originalContent={currentLessonData}
    isStudent={true}
    courseId={params.courseId}
    lessonId={currentLessonData.id}
    onProgressUpdate={(progress, completedBlocks) => {
      // Обновление прогресса
    }}
    onSaveProgress={async (progressData) => {
      // Сохранение прогресса
    }}
    materialsAnalysis={materialsAnalysis}
  />
)}
```

---

## 🔄 ЭТАП 6: ОБНОВЛЕНИЕ ЛОГИКИ АДАПТАЦИИ

### 6.1. Обновление логики генерации адаптации

**Файл**: `lib/adaptation-logic.ts` (новый)

**Задачи**:
1. Создать утилиты для работы с адаптациями
2. Добавить функции для проверки наличия адаптации
3. Добавить функции для автоматической генерации адаптации
4. Добавить функции для нормализации типов студентов

**Структура**:
```typescript
// Нормализация типа студента
export function normalizeStudentType(studentType: string): 'visual' | 'auditory' | 'kinesthetic' {
  if (studentType.includes('visual')) return 'visual'
  if (studentType.includes('auditory')) return 'auditory'
  if (studentType.includes('kinesthetic')) return 'kinesthetic'
  return 'visual' // По умолчанию
}

// Проверка наличия адаптации
export async function checkAdaptationExists(
  lessonId: string,
  type: 'visual' | 'auditory' | 'kinesthetic'
): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lesson_adaptations')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('adaptation_type', type)
    .eq('status', 'published')
    .single()

  return !error && !!data
}

// Автоматическая генерация адаптации при публикации курса
export async function generateAdaptationsForLesson(
  lessonId: string,
  lessonContent: any
): Promise<void> {
  const types: ('visual' | 'auditory' | 'kinesthetic')[] = ['visual', 'auditory', 'kinesthetic']

  for (const type of types) {
    // Проверяем, существует ли уже адаптация
    const exists = await checkAdaptationExists(lessonId, type)
    if (exists) continue

    // Генерируем адаптацию
    try {
      const response = await fetch('/api/ai-adaptation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonContent,
          studentType: type,
          lessonId,
          saveToDatabase: true
        })
      })

      if (!response.ok) {
        console.error(`Error generating adaptation for ${type}:`, response.statusText)
      }
    } catch (error) {
      console.error(`Error generating adaptation for ${type}:`, error)
    }
  }
}
```

### 6.2. Обновление логики публикации курса

**Файл**: `app/course-constructor/page.tsx`

**Задачи**:
1. При публикации курса автоматически генерировать адаптации для всех уроков
2. Показывать прогресс генерации адаптаций

**Изменения**:
```typescript
const publishCourse = async () => {
  // ... существующая логика публикации ...

  // После публикации генерируем адаптации
  if (courseLessons.length > 0) {
    toast({
      title: 'Генерация адаптаций',
      description: 'Начинаем генерацию адаптаций для всех уроков...'
    })

    for (const lesson of courseLessons) {
      await generateAdaptationsForLesson(lesson.id, {
        title: lesson.title,
        description: lesson.description,
        blocks: lesson.blocks
      })
    }

    toast({
      title: 'Успешно',
      description: 'Адаптации сгенерированы для всех уроков'
    })
  }
}
```

---

## 🎯 ЭТАП 7: ОБНОВЛЕНИЕ ПРОМПТОВ ДЛЯ ИИ

### 7.1. Обновление промптов для трехслойной структуры

**Файл**: `app/api/ai-adaptation/route.ts`

**Задачи**:
1. Обновить все промпты для поддержки трехслойной структуры
2. Добавить инструкции по сохранению полного контента автора
3. Добавить инструкции по созданию адаптированных элементов

**Изменения**: См. раздел 2.1.2.

### 7.2. Добавление валидации ответа ИИ

**Задачи**:
1. Проверять наличие всех трех слоев в каждом блоке
2. Проверять наличие всех 5 блоков
3. Валидировать структуру данных

```typescript
function validateAdaptationContent(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Проверяем наличие всех 5 блоков
  const requiredBlocks = ['block1', 'block2', 'block3', 'block4', 'block5']
  for (const blockId of requiredBlocks) {
    if (!content[blockId]) {
      errors.push(`Отсутствует блок ${blockId}`)
      continue
    }

    const block = content[blockId]

    // Проверяем наличие подводки
    if (!block.intro || !block.intro.text) {
      errors.push(`В блоке ${blockId} отсутствует подводка`)
    }

    // Проверяем наличие контента
    if (!block.content || !block.content.text) {
      errors.push(`В блоке ${blockId} отсутствует контент`)
    }

    // Проверяем наличие адаптированного элемента
    if (!block.adaptation || !block.adaptation.element) {
      errors.push(`В блоке ${blockId} отсутствует адаптированный элемент`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

---

## 🔍 ЭТАП 8: ОБРАБОТКА ПРАКТИКИ И ТЕСТОВ

### 8.1. Разделение практики и тестов

**Задачи**:
1. Практические задания внутри урока адаптируются под тип восприятия
2. Итоговые тесты остаются одинаковыми для всех типов
3. Только подача итоговых тестов может адаптироваться (озвучка текста)

**Изменения**:

#### 8.1.1. Обновление структуры блоков

В блоке 3 (Практическое закрепление) адаптированный элемент может быть:
- Для визуала: визуальный тест (drag-and-drop, маркировка схемы)
- Для аудиала: аудио-диалог с вопросами
- Для кинестетика: интерактивная симуляция

#### 8.1.2. Создание компонента для итоговых тестов

**Файл**: `components/ui/final-test.tsx` (новый)

**Задачи**:
1. Отображать итоговые тесты одинаково для всех типов
2. Только подача может адаптироваться (озвучка для аудиалов)

```typescript
interface FinalTestProps {
  test: {
    questions: Array<{
      id: string
      question: string
      options: Array<{
        id: string
        text: string
      }>
      correctAnswer: string
    }>
  }
  studentType: string
  onComplete: (results: any) => void
}

export function FinalTest({ test, studentType, onComplete }: FinalTestProps) {
  // Отображаем тест одинаково для всех типов
  // Только добавляем озвучку для аудиалов, если нужно
  const hasAudio = studentType.includes('auditory')

  return (
    <div className="space-y-6">
      {test.questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle>Вопрос {index + 1}</CardTitle>
            {hasAudio && (
              <Button onClick={() => playAudio(question.question)}>
                <VolumeIcon /> Озвучить вопрос
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p>{question.question}</p>
            <div className="space-y-2 mt-4">
              {question.options.map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  onClick={() => handleAnswer(question.id, option.id)}
                >
                  {option.text}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 📊 ЭТАП 9: МИГРАЦИЯ ДАННЫХ

### 9.1. Создание скрипта миграции

**Файл**: `scripts/25-create-lesson-adaptations.sql`

**Задачи**:
1. Создать таблицы для адаптаций
2. Создать функции для анализа материалов
3. Создать индексы для оптимизации
4. Создать RLS политики

**Содержание**: См. раздел 1.1-1.3.

### 9.2. Создание скрипта для генерации адаптаций существующих уроков

**Файл**: `scripts/26-generate-adaptations-for-existing-lessons.sql`

**Задачи**:
1. Найти все опубликованные уроки
2. Для каждого урока запустить генерацию адаптаций через API
3. Сохранить результаты в БД

**Примечание**: Этот скрипт должен выполняться вручную или через админ-панель, так как требует вызова API ИИ.

---

## 🎨 ЭТАП 10: UI/UX УЛУЧШЕНИЯ

### 10.1. Добавление индикаторов загрузки

**Задачи**:
1. Показывать индикатор загрузки при генерации адаптации
2. Показывать прогресс генерации для всех типов
3. Показывать статус адаптации (pending, generated, edited, published)

### 10.2. Добавление уведомлений

**Задачи**:
1. Уведомлять автора о завершении генерации адаптации
2. Уведомлять автора о рекомендациях по материалам
3. Уведомлять студента о доступности адаптированного контента

### 10.3. Добавление подсказок

**Задачи**:
1. Показывать подсказки для автора при отсутствии материалов
2. Показывать подсказки для студентов при переключении режимов
3. Добавить тултипы с объяснениями режимов

---

## 🧪 ЭТАП 11: ТЕСТИРОВАНИЕ

### 11.1. Тестирование генерации адаптаций

**Задачи**:
1. Проверить генерацию адаптаций для всех типов
2. Проверить сохранение адаптаций в БД
3. Проверить валидацию структуры данных

### 11.2. Тестирование отображения контента

**Задачи**:
1. Проверить отображение трехслойной структуры блоков
2. Проверить переключение режимов
3. Проверить режим "Оригинал"
4. Проверить базовое отображение при отсутствии материалов

### 11.3. Тестирование редактирования

**Задачи**:
1. Проверить редактирование адаптированного контента автором
2. Проверить сохранение изменений
3. Проверить отображение изменений для студентов

### 11.4. Тестирование производительности

**Задачи**:
1. Проверить скорость загрузки адаптированного контента
2. Проверить скорость генерации адаптаций
3. Проверить оптимизацию запросов к БД

---

## 📝 ЭТАП 12: ДОКУМЕНТАЦИЯ

### 12.1. Обновление документации

**Задачи**:
1. Обновить `PROJECT_STRUCTURE.md` с новой структурой адаптаций
2. Обновить `AI_ADAPTATION_LOGIC.md` с новым процессом
3. Создать `ADAPTATION_EDITOR_GUIDE.md` для авторов
4. Создать `ADAPTATION_STUDENT_GUIDE.md` для студентов

### 12.2. Создание примеров

**Задачи**:
1. Создать примеры адаптированного контента для каждого типа
2. Создать примеры редактирования адаптаций
3. Создать примеры использования API

---

## 🚀 ПОРЯДОК ВЫПОЛНЕНИЯ ЭТАПОВ

### Фаза 1: База данных и API (Этапы 1-2)
1. ✅ Создать таблицы для адаптаций
2. ✅ Создать функции для анализа материалов
3. ✅ Обновить API адаптации
4. ✅ Создать API для получения адаптаций
5. ✅ Создать API для редактирования адаптаций

### Фаза 2: Компоненты отображения (Этапы 3-4)
1. ✅ Создать переключатель режимов
2. ✅ Обновить компонент UnifiedAdaptation
3. ✅ Создать компоненты для адаптированных элементов
4. ✅ Обновить страницу адаптации для автора
5. ✅ Добавить редактор блоков

### Фаза 3: Интеграция для студентов (Этап 5)
1. ✅ Обновить страницу изучения для студентов
2. ✅ Добавить загрузку адаптаций из БД
3. ✅ Добавить переключатель режимов
4. ✅ Добавить сохранение выбранного режима

### Фаза 4: Логика и автоматизация (Этапы 6-7)
1. ✅ Обновить логику генерации адаптаций
2. ✅ Добавить автоматическую генерацию при публикации
3. ✅ Обновить промпты для ИИ
4. ✅ Добавить валидацию ответов ИИ

### Фаза 5: Обработка практики и тестов (Этап 8)
1. ✅ Разделить практику и тесты
2. ✅ Адаптировать практику под типы восприятия
3. ✅ Оставить тесты одинаковыми для всех типов

### Фаза 6: Миграция и тестирование (Этапы 9-11)
1. ✅ Выполнить миграцию БД
2. ✅ Сгенерировать адаптации для существующих уроков
3. ✅ Протестировать все функции
4. ✅ Исправить найденные ошибки

### Фаза 7: Документация (Этап 12)
1. ✅ Обновить документацию
2. ✅ Создать руководства для пользователей
3. ✅ Создать примеры использования

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. Обратная совместимость
- Существующие уроки должны продолжать работать
- Если адаптация не найдена, показывать оригинальный контент
- Не удалять существующие данные

### 2. Производительность
- Кэшировать адаптированный контент в БД
- Оптимизировать запросы к БД
- Использовать индексы для быстрого поиска

### 3. Безопасность
- Проверять права доступа при редактировании адаптаций
- Проверять права доступа при просмотре адаптаций
- Использовать RLS политики

### 4. Масштабируемость
- Генерация адаптаций может занять время для больших курсов
- Добавить очередь для генерации адаптаций
- Показывать прогресс генерации

### 5. Ошибки
- Обрабатывать ошибки генерации адаптаций
- Показывать понятные сообщения об ошибках
- Предоставлять fallback на оригинальный контент

---

## 📋 ЧЕКЛИСТ ГОТОВНОСТИ

### База данных
- [ ] Таблица `lesson_adaptations` создана
- [ ] Таблица `lesson_adaptation_metadata` создана
- [ ] Функция `analyze_lesson_materials` создана
- [ ] Индексы созданы
- [ ] RLS политики настроены
- [ ] Миграция выполнена

### API
- [ ] API `/api/ai-adaptation` обновлен
- [ ] API `/api/lesson-adaptation` создан
- [ ] API `/api/lesson-materials` создан
- [ ] Валидация данных реализована
- [ ] Обработка ошибок реализована

### Компоненты
- [ ] Переключатель режимов создан
- [ ] Компонент UnifiedAdaptation обновлен
- [ ] Компоненты для адаптированных элементов созданы
- [ ] Редактор блоков создан
- [ ] Режим "Оригинал" реализован

### Страницы
- [ ] Страница адаптации для автора обновлена
- [ ] Страница изучения для студента обновлена
- [ ] Загрузка адаптаций из БД реализована
- [ ] Сохранение выбранного режима реализовано

### Логика
- [ ] Генерация адаптаций обновлена
- [ ] Автоматическая генерация при публикации реализована
- [ ] Промпты для ИИ обновлены
- [ ] Валидация ответов ИИ реализована

### Тестирование
- [ ] Тестирование генерации адаптаций выполнено
- [ ] Тестирование отображения контента выполнено
- [ ] Тестирование редактирования выполнено
- [ ] Тестирование производительности выполнено

### Документация
- [ ] Документация обновлена
- [ ] Руководства для пользователей созданы
- [ ] Примеры использования созданы

---

**ВЕРСИЯ ПЛАНА**: 1.0.0  
**ДАТА СОЗДАНИЯ**: 2024  
**СТАТУС**: Ожидает утверждения

---

## 🔄 СЛЕДУЮЩИЕ ШАГИ

После утверждения плана:

1. **Этап 1**: Создать миграцию БД и протестировать на тестовой БД
2. **Этап 2**: Обновить API и протестировать генерацию адаптаций
3. **Этап 3**: Обновить компоненты и протестировать отображение
4. **Этап 4**: Интегрировать для студентов и протестировать
5. **Этап 5**: Выполнить полное тестирование системы
6. **Этап 6**: Развернуть на продакшн

---

**ГОТОВ К НАЧАЛУ РЕАЛИЗАЦИИ ПОСЛЕ УТВЕРЖДЕНИЯ ПЛАНА**

