# План реализации: спринт доработок

**Проект:** Ruta Education
**Ветка:** `claude/analyze-project-6GuDv`
**Дата:** 16 февраля 2026 г.

---

## Список задач

1. Блок 4: Тезисы — двухколоночный layout
2. Блок 4: Тезисы — ИИ-структурирование
3. Секция «Финальная настройка» — логика появления
4. Секция «Финальная настройка» — UI секции
5. Блок 2: Как работать с уроком — перенос из списка
6. Блок 2: Как работать с уроком — интерфейс редактирования
7. Блок 2: Как работать с уроком — ИИ-генерация по шаблонам
8. Блок 2: Как работать с уроком — ограничение элементов
9. Блок 2: Как работать с уроком — стили для ученика
10. Разделение порядков автор/ученик
11. Тестирование высокого приоритета

---

## Порядок реализации (по зависимостям)

```
Шаг A: Модель данных (фундамент для всех задач)
  ↓
Шаг B: Задачи 1-2 (Тезисы) — независимая ветка
  ↓
Шаг C: Задачи 3-4 (Финальная настройка) — инфраструктура
  ↓
Шаг D: Задачи 5-8 (Как работать с уроком) — зависит от Шага C
  ↓
Шаг E: Задача 9 (Стили для ученика) — зависит от Шага D
  ↓
Шаг F: Задача 10 (Разделение порядков) — зависит от Шагов D и E
  ↓
Шаг G: Задача 11 (Тестирование)
```

---

# Шаг A: Модель данных

## Что делаю

Расширяю интерфейс `CourseBlock` новыми опциональными полями. Это фундамент для всех остальных задач.

## Файл: `lib/course-constructor-logic.ts` (строки 1-19)

### Текущий интерфейс:

```typescript
export interface CourseBlock {
  id: string
  type: "introduction" | "navigation" | "main_block_1" | ...
  title: string
  description: string
  purpose?: string
  elements: CourseElement[]
  required: boolean
  completed: boolean
}
```

### Что добавляю:

```typescript
export interface CourseBlock {
  id: string
  type: "introduction" | "navigation" | "main_block_1" | ...
  title: string
  description: string
  purpose?: string
  elements: CourseElement[]
  required: boolean
  completed: boolean
  // Новые поля:
  theses?: string           // черновые заметки автора (не видны ученику)
  category?: 'educational' | 'meta'  // тип блока для фильтрации в UI
}
```

## Файл: `app/course-constructor/page.tsx` (строки 70-72)

### Текущий интерфейс:

```typescript
interface ExtendedCourseBlock extends Omit<CourseBlock, "elements"> {
  elements: ExtendedCourseElement[]
}
```

### Что добавляю:

Ничего — `ExtendedCourseBlock` наследует новые поля от `CourseBlock` автоматически через `Omit<CourseBlock, "elements">`.

## Файл: `lib/course-constructor-logic.ts` (строки 282-373, baseBlocks)

### Что добавляю:

Добавляю `category` в каждый блок в `baseBlocks`:

- `introduction` → `category: 'meta'`
- `navigation` → `category: 'meta'`
- `conclusion` → `category: 'meta'`
- Все `main_block_*`, `intermediate_*`, `bonus_support` → `category: 'educational'`

Аналогично — в `getStandardTemplate()` (строки 553-683).

## База данных

**Изменений в БД нет.** Поле `blocks` в таблице `course_lessons` имеет тип `JSONB`. Новые поля (`theses`, `category`) автоматически сериализуются/десериализуются. Существующие курсы продолжат работать — поля опциональные, при чтении будут `undefined`.

## Совместимость

- Все поля `?` (опциональные) — старые данные не ломаются
- Строковые типы блоков (`introduction`, `main_block_1`, ...) НЕ меняются
- Автосохранение (`autosaveCourse`, строка 1773) и ручное сохранение (`saveCourse`, строка 1853) работают без изменений — блоки сериализуются целиком

---

# Шаг B: Задачи 1-2 — Тезисы

## Задача 1: Двухколоночный layout

### Что делаю

При выборе основного блока (`main_block_1`, `main_block_2`, `main_block_3`) центральная область конструктора делится на две колонки: слева «Тезисы» (40%), справа текущий редактор элементов (60%).

### Файл: `app/course-constructor/page.tsx`

