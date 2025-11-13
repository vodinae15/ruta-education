# ✅ ЭТАП 1: БАЗА ДАННЫХ - ЗАВЕРШЕН

## 📋 Что было реализовано

### 1.1. Таблица `lesson_adaptations`

**Файл**: `scripts/25-create-lesson-adaptations.sql`

**Структура**:
- `id` (UUID) - ID адаптации
- `lesson_id` (UUID) - ID урока (ссылка на `course_lessons`)
- `adaptation_type` (TEXT) - Тип адаптации: 'visual', 'auditory', 'kinesthetic'
- `status` (TEXT) - Статус: 'pending', 'generated', 'edited', 'published'
- `block1`, `block2`, `block3`, `block4`, `block5` (JSONB) - 5 блоков адаптированного контента
- `generated_at` (TIMESTAMP) - Дата генерации
- `edited_at` (TIMESTAMP) - Дата последнего редактирования
- `edited_by` (UUID) - ID пользователя, который редактировал
- `version` (INTEGER) - Версия адаптации
- `created_at`, `updated_at` (TIMESTAMP) - Даты создания и обновления

**Особенности**:
- Уникальное ограничение на `(lesson_id, adaptation_type)` - один урок может иметь только одну адаптацию каждого типа
- Каждый блок содержит трехслойную структуру (подводка + улучшенный текст + адаптированный элемент)
- Статус 'published' означает, что адаптация доступна студентам

### 1.2. Таблица `lesson_adaptation_metadata`

**Структура**:
- `id` (UUID) - ID метаданных
- `lesson_id` (UUID) - ID урока
- `adaptation_type` (TEXT) - Тип адаптации
- `has_audio`, `has_video`, `has_images`, `has_diagrams`, `has_practice` (BOOLEAN) - Наличие материалов
- `recommendations` (JSONB) - Рекомендации для автора
- `ai_generation_status` (TEXT) - Статус генерации через ИИ
- `ai_generation_error` (TEXT) - Текст ошибки (если была)
- `ai_generation_timestamp` (TIMESTAMP) - Дата генерации

**Особенности**:
- Автоматически создается при создании/обновлении урока (через триггер)
- Содержит информацию о наличии материалов для адаптации
- Содержит рекомендации для автора по улучшению контента

### 1.3. Функция `analyze_lesson_materials`

**Назначение**: Анализирует урок на наличие материалов для адаптации

**Возвращает**:
- `has_audio` - наличие аудио
- `has_video` - наличие видео
- `has_images` - наличие изображений
- `has_diagrams` - наличие схем/диаграмм
- `has_practice` - наличие практических заданий
- `recommendations` - рекомендации для автора

**Логика**:
- Анализирует блоки урока
- Проверяет элементы в каждом блоке
- Определяет наличие материалов по типу элемента
- Формирует рекомендации на основе отсутствующих материалов

### 1.4. Функция `create_lesson_adaptation_metadata`

**Назначение**: Автоматически создает метаданные при создании/обновлении урока

**Логика**:
- Вызывается триггером после INSERT/UPDATE в `course_lessons`
- Анализирует материалы урока
- Создает метаданные для всех трех типов адаптации (visual, auditory, kinesthetic)
- Обновляет существующие метаданные при обновлении урока

### 1.5. Функция `get_lesson_adaptation`

**Назначение**: Получает опубликованную адаптацию урока по типу

**Параметры**:
- `lesson_id_param` - ID урока
- `adaptation_type_param` - Тип адаптации

**Возвращает**: Данные адаптации или пустой результат

### 1.6. Функция `check_adaptation_exists`

**Назначение**: Проверяет наличие адаптации урока

**Параметры**:
- `lesson_id_param` - ID урока
- `adaptation_type_param` - Тип адаптации

**Возвращает**: true/false

### 1.7. Индексы

**Для таблицы `lesson_adaptations`**:
- `idx_lesson_adaptations_lesson_id` - быстрый поиск по уроку
- `idx_lesson_adaptations_type` - быстрый поиск по типу
- `idx_lesson_adaptations_status` - быстрый поиск по статусу
- `idx_lesson_adaptations_lesson_type` - составной индекс (урок + тип)
- `idx_lesson_adaptations_published` - частичный индекс для опубликованных адаптаций

**Для таблицы `lesson_adaptation_metadata`**:
- `idx_lesson_adaptation_metadata_lesson_id` - быстрый поиск по уроку
- `idx_lesson_adaptation_metadata_type` - быстрый поиск по типу
- `idx_lesson_adaptation_metadata_lesson_type` - составной индекс
- `idx_lesson_adaptation_metadata_status` - поиск по статусу генерации

### 1.8. RLS политики

**Для таблицы `lesson_adaptations`**:
- Авторы и соавторы могут просматривать адаптации своих уроков
- Авторы и соавторы могут создавать адаптации для своих уроков
- Авторы и соавторы могут обновлять адаптации своих уроков
- Авторы и соавторы могут удалять адаптации своих уроков
- Студенты могут просматривать опубликованные адаптации опубликованных курсов

**Для таблицы `lesson_adaptation_metadata`**:
- Авторы и соавторы могут просматривать метаданные своих уроков
- Авторы и соавторы могут создавать метаданные для своих уроков
- Авторы и соавторы могут обновлять метаданные своих уроков
- Авторы и соавторы могут удалять метаданные своих уроков

### 1.9. Триггеры

**Для таблицы `lesson_adaptations`**:
- `update_lesson_adaptations_updated_at` - автоматически обновляет `updated_at` при обновлении

**Для таблицы `lesson_adaptation_metadata`**:
- `update_lesson_adaptation_metadata_updated_at` - автоматически обновляет `updated_at` при обновлении

