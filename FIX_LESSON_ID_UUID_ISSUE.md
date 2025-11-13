# Исправление проблемы с UUID для ID уроков

## Проблема

Уроки из `modules.lessons` используют строковые ID (например, `"first-lesson"`), но таблица `lesson_adaptations` ожидала UUID и ссылалась на таблицу `course_lessons`, в которой таких уроков нет.

**Ошибка:**
```
invalid input syntax for type uuid: "first-lesson"
```

## Решение

### 1. Изменение схемы БД

Создан SQL скрипт `scripts/28-fix-lesson-id-type.sql`, который:

1. **Изменяет тип `lesson_id`** в таблицах `lesson_adaptations` и `lesson_adaptation_metadata` с `UUID` на `TEXT` (поддерживает как UUID, так и строковые ID)
2. **Добавляет поле `course_id`** в обе таблицы для связи с курсом
3. **Удаляет внешний ключ** на `course_lessons` (так как уроки могут быть в `modules.lessons`)
4. **Создает новый уникальный индекс** с учетом `course_id`, `lesson_id` и `adaptation_type`
5. **Обновляет RLS политики** для работы с `course_id` вместо `course_lessons`
6. **Обновляет функцию `analyze_lesson_materials`** для поддержки строковых ID и поиска уроков в `modules.lessons`

### 2. Обновление API endpoints

Обновлены API endpoints в `app/api/lesson-adaptation/route.ts`:

- **GET**: Теперь требует `courseId` и использует `course_id` и `lesson_id` для поиска
- **PUT**: Теперь требует `courseId` и использует его для проверки прав доступа и сохранения
- **POST**: Теперь требует `courseId` и использует его для публикации адаптации

### 3. Обновление фронтенда

Обновлена страница адаптации `app/course/[courseId]/adaptation/page.tsx`:

- Все вызовы API теперь передают `courseId`
- Используется `encodeURIComponent` для безопасной передачи `lessonId` в URL
- Метод публикации изменен с `PUT` на `POST`

### 4. Исправление ошибки в UnifiedAdaptation

Исправлена ошибка `Cannot access uninitialized variable` в `components/ui/unified-adaptation.tsx`:

- Использована безопасная проверка с IIFE (Immediately Invoked Function Expression)
- Добавлена проверка на `undefined/null` для `studentType`

## Инструкция по применению

### Шаг 1: Выполнить SQL миграцию

Выполните SQL скрипт в Supabase SQL Editor:

```sql
-- Скрипт находится в scripts/28-fix-lesson-id-type.sql
```

Этот скрипт:
- Безопасно мигрирует существующие данные (если есть)
- Обновляет схему таблиц
- Обновляет RLS политики
- Обновляет функцию `analyze_lesson_materials`

### Шаг 2: Проверить работу

После выполнения миграции:

1. Откройте страницу адаптации курса
2. Выберите урок
3. Проверьте, что уроки загружаются без ошибок
4. Попробуйте создать адаптацию для урока
5. Проверьте, что адаптация сохраняется и публикуется

## Изменения в коде

### Файлы, которые были изменены:

1. **scripts/28-fix-lesson-id-type.sql** - SQL миграция
2. **app/api/lesson-adaptation/route.ts** - Обновлены все методы API
3. **app/course/[courseId]/adaptation/page.tsx** - Обновлены вызовы API
4. **components/ui/unified-adaptation.tsx** - Исправлена ошибка инициализации
5. **lib/lesson-id-utils.ts** - Создана утилита для работы с ID уроков (пока не используется, но может быть полезна в будущем)

## Важные замечания

1. **Обратная совместимость**: Миграция поддерживает как UUID (для уроков из `course_lessons`), так и строковые ID (для уроков из `modules.lessons`)

2. **Безопасность**: RLS политики обновлены для работы с `course_id`, что обеспечивает правильную проверку прав доступа

3. **Производительность**: Создан уникальный индекс для быстрого поиска адаптаций по `course_id`, `lesson_id` и `adaptation_type`

4. **Миграция данных**: Если в таблице уже есть данные с UUID, скрипт попытается найти `course_id` из таблицы `course_lessons`. Если урок не найден в `course_lessons`, `course_id` останется `NULL` и его нужно будет заполнить вручную (или через обновление курса).

## Следующие шаги

После применения миграции:

1. Проверьте, что все уроки корректно загружаются
2. Создайте тестовую адаптацию для урока
3. Проверьте, что адаптация сохраняется и публикуется
4. Если есть существующие адаптации с `course_id = NULL`, обновите их вручную или через скрипт

## Откат изменений

Если нужно откатить изменения, выполните:

```sql
-- Восстановить тип lesson_id на UUID
ALTER TABLE public.lesson_adaptations 
  ALTER COLUMN lesson_id TYPE UUID USING lesson_id::UUID;

ALTER TABLE public.lesson_adaptation_metadata 
  ALTER COLUMN lesson_id TYPE UUID USING lesson_id::UUID;

-- Удалить поле course_id
ALTER TABLE public.lesson_adaptations 
  DROP COLUMN IF EXISTS course_id;

ALTER TABLE public.lesson_adaptation_metadata 
  DROP COLUMN IF EXISTS course_id;

-- Восстановить внешний ключ
ALTER TABLE public.lesson_adaptations 
  ADD CONSTRAINT lesson_adaptations_lesson_id_fkey 
  FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON DELETE CASCADE;
```

**Внимание**: Откат возможен только если все `lesson_id` являются валидными UUID и существуют в таблице `course_lessons`.