#### Изменение 1: Определение, нужен ли двухколоночный layout (перед строкой 2817)

Добавляю вычисление:

```typescript
const activeBlock = courseBlocks.find(b => b.id === activeBlockId)
const isMainBlock = activeBlock && ['main_block_1', 'main_block_2', 'main_block_3'].includes(activeBlock.type)
```

#### Изменение 2: Обёртка центральной колонки (строка 2817-3234)

Текущая вёрстка: один `Card` на всю центральную колонку `lg:col-span-6`.

Новая вёрстка — если `isMainBlock`, оборачиваю содержимое в `grid grid-cols-5 gap-4`:

- Левая часть `col-span-2`: панель «Тезисы»
- Правая часть `col-span-3`: существующий `Card` с редактором элементов

Если не `isMainBlock` — одна колонка как сейчас, без изменений.

#### Изменение 3: Панель «Тезисы» — вёрстка и стили

```
┌─ Панель «Тезисы» ──────────────────────┐
│                                          │
│  💡 Тезисы                               │
│  Набросайте мысли — ученики это не увидят │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ textarea                          │  │
│  │ placeholder: «О чём хотите        │  │
│  │ рассказать? Какие ключевые мысли?»│  │
│  │                                    │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Структурировать]                       │
│                                          │
└──────────────────────────────────────────┘
```

Стили панели:
- Контейнер: `Card` с `border-0 bg-[#FDF8F3]` (тёплый фон, отличается от основного редактора)
- Заголовок: `LightbulbIcon` (уже импортирован, строка 37) + текст «Тезисы», шрифт `text-lg font-semibold text-[#5589a7]`
- Подпись: `text-sm text-slate-500`
- Textarea: компонент `Textarea` (уже импортирован, строка 10), `rows={12}`, стиль `border-[#E5E7EB] focus:border-[#659AB8]`
- Кнопка «Структурировать»: стиль как у существующих кнопок — `bg-white text-[#659AB8] border-2 border-[#659AB8] rounded-lg hover:bg-[#659AB8] hover:text-white`

#### Изменение 4: Привязка данных тезисов

Добавляю функцию обновления тезисов (рядом с `updateElementContent`, строка 1446):

```typescript
const updateBlockTheses = (blockId: string, theses: string) => {
  const updatedBlocks = courseBlocks.map(block =>
    block.id === blockId ? { ...block, theses } : block
  )
  updateCourseBlocks(updatedBlocks)
}
```

Textarea привязываю:
- `value={activeBlock?.theses || ""}`
- `onChange={(e) => updateBlockTheses(activeBlockId, e.target.value)}`

Данные сохраняются автоматически через существующий `updateCourseBlocks` → `autosaveCourse`.

### Совместимость

- Двухколоночный layout применяется ТОЛЬКО для `main_block_*` — все остальные блоки рендерятся как раньше
- Тезисы хранятся как поле блока в JSON — не влияют на адаптации, тесты, прогресс
- Тезисы НЕ показываются ученику — поле `theses` не используется в `learn/page.tsx` и `unified-adaptation.tsx`

---

## Задача 2: ИИ-структурирование тезисов

### Что делаю

Создаю API-endpoint для структурирования хаотичных заметок автора. Кнопка «Структурировать» в панели тезисов отправляет текст на ИИ, получает сгруппированный результат.

### Новый файл: `app/api/ai-structure-theses/route.ts`

Создаю по паттерну из `app/api/ai-adaptation/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import nodeFetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'
```

**Конфигурация (копирую паттерн):**
- `OPENROUTER_API_KEY` из `process.env`
- `OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'`
- `OPENROUTER_MODEL` = `process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'`
- `proxyAgent` через `HttpsProxyAgent` если есть `HTTPS_PROXY`

**Request body:**
```json
{
  "theses": "хаотичные заметки автора",
  "blockTitle": "название блока для контекста"
}
```

**Промпт для ИИ:**
```
Ты — помощник автора учебного курса на платформе Ruta Education.

Автор набросал черновые заметки для блока "{blockTitle}".
Твоя задача — структурировать эти заметки, НЕ переписывая их.

Правила:
1. Сохрани авторский голос и формулировки
2. Сгруппируй мысли по темам
3. Выдели основную мысль
4. Перечисли ключевые понятия списком
5. Отдельно вынеси заметки/идеи автора
6. Формат ответа — markdown

Заметки автора:
{theses}
```