**Для таблицы `course_lessons`**:
- `trigger_create_lesson_adaptation_metadata` - автоматически создает метаданные при создании/обновлении урока

### 1.10. TypeScript утилиты

**Файл**: `lib/adaptation-logic.ts`

**Функции**:
- `normalizeStudentType()` - нормализует тип студента
- `checkAdaptationExists()` - проверяет наличие адаптации
- `getLessonAdaptation()` - получает адаптацию урока
- `saveLessonAdaptation()` - сохраняет адаптацию урока
- `analyzeLessonMaterials()` - анализирует материалы урока
- `getAdaptationMetadata()` - получает метаданные адаптации
- `updateAdaptationMetadata()` - обновляет метаданные адаптации
- `getAllLessonAdaptations()` - получает все адаптации урока
- `publishLessonAdaptation()` - публикует адаптацию урока
- `deleteLessonAdaptation()` - удаляет адаптацию урока
- `generateAdaptationsForLesson()` - генерирует адаптации для всех типов
- `getLessonRecommendations()` - получает рекомендации по материалам

**Типы**:
- `AdaptationType` - тип адаптации
- `AdaptationStatus` - статус адаптации
- `AIGenerationStatus` - статус генерации через ИИ
- `BlockIntro` - структура подводки
- `BlockContent` - структура улучшенного текста
- `AdaptationElement` - структура адаптированного элемента
- `AdaptationBlock` - структура блока адаптации
- `AdaptationContent` - структура адаптированного контента
- `LessonAdaptation` - структура адаптации урока в БД
- `AdaptationMetadata` - структура метаданных адаптации
- `MaterialsAnalysis` - структура анализа материалов

---

## 🔍 Структура данных

### Структура блока адаптации (JSONB)

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
      "type": "diagram" | "audio" | "simulation" | "table" | "story" | "interactive" | "checklist",
      "data": { /* данные элемента */ },
      "description": "Описание элемента"
    }
  }
}
```

### Структура рекомендаций (JSONB)

```json
[
  {
    "type": "audio" | "visual" | "practice",
    "message": "Рекомендация для автора",
    "priority": "low" | "medium" | "high"
  }
]
```

---

## 🚀 Как использовать

### 1. Выполнение миграции

```bash
# В Supabase Dashboard > SQL Editor
# Выполнить скрипт: scripts/25-create-lesson-adaptations.sql
```

### 2. Использование TypeScript утилит

```typescript
import { 
  normalizeStudentType,
  checkAdaptationExists,
  getLessonAdaptation,
  saveLessonAdaptation,
  analyzeLessonMaterials
} from '@/lib/adaptation-logic'

// Нормализация типа студента
const type = normalizeStudentType('visual-analytical') // 'visual'

// Проверка наличия адаптации
const exists = await checkAdaptationExists(lessonId, 'visual')

// Получение адаптации
const adaptation = await getLessonAdaptation(lessonId, 'visual')

// Анализ материалов
const analysis = await analyzeLessonMaterials(lessonId)
```

---

## ✅ Проверка выполнения

### Чеклист:

- [x] Таблица `lesson_adaptations` создана
- [x] Таблица `lesson_adaptation_metadata` создана
- [x] Функция `analyze_lesson_materials` создана
- [x] Функция `create_lesson_adaptation_metadata` создана
- [x] Функция `get_lesson_adaptation` создана
- [x] Функция `check_adaptation_exists` создана
- [x] Индексы созданы (8 индексов)
- [x] RLS политики настроены (9 политик)
- [x] Триггеры созданы (3 триггера)
- [x] TypeScript утилиты созданы (`lib/adaptation-logic.ts`)
- [x] Типы определены
- [x] Функции для работы с БД реализованы

---

## 📝 Следующие шаги

После выполнения этапа 1 можно переходить к:

1. **Этап 2**: Обновление API адаптации
   - Обновить `/api/ai-adaptation` для сохранения в БД
   - Создать `/api/lesson-adaptation` для получения/редактирования
   - Создать `/api/lesson-materials` для анализа материалов

2. **Этап 3**: Обновление компонентов отображения
   - Создать переключатель режимов
   - Обновить компонент `UnifiedAdaptation`
   - Создать компоненты для адаптированных элементов

---

## 🔍 Тестирование

После выполнения миграции можно протестировать:

1. **Создание таблиц**:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name IN ('lesson_adaptations', 'lesson_adaptation_metadata');
```

2. **Проверка функций**:
```sql
SELECT analyze_lesson_materials('lesson_id_here');
```

3. **Проверка триггеров**:
```sql
-- Создать урок и проверить автоматическое создание метаданных
INSERT INTO course_lessons (course_id, title, description, order_index, blocks)
VALUES ('course_id', 'Test Lesson', 'Description', 1, '[]'::jsonb);

-- Проверить метаданные
SELECT * FROM lesson_adaptation_metadata WHERE lesson_id = 'lesson_id';
```

---

## ⚠️ Важные замечания

1. **Миграция должна быть выполнена после всех предыдущих миграций**
   - Особенно после миграций, создающих таблицу `course_lessons`

2. **Функция `update_updated_at_column` может уже существовать**
   - Скрипт использует `CREATE OR REPLACE`, поэтому это безопасно

3. **Триггер для автоматического создания метаданных**
   - Срабатывает при создании/обновлении урока
   - Создает метаданные для всех трех типов адаптации

4. **RLS политики учитывают соавторов**
   - Авторы и соавторы имеют одинаковые права на адаптации

5. **Студенты видят только опубликованные адаптации**
   - Адаптация должна иметь статус 'published'
   - Курс должен быть опубликован

---

**Этап 1 завершен и готов к использованию!**

**Дата завершения**: 2024  
**Версия**: 1.0.0

