# ✅ ЭТАП 2: ОБНОВЛЕНИЕ API АДАПТАЦИИ - ЗАВЕРШЕН

## 📋 Что было реализовано

### 2.1. Обновление API `/api/ai-adaptation`

**Файл**: `app/api/ai-adaptation/route.ts`

**Изменения**:

1. **Обновлены промпты для трехслойной структуры**:
   - Подводка (intro) - 2-3 предложения
   - Улучшенная текстовая версия (content) - полный контент автора, структурированный
   - Адаптированный элемент (adaptation) - специализированный формат под тип восприятия

2. **Добавлена логика сохранения в БД**:
   - Параметр `saveToDatabase` для сохранения адаптации в БД
   - Параметр `forceRegenerate` для принудительной регенерации
   - Автоматическое сохранение адаптированного контента после генерации
   - Обновление метаданных адаптации (статус генерации, ошибки)

3. **Добавлена валидация ответов ИИ**:
   - Проверка наличия всех 5 блоков
   - Проверка трехслойной структуры каждого блока
   - Проверка наличия подводки, контента и адаптированного элемента
   - Возврат списка ошибок валидации

4. **Обновлена обработка ошибок**:
   - Логирование всех этапов генерации
   - Обновление статуса ошибки в метаданных
   - Обработка ошибок парсинга JSON
   - Обработка ошибок валидации

5. **Использование серверного клиента Supabase**:
   - Использование `createClient` из `@/lib/supabase/server`
   - Асинхронное создание клиента
   - Правильная работа с RLS политиками

**Структура промптов**:

- **Для визуалов**: схемы, диаграммы, таблицы, инфографика
- **Для аудиалов**: аудио-контент, истории, диалоги, голосовые подсказки
- **Для кинестетиков**: симуляции, интерактивные задания, чек-листы, эксперименты

**Формат ответа ИИ**:

```json
{
  "block1": {
    "intro": {
      "text": "Подводка (2-3 предложения)",
      "type": "intro"
    },
    "content": {
      "title": "Заголовок",
      "text": "Улучшенная текстовая версия",
      "sections": [...],
      "type": "text"
    },
    "adaptation": {
      "type": "visual" | "auditory" | "kinesthetic",
      "element": {
        "type": "diagram" | "audio" | "simulation" | ...,
        "data": {...},
        "description": "Описание элемента"
      }
    }
  },
  "block2": { /* аналогично */ },
  "block3": { /* аналогично */ },
  "block4": { /* аналогично */ },
  "block5": { /* аналогично */ }
}
```

### 2.2. Создание API `/api/lesson-adaptation`

**Файл**: `app/api/lesson-adaptation/route.ts`

**Эндпоинты**:

1. **GET `/api/lesson-adaptation?lessonId=xxx&type=visual`**:
   - Получает адаптированный контент урока из БД
   - Параметр `includeUnpublished` для включения неопубликованных адаптаций
   - Возвращает адаптированный контент или ошибку, если не найден

2. **PUT `/api/lesson-adaptation`**:
   - Обновляет адаптированный контент урока
   - Проверяет права доступа (автор или соавтор)
   - Автоматически увеличивает версию адаптации
   - Обновляет статус на 'edited' при редактировании
   - Сохраняет информацию о редакторе (edited_by, edited_at)

3. **POST `/api/lesson-adaptation`** (публикация):
   - Публикует адаптацию урока (меняет статус на 'published')
   - Проверяет права доступа (автор или соавтор)
   - Делает адаптацию доступной для студентов

**Проверка прав доступа**:
- Проверка авторизации пользователя
- Проверка прав автора курса
- Проверка прав соавтора курса
- Возврат ошибки 403 при отсутствии прав

### 2.3. Создание API `/api/lesson-materials`

**Файл**: `app/api/lesson-materials/route.ts`

**Эндпоинты**:

1. **GET `/api/lesson-materials?lessonId=xxx`**:
   - Анализирует материалы урока
   - Вызывает функцию БД `analyze_lesson_materials`
   - Возвращает информацию о наличии материалов:
     - `has_audio` - наличие аудио
     - `has_video` - наличие видео
     - `has_images` - наличие изображений
     - `has_diagrams` - наличие схем/диаграмм
     - `has_practice` - наличие практических заданий
     - `recommendations` - рекомендации для автора