**OpenRouter request:**
```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [{ "role": "user", "content": "..." }],
  "max_tokens": 2000,
  "temperature": 0.3
}
```

**Headers:** `Authorization`, `Content-Type`, `HTTP-Referer`, `X-Title`

**Обработка ответа:**
- Извлекаю `data.choices[0].message.content`
- Возвращаю `{ success: true, structured: string }`

**Обработка ошибок:**
- Нет API ключа → `{ success: false, error: "API ключ не настроен" }` (500)
- Ошибка API → `{ success: false, error: "Ошибка ИИ-сервиса" }` (502)
- Пустые тезисы → `{ success: false, error: "Текст тезисов пуст" }` (400)

### Файл: `app/course-constructor/page.tsx`

**Добавляю состояние (рядом со строкой 370):**
```typescript
const [isStructuringTheses, setIsStructuringTheses] = useState(false)
```

**Добавляю функцию вызова API (рядом с `updateBlockTheses`):**
```typescript
const structureTheses = async (blockId: string) => {
  const block = courseBlocks.find(b => b.id === blockId)
  if (!block?.theses?.trim()) return

  setIsStructuringTheses(true)
  try {
    const response = await fetch('/api/ai-structure-theses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theses: block.theses,
        blockTitle: block.title,
      }),
    })
    if (response.ok) {
      const data = await response.json()
      updateBlockTheses(blockId, data.structured)
    }
  } catch (error) {
    console.error('Error structuring theses:', error)
  } finally {
    setIsStructuringTheses(false)
  }
}
```

**Кнопка в UI:**
```tsx
<button
  onClick={() => structureTheses(activeBlockId)}
  disabled={isStructuringTheses || !activeBlock?.theses?.trim()}
  className="h-10 text-sm bg-white text-[#659AB8] px-4 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isStructuringTheses ? 'Структурирование...' : 'Структурировать'}
</button>
```

---

# Шаг C: Задачи 3-4 — Секция «Финальная настройка»

## Задача 3: Логика появления

### Что делаю

Добавляю функцию подсчёта суммарного объёма контента в основных (образовательных) блоках. Секция «Финальная настройка» показывается, когда общий объём ≥500 символов.

### Файл: `app/course-constructor/page.tsx`

**Добавляю функцию (перед JSX, рядом со строкой 2530):**

```typescript
const getEducationalContentLength = (): number => {
  const educationalTypes = [
    'main_block_1', 'main_block_2', 'main_block_3',
    'intermediate_practice', 'intermediate_test'
  ]
  return courseBlocks
    .filter(b => educationalTypes.includes(b.type))
    .reduce((sum, block) => {
      return sum + block.elements.reduce((elSum, el) =>
        elSum + (el.content?.trim().length || 0), 0)
    }, 0)
}

const showFinalSetupSection = getEducationalContentLength() >= 500
```

Значение `showFinalSetupSection` пересчитывается реактивно при каждом изменении `courseBlocks` (т.к. это derived state).

---

## Задача 4: UI секции

### Что делаю

Рендерю секцию «Финальная настройка» между основным grid (строка 3334) и блоком «Тарифы и оплата» (строка 3336).

### Файл: `app/course-constructor/page.tsx`

**Вставляю после строки 3334 (`</div>` закрытие основного grid) и перед строкой 3336 (`{/* Тарифы и оплата */}`):**

```tsx
{/* Секция «Финальная настройка» */}
{showFinalSetupSection && activeLessonId && (
  <Card className="mt-8 bg-[#F8FAFB] border border-[#E5E7EB] rounded-xl">
    <CardContent className="p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#5589a7] mb-2">
          Финальная настройка
        </h3>
        <p className="text-sm text-slate-600">
          Настройте, что увидит ученик перед и после основного контента
        </p>
      </div>

      {/* Карточка «Как работать с уроком» */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        {/* ... содержимое из Шага D, Задача 6 ... */}
      </div>
    </CardContent>
  </Card>
)}
```

**Стили секции:**
- Фон: `bg-[#F8FAFB]` — из дизайн-системы (`styles/globals.css`, переменная `--background-gray`)
- Рамка: `border border-[#E5E7EB]` — стандартная граница
- Скругление: `rounded-xl` (12px)
- Внутренний отступ: `p-6 sm:p-8`
- Отступ сверху: `mt-8` — отделение от основного grid

**Стили внутренней карточки (мета-блок):**
- Фон: `bg-white`
- Рамка: `border border-[#E5E7EB]`
- Скругление: `rounded-lg`
- Внутренний отступ: `p-4`

### Совместимость

- Секция — чисто UI-компонент, не влияет на данные
- Появляется условно — если контента <500 символов, страница выглядит как раньше
- Не конфликтует с блоком тарифов ниже

---

# Шаг D: Задачи 5-8 — Блок «Как работать с уроком»

## Задача 5: Перенос из списка

### Что делаю

Скрываю блок `introduction` из левой панели «Блоки урока». Блок остаётся в массиве `courseBlocks` для сохранения данных, но не показывается в списке слева.

### Файл: `app/course-constructor/page.tsx`

**Изменение 1: Фильтрация в левой панели (строка 2729)**

Текущее:
```tsx
{courseBlocks.map((block) => {
```

Меняю на:
```tsx
{courseBlocks.filter(b => b.type !== 'introduction').map((block) => {
```

**Изменение 2: Кнопки быстрого добавления блоков при пустом списке (строки 2792-2806)**

Убираю `introduction` из списка быстрого добавления:

Текущее:
```tsx
{ type: "introduction", label: "Дополнительный блок" },
{ type: "main_block_1", label: "Основной блок" },
{ type: "intermediate_practice", label: "Практика" },
```

Меняю на:
```tsx
{ type: "main_block_1", label: "Основной блок" },
{ type: "intermediate_practice", label: "Практика" },
{ type: "intermediate_test", label: "Тест" },
```

**Изменение 3: Кнопка «+» в заголовке (строка 2718)**

Текущее: `onClick={() => addBlock("introduction")}` — добавляет introduction по умолчанию.

Меняю на: `onClick={() => addBlock("main_block_1")}` — добавляет основной блок.

**Изменение 4: Автовыбор блока**

Если `activeBlockId` указывает на `introduction`, а этот блок скрыт из списка — автор не может его выбрать через панель. Это ОК, т.к. introduction теперь редактируется через секцию «Финальная настройка».

### Совместимость

- Блок `introduction` НЕ удаляется из `courseBlocks` — данные сохраняются
- При загрузке существующего курса блок `introduction` будет в массиве, но не в списке
- Автосохранение работает без изменений — сохраняется весь массив `courseBlocks`
- Адаптации не затронуты — блок по-прежнему есть в данных

---

## Задача 6: Интерфейс редактирования

### Что делаю

Внутри секции «Финальная настройка» создаю inline-раскрывающийся редактор для блока `introduction`.

### Файл: `app/course-constructor/page.tsx`

**Добавляю состояние (рядом со строкой 370):**

```typescript
const [isFinalSetupExpanded, setIsFinalSetupExpanded] = useState(false)
const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<string>('')
```

**Карточка в секции «Финальная настройка» (из Задачи 4):**