**Логика анализа**:
- Анализ блоков урока
- Проверка элементов в каждом блоке
- Определение типа элементов
- Формирование рекомендаций на основе отсутствующих материалов

### 2.4. Валидация ответов ИИ

**Функция**: `validateAdaptationContent()`

**Проверки**:
- Наличие всех 5 блоков (block1-block5)
- Наличие подводки (intro.text) в каждом блоке
- Наличие контента (content.text) в каждом блоке
- Наличие адаптированного элемента (adaptation.element) в каждом блоке
- Возврат списка ошибок валидации

**Обработка ошибок**:
- Логирование ошибок валидации
- Обновление статуса ошибки в метаданных
- Возврат ошибки с списком проблем

---

## 🔍 Структура данных

### Запрос на адаптацию

```typescript
interface AdaptationRequest {
  lessonContent: LessonContent
  studentType: 'visual' | 'auditory' | 'kinesthetic' | ...
  lessonId: string
  saveToDatabase?: boolean
  forceRegenerate?: boolean
}
```

### Ответ на адаптацию

```typescript
interface AdaptationResponse {
  success: boolean
  adaptedContent?: AdaptationContent
  lessonId: string
  studentType: AdaptationType
  savedToDatabase?: boolean
  error?: string
  validationErrors?: string[]
}
```

### Запрос на получение адаптации

```typescript
GET /api/lesson-adaptation?lessonId=xxx&type=visual&includeUnpublished=true
```

### Ответ на получение адаптации

```typescript
interface GetAdaptationResponse {
  success: boolean
  adaptation?: {
    id: string
    lesson_id: string
    adaptation_type: AdaptationType
    status: AdaptationStatus
    block1: AdaptationBlock
    block2: AdaptationBlock
    block3: AdaptationBlock
    block4: AdaptationBlock
    block5: AdaptationBlock
    generated_at: string | null
    edited_at: string | null
    edited_by: string | null
    version: number
    created_at: string
    updated_at: string
  }
  error?: string
}
```

### Запрос на обновление адаптации

```typescript
PUT /api/lesson-adaptation
{
  lessonId: string
  type: AdaptationType
  blocks: AdaptationContent
  status?: AdaptationStatus
}
```

### Запрос на публикацию адаптации

```typescript
POST /api/lesson-adaptation
{
  lessonId: string
  type: AdaptationType
}
```

### Ответ на анализ материалов

```typescript
interface MaterialsAnalysisResponse {
  success: boolean
  materials?: {
    has_audio: boolean
    has_video: boolean
    has_images: boolean
    has_diagrams: boolean
    has_practice: boolean
    recommendations: Array<{
      type: string
      message: string
      priority?: 'low' | 'medium' | 'high'
    }>
  }
  error?: string
}
```

---

## 🚀 Как использовать

### 1. Генерация адаптации с сохранением в БД

```typescript
const response = await fetch('/api/ai-adaptation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lessonContent: {
      title: 'Название урока',
      description: 'Описание урока',
      blocks: [
        { title: 'Блок 1', content: 'Содержание блока 1', type: 'text' },
        // ...
      ]
    },
    studentType: 'visual',
    lessonId: 'lesson-id',
    saveToDatabase: true,
    forceRegenerate: false
  })
})

const data = await response.json()
if (data.success) {
  console.log('Адаптация сгенерирована и сохранена:', data.adaptedContent)
}
```

### 2. Получение адаптации из БД

```typescript
const response = await fetch('/api/lesson-adaptation?lessonId=xxx&type=visual')
const data = await response.json()
if (data.success) {
  console.log('Адаптация получена:', data.adaptation)
}
```

### 3. Обновление адаптации

```typescript
const response = await fetch('/api/lesson-adaptation', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lessonId: 'lesson-id',
    type: 'visual',
    blocks: {
      block1: { /* обновленный блок */ },
      block2: { /* обновленный блок */ },
      // ...
    },
    status: 'edited'
  })
})

const data = await response.json()
if (data.success) {
  console.log('Адаптация обновлена')
}
```