```
┌─ Как работать с этим уроком ────────────────────────┐
│                                                      │
│  📋 Как работать с этим уроком                       │
│  Инструкция, которую ученик увидит первой            │
│                                                      │
│  Статус: не заполнен / заполнен (N символов)         │
│                                                      │
│  [Заполнить ▼]                                       │
│                                                      │
│  ─── при раскрытии: ──────────────────────────────   │
│                                                      │
│  ┌─ info-блок ─────────────────────────────────────┐ │
│  │ ℹ️  Этот блок увидит ученик ПЕРВЫМ.             │ │
│  │ Объясните ему:                                   │ │
│  │ • Что он узнает и чему научится                  │ │
│  │ • Сколько времени займёт урок                    │ │
│  │ • Что нужно для прохождения                      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  Шаблон:                                             │
│  ○ Управление ожиданиями                             │
│  ○ Снижение тревоги                                  │
│  ○ Объяснение формата                                │
│                                                      │
│  [Сгенерировать черновик]                             │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ textarea (содержимое блока introduction)       │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Добавить: [Текст] [Видео] [Аудио] [Изображение]    │
│                                                      │
│  (Задания и тесты добавляются в блок «Практика»)     │
│                                                      │
│  Элементы блока:                                     │
│  - элемент 1...                                      │
│  - элемент 2...                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Вёрстка карточки:**

Нахожу блок `introduction` в `courseBlocks`:
```typescript
const introBlock = courseBlocks.find(b => b.type === 'introduction')
```

Определяю статус заполнения:
```typescript
const introContentLength = introBlock?.elements.reduce(
  (sum, el) => sum + (el.content?.trim().length || 0), 0
) || 0
const isIntroFilled = introContentLength > 0
```

**Стили карточки:**
- Заголовок: `ClipboardListIcon` (уже импортирован) + «Как работать с этим уроком», шрифт `text-base font-semibold text-[#111827]`
- Подпись: `text-sm text-slate-600`
- Статус: badge — если заполнен: `bg-green-100 text-green-700`, иначе: `bg-slate-100 text-slate-600`
- Кнопка раскрытия: `text-[#659AB8] hover:text-[#5589a7]`, toggle `isFinalSetupExpanded`

**Info-блок (при раскрытии):**
- Фон: `bg-blue-50 border border-blue-200 rounded-lg p-4`
- Иконка: `HelpCircleIcon` (уже импортирован)
- Текст: `text-sm text-blue-800`

**Радиокнопки шаблонов:**
- 3 варианта: `expectations`, `anxiety`, `format`
- Стили: стандартные radio inputs, label `text-sm text-[#111827]`
- Подпись под каждым: `text-xs text-slate-500`
- Состояние: `selectedMetaTemplate`

**Textarea:**
- Привязка к первому текстовому элементу блока `introduction`:
  ```typescript
  const introTextElement = introBlock?.elements.find(el => el.type === 'text')
  ```
- Если элемент не существует — создаю при первом вводе через `addElement`
- `value={introTextElement?.content || ""}`
- `onChange` → `updateElementContent(introBlock.id, introTextElement.id, e.target.value)`
- Стиль: `rows={6}`, стандартный `Textarea`

**Список существующих элементов:**
- Рендерю элементы блока `introduction` в компактном виде
- Каждый элемент: иконка + тип + кнопка удаления
- Используем существующие `getElementIcon` и `removeElement`

### Совместимость

- Редактируем существующий блок `introduction` в `courseBlocks` — данные те же
- Используем существующие функции `updateElementContent`, `addElement`, `removeElement`
- Сохранение через существующий механизм

---

## Задача 7: ИИ-генерация по шаблонам

### Что делаю

Создаю API-endpoint для генерации текста блока «Как работать с уроком» на основе выбранного шаблона и содержимого урока.

### Новый файл: `app/api/ai-generate-meta/route.ts`

**Конфигурация:** Аналогична `ai-structure-theses` (OpenRouter, proxy, те же headers).

**Request body:**
```json
{
  "template": "expectations" | "anxiety" | "format",
  "lessonContent": "суммарный текст из основных блоков",
  "lessonTitle": "название урока"
}
```

**Промпты по шаблонам:**

**`expectations` (Управление ожиданиями):**
```
Ты пишешь вступительный текст для ученика перед началом урока "{lessonTitle}".

Шаблон: Управление ожиданиями.
Задача: объясни ученику, что он узнает, чему научится, и чего НЕ будет в уроке.

Содержание урока:
{lessonContent}

Правила:
- Пиши от лица автора курса, дружелюбно
- 3-5 предложений
- Укажи конкретные темы из урока
- Упомяни примерное время прохождения
- Формат: обычный текст без markdown
```

**`anxiety` (Снижение тревоги):**
```
Ты пишешь вступительный текст для ученика перед началом урока "{lessonTitle}".

Шаблон: Снижение тревоги.
Задача: успокой ученика перед сложной или объёмной темой, покажи что материал доступен.

Содержание урока:
{lessonContent}

Правила:
- Тёплый, поддерживающий тон
- Скажи, что ошибки — это нормально
- Объясни, что урок можно проходить в своём темпе
- 3-5 предложений
```

**`format` (Объяснение формата):**
```
Ты пишешь вступительный текст для ученика перед началом урока "{lessonTitle}".

Шаблон: Объяснение формата.
Задача: объясни, как устроен этот урок и как его лучше проходить.

Содержание урока:
{lessonContent}

Правила:
- Перечисли, какие блоки есть (теория, примеры, практика, тест)
- Дай рекомендацию по порядку прохождения
- 3-5 предложений
```

**OpenRouter request:**
```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [{ "role": "user", "content": "..." }],
  "max_tokens": 1000,
  "temperature": 0.7
}
```

**Response:** `{ success: true, generatedText: string }`

**Обработка ошибок:** Аналогично `ai-structure-theses`.

### Файл: `app/course-constructor/page.tsx`

**Добавляю состояние:**
```typescript
const [isGeneratingMeta, setIsGeneratingMeta] = useState(false)
```

**Добавляю функцию:**

```typescript
const generateMetaBlockContent = async () => {
  if (!selectedMetaTemplate) return
  const introBlock = courseBlocks.find(b => b.type === 'introduction')
  if (!introBlock) return

  // Собираю контент основных блоков
  const educationalTypes = ['main_block_1', 'main_block_2', 'main_block_3',
                            'intermediate_practice', 'intermediate_test']
  const lessonContent = courseBlocks
    .filter(b => educationalTypes.includes(b.type))
    .flatMap(b => b.elements.map(el => el.content).filter(Boolean))
    .join('\n\n')

  setIsGeneratingMeta(true)
  try {
    const response = await fetch('/api/ai-generate-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: selectedMetaTemplate,
        lessonContent,
        lessonTitle: courseLessons.find(l => l.id === activeLessonId)?.title || '',
      }),
    })
    if (response.ok) {
      const data = await response.json()
      // Записываю в первый текстовый элемент introduction
      const textElement = introBlock.elements.find(el => el.type === 'text')
      if (textElement) {
        updateElementContent(introBlock.id, textElement.id, data.generatedText)
      } else {
        // Создаю текстовый элемент, если нет
        addElement(introBlock.id, 'text')
        // После добавления обновляю контент (через setTimeout для state sync)
        setTimeout(() => {
          const updatedBlock = courseBlocks.find(b => b.type === 'introduction')
          const newTextEl = updatedBlock?.elements.find(el => el.type === 'text')
          if (newTextEl) {
            updateElementContent(introBlock.id, newTextEl.id, data.generatedText)
          }
        }, 100)
      }
    }
  } catch (error) {
    console.error('Error generating meta block:', error)
  } finally {
    setIsGeneratingMeta(false)
  }
}
```

**Кнопка «Сгенерировать черновик»:**
```tsx
<button
  onClick={generateMetaBlockContent}
  disabled={isGeneratingMeta || !selectedMetaTemplate}
  className="h-10 text-sm bg-[#659AB8] text-white px-6 rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isGeneratingMeta ? 'Генерация...' : 'Сгенерировать черновик'}
</button>
```

---

## Задача 8: Ограничение типов элементов

### Что делаю

В интерфейсе редактирования блока `introduction` (в секции «Финальная настройка») показываю только разрешённые типы элементов. Тесты, задания и проверка знаний недоступны.

### Файл: `app/course-constructor/page.tsx`

**Добавляю функцию (рядом с `getElementIcon`, строка 1498):**

```typescript
const getBlockAllowedElements = (blockType: string): {
  educational: boolean,
  basic: CourseElement["type"][]
} => {
  if (blockType === 'introduction') {
    return {
      educational: false,  // скрыть секцию «Образовательные блоки»
      basic: ['text', 'video', 'audio', 'image'],  // без task, test, file
    }
  }
  // Для всех остальных — всё доступно
  return {
    educational: true,
    basic: ['text', 'video', 'audio', 'image', 'file', 'task', 'test'],
  }
}
```

**Применяю ограничения в UI редактора внутри секции «Финальная настройка»:**

Секция «Образовательные блоки» (Теория, Пример, Практика, Проверка знаний): **скрыта** для `introduction`.

Секция «Базовые элементы»: показываю только `text`, `video`, `audio`, `image`.

**Подпись под кнопками:**
```tsx
<p className="text-xs text-slate-500 mt-2">
  Это инструктивный блок — задания и тесты добавляются в блок «Практика»
</p>
```

Стиль подписи: `text-xs text-slate-500 italic`

### Совместимость

- Ограничения — только UI. Если в существующем блоке `introduction` уже есть тесты/задания (добавленные ранее), они продолжат отображаться и работать
- Ограничения не применяются к другим блокам

---

# Шаг E: Задача 9 — Стили для ученика

### Что делаю

На странице ученика блок `introduction` отображается с визуальным отличием от учебных блоков: другой фон, рамка, иконка.

### Файл: `components/ui/unified-adaptation.tsx`

**Изменение 1: Стиль в renderAdaptationBlock (строки 1002-1065)**

В функции `renderAdaptationBlock` получаю тип блока через `getLessonBlockForAdaptedBlock`:

```typescript
const lessonBlock = getLessonBlockForAdaptedBlock(blockKey)
const isMetaBlock = lessonBlock?.type === 'introduction'
```

**Стили Card для мета-блока:**

Текущий стиль (строка ~1005):
```tsx
<Card className={`border ${isCompleted ? 'border-[#10B981] bg-green-50' : 'border-[#E5E7EB]'}`}>
```

Добавляю условие для мета-блока:
```tsx
<Card className={`border ${
  isMetaBlock
    ? 'bg-[#F0F7FA] border-[#659AB8]'
    : isCompleted
      ? 'border-[#10B981] bg-green-50'
      : 'border-[#E5E7EB]'
}`}>
```

**Стили заголовка для мета-блока:**

Добавляю иконку `ClipboardListIcon` перед заголовком блока, если `isMetaBlock`:

```tsx
{isMetaBlock && <ClipboardListIcon className="w-5 h-5 text-[#659AB8] mr-2" />}
```

Импорт `ClipboardListIcon` — проверю, есть ли уже в файле. Если нет — добавлю.

**Изменение 2: Стиль в renderOriginalContent (строки 1525-1596)**

Аналогично — при рендере блоков из `originalContent` проверяю `block.type`:

```typescript
const isMetaBlock = block.type === 'introduction'
```

Применяю те же стили: `bg-[#F0F7FA] border-[#659AB8]`, иконка перед заголовком.

**Цвета мета-блока:**
- Фон: `#F0F7FA` (светло-голубой, гармонирует с primary `#659AB8`)
- Рамка: `#659AB8` (primary)
- Внутренний отступ: `p-6` (24px)
- Скругление: `rounded-xl` (12px)

### Файл: `app/course/[courseId]/learn/page.tsx`

Изменений здесь нет — стили применяются внутри `UnifiedAdaptation`.

### Совместимость

- Стили применяются по типу блока (`introduction`) — не влияют на другие блоки
- Существующий контент отображается в новых стилях автоматически

---

# Шаг F: Задача 10 — Разделение порядков автор/ученик

### Что делаю

На странице ученика блоки отображаются в логическом порядке обучения (мета-блоки первыми), а не в порядке заполнения автором.

### Файл: `app/course/[courseId]/learn/page.tsx`

**Добавляю функцию переупорядочивания (перед компонентом, после импортов):**

```typescript
const STUDENT_BLOCK_ORDER: Record<string, number> = {
  'introduction': 1,
  'navigation': 2,
  'main_block_1': 3,
  'intermediate_practice': 4,
  'main_block_2': 5,
  'intermediate_test': 6,
  'main_block_3': 7,
  'conclusion': 8,
  'bonus_support': 9,
}

const reorderBlocksForStudent = (blocks: any[]): any[] => {
  return [...blocks].sort((a, b) => {
    const orderA = STUDENT_BLOCK_ORDER[a.type] ?? 99
    const orderB = STUDENT_BLOCK_ORDER[b.type] ?? 99
    return orderA - orderB
  })
}
```

**Применяю при загрузке контента — loadOriginalContentForLesson (строка 164):**

В двух местах, где формируется `originalContent` (строки 177-185 и 191-198):

```typescript
const sortedBlocks = reorderBlocksForStudent(lessonDataFromDB.blocks || [])
const originalContent = {
  blocks: sortedBlocks.map((block: any, index: number) => ({
    title: block.title || `Блок ${index + 1}`,
    content: block.content || block.text || "",
    type: block.type || "text",
    elements: block.elements || []
  }))
}
```

### Файл: `components/ui/unified-adaptation.tsx`

**Изменение в renderOriginalContent (строки 1525-1596):**

Блоки из `originalContent.blocks` уже приходят в правильном порядке (переупорядочены в `learn/page.tsx`). Рендерю как есть.

**Адаптированный контент (block1-5):**

НЕ трогаю. Адаптации генерируются как цельный набор из 5 блоков с собственной логической последовательностью. Маппинг `block1-5 → lessonBlocks` через `getLessonBlockForAdaptedBlock()` остаётся прежним. Ученик видит адаптированные блоки в порядке block1→block5.

### Что НЕ меняю

- Данные в БД — блоки хранятся в авторском порядке
- Конструктор автора — порядок блоков в левой панели определяется автором
- Адаптации — block1-5 рендерятся в фиксированном порядке
- `lessonBlocks` prop — передаётся без изменений для трекинга прогресса

### Совместимость

- Переупорядочивание происходит только на клиенте при отображении
- Функция `reorderBlocksForStudent` работает с любым набором блоков — в т.ч. со старыми курсами
- Если тип блока не в маппинге → `order = 99` → показывается последним
- Адаптированный контент не затронут

---

# Шаг G: Задача 11 — Тестирование

### Что делаю

Проверяю все изменения по чек-листу. Исправляю найденные проблемы.

### Чек-лист

| # | Тест | Как проверяю |
|---|------|-------------|
| 1 | Создание нового урока | Открываю `/course-constructor`, создаю урок. Проверяю: `introduction` НЕ в левой панели, основные блоки на месте |
| 2 | Тезисы — layout | Кликаю на `main_block_1`. Проверяю: двухколоночный layout, слева панель тезисов |
| 3 | Тезисы — ввод | Печатаю текст в тезисы. Проверяю: текст сохраняется, при перезагрузке восстанавливается |
| 4 | Тезисы — ИИ | Нажимаю «Структурировать». Проверяю: запрос уходит, результат появляется в textarea |
| 5 | Тезисы — только для main | Кликаю на `intermediate_practice`. Проверяю: одна колонка, без тезисов |
| 6 | Финальная настройка — порог | Набираю <500 символов. Проверяю: секция скрыта. Набираю ≥500. Проверяю: секция появляется |
| 7 | Финальная настройка — UI | Проверяю: карточка «Как работать с уроком» видна, кнопка «Заполнить» |
| 8 | Редактор introduction | Кликаю «Заполнить». Проверяю: раскрывается редактор, info-блок, шаблоны, textarea |
| 9 | ИИ-генерация мета | Выбираю шаблон, нажимаю «Сгенерировать». Проверяю: текст появляется в textarea |
| 10 | Ограничение элементов | В редакторе introduction проверяю: нет кнопок «Тест», «Практика», «Задание» |
| 11 | Сохранение | Сохраняю курс. Перезагружаю. Проверяю: все данные на месте (тезисы, introduction) |
| 12 | Существующий курс | Открываю ранее созданный курс. Проверяю: работает без ошибок, introduction скрыт |
| 13 | Студент — стили | Открываю `/course/[id]/learn`. Проверяю: introduction отображается с голубым фоном и рамкой |
| 14 | Студент — порядок | Проверяю: introduction идёт первым, перед основными блоками |
| 15 | Адаптации | Переключаю режимы (visual/auditory/kinesthetic). Проверяю: адаптации не сломались |
| 16 | Автосохранение | Жду 5 минут или триггерю. Проверяю: новые поля сохранились |
| 17 | Сборка | Запускаю `npm run build`. Проверяю: нет ошибок TypeScript |

---

# Сводка файлов

## Изменяемые файлы

| Файл | Задачи | Объём |
|------|--------|-------|
| `lib/course-constructor-logic.ts` | A | +2 поля в интерфейс, +category в baseBlocks |
| `app/course-constructor/page.tsx` | 1-8 | Основной объём: layout, секция, фильтрация, ограничения, состояния, функции |
| `app/course/[courseId]/learn/page.tsx` | 10 | Функция переупорядочивания блоков |
| `components/ui/unified-adaptation.tsx` | 9 | Стили мета-блока для ученика |

## Новые файлы

| Файл | Задача | Строк |
|------|--------|-------|
| `app/api/ai-structure-theses/route.ts` | 2 | ~80 |
| `app/api/ai-generate-meta/route.ts` | 7 | ~120 |

## Файлы без изменений

| Файл | Почему не трогаем |
|------|-------------------|
| `app/api/ai-adaptation/route.ts` | Адаптации не затронуты |
| `app/api/transcribe/route.ts` | Голосовая запись не в спринте |
| `components/test-creator.tsx` | Тесты не меняем |
| `components/adaptation/blocks/*` | Компоненты блоков не меняем |
| `styles/globals.css` | Все стили через Tailwind классы |
| Таблицы Supabase | JSONB гибкий, миграции не нужны |