### 4. Публикация адаптации

```typescript
const response = await fetch('/api/lesson-adaptation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lessonId: 'lesson-id',
    type: 'visual'
  })
})

const data = await response.json()
if (data.success) {
  console.log('Адаптация опубликована')
}
```

### 5. Анализ материалов урока

```typescript
const response = await fetch('/api/lesson-materials?lessonId=xxx')
const data = await response.json()
if (data.success) {
  console.log('Материалы урока:', data.materials)
  console.log('Рекомендации:', data.materials.recommendations)
}
```

---

## ✅ Проверка выполнения

### Чеклист:

- [x] API `/api/ai-adaptation` обновлен для трехслойной структуры
- [x] Промпты обновлены для трехслойной структуры блоков
- [x] Добавлена логика сохранения в БД
- [x] Добавлена валидация ответов ИИ
- [x] Добавлена обработка ошибок
- [x] Использование серверного клиента Supabase
- [x] API `/api/lesson-adaptation` создан (GET, PUT, POST)
- [x] API `/api/lesson-materials` создан (GET)
- [x] Проверка прав доступа реализована
- [x] Версионирование адаптаций реализовано
- [x] Обработка ошибок реализована
- [x] Логирование реализовано

---

## 📝 Следующие шаги

После выполнения этапа 2 можно переходить к:

1. **Этап 3**: Обновление компонентов отображения
   - Создать переключатель режимов
   - Обновить компонент `UnifiedAdaptation`
   - Создать компоненты для адаптированных элементов

2. **Этап 4**: Обновление страницы адаптации для автора
   - Добавить переключатель режимов
   - Добавить редактор блоков
   - Добавить кнопку сохранения изменений

3. **Этап 5**: Обновление страницы изучения для студента
   - Добавить переключатель режимов
   - Загружать адаптации из БД
   - Показывать базовый контент при отсутствии адаптации

---

## 🔍 Тестирование

После выполнения этапа 2 можно протестировать:

1. **Генерация адаптации**:
```bash
curl -X POST http://localhost:3000/api/ai-adaptation \
  -H "Content-Type: application/json" \
  -d '{
    "lessonContent": {
      "title": "Test Lesson",
      "description": "Test Description",
      "blocks": [
        {"title": "Block 1", "content": "Content 1", "type": "text"}
      ]
    },
    "studentType": "visual",
    "lessonId": "lesson-id",
    "saveToDatabase": true
  }'
```

2. **Получение адаптации**:
```bash
curl http://localhost:3000/api/lesson-adaptation?lessonId=xxx&type=visual
```

3. **Обновление адаптации**:
```bash
curl -X PUT http://localhost:3000/api/lesson-adaptation \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "lesson-id",
    "type": "visual",
    "blocks": { /* адаптированный контент */ }
  }'
```

4. **Анализ материалов**:
```bash
curl http://localhost:3000/api/lesson-materials?lessonId=xxx
```

---

## ⚠️ Важные замечания

1. **Серверный клиент Supabase**:
   - Использование `createClient` из `@/lib/supabase/server`
   - Асинхронное создание клиента (await createClient())
   - Правильная работа с RLS политиками

2. **Проверка прав доступа**:
   - Проверка авторизации пользователя
   - Проверка прав автора курса
   - Проверка прав соавтора курса
   - Возврат ошибки 403 при отсутствии прав

3. **Валидация ответов ИИ**:
   - Проверка всех 5 блоков
   - Проверка трехслойной структуры
   - Возврат списка ошибок валидации
   - Обновление статуса ошибки в метаданных

4. **Сохранение в БД**:
   - Автоматическое сохранение после генерации
   - Проверка существования адаптации
   - Обновление существующей адаптации
   - Обновление метаданных адаптации

5. **Версионирование**:
   - Автоматическое увеличение версии при редактировании
   - Сохранение информации о редакторе
   - Сохранение даты редактирования

---

**Этап 2 завершен и готов к использованию!**

**Дата завершения**: 2024  
**Версия**: 1.0.0

