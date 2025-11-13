# 📊 План реализации: Бизнес-аналитика и отчётность для дашборда автора

## 🎯 Цель
Доработать дашборд автора с базовой статистикой: количество учеников, количество курсов, доход, и статистика по ученикам из CRM системы.

## 📋 Текущее состояние

### Что уже есть:
1. ✅ Базовая статистика на дашборде (`app/dashboard/page.tsx`)
   - Количество учеников (из `student_sessions`)
   - Количество курсов (из `courses`)
   - Количество опубликованных курсов
   - Средний прогресс

2. ✅ CRM система (`scripts/21-add-crm-features.sql`)
   - Таблица `student_course_access` с полями:
     - `total_time_spent` - время изучения
     - `progress` - прогресс прохождения
     - `first_accessed_at` - дата первого доступа
     - `last_accessed_at` - дата последней активности

3. ✅ API статистики студентов (`app/api/student-statistics/route.ts`)
   - Возвращает статистику по ученикам из CRM системы
   - Учитывает время изучения, прогресс, тип студента

4. ✅ Система оплаты (`scripts/23-add-payment-system.sql`)
   - Таблица `course_purchases` - покупки курсов
   - Таблица `course_pricing` - тарифы курсов с ценами
   - Связь: `course_purchases.pricing_id` → `course_pricing.id`

### Что нужно доработать:
1. ❌ Доход не рассчитывается и не отображается
2. ❌ Количество студентов берется из `student_sessions`, нужно из `student_course_access`
3. ❌ Статистика покупок загружается только в `handleRetry`, но не в основном `loadDashboardData`
4. ❌ Нет интеграции с CRM системой для отображения статистики студентов на дашборде

## 🔧 План реализации

### 1. Обновление интерфейса статистики

**Файл**: `app/dashboard/page.tsx`

**Изменения**:
- Добавить поле `totalRevenue` в интерфейс `DashboardStats`
- Добавить поле `totalRevenueFormatted` для форматированного отображения дохода

```typescript
interface DashboardStats {
  totalStudents: number
  totalCourses: number
  publishedCourses: number
  averageProgress: number
  totalPurchases?: number
  purchasesWithFeedback?: number
  streamCourses?: number
  totalRevenue?: number  // НОВОЕ: общий доход
  totalRevenueFormatted?: string  // НОВОЕ: доход в формате "1 000 ₽"
}
```

### 2. Расчет дохода из покупок

**Файл**: `app/dashboard/page.tsx`

**Изменения в функции `loadDashboardData`**:
- Добавить запрос к таблице `course_purchases` с JOIN к `course_pricing`
- Рассчитать общий доход: сумма всех `price` из `course_pricing` для завершенных покупок (`purchase_status = 'completed'`)
- Форматировать доход в читаемый формат (например, "1 000 ₽")

**Логика расчета**:
```sql
SELECT 
  SUM(cp.price) as total_revenue
FROM course_purchases p
JOIN course_pricing cp ON p.pricing_id = cp.id
WHERE p.course_id IN (published_course_ids)
  AND p.purchase_status = 'completed'
```

### 3. Исправление расчета количества студентов

**Файл**: `app/dashboard/page.tsx`

**Изменения**:
- Заменить запрос к `student_sessions` на запрос к `student_course_access`
- Использовать `student_course_access` для подсчета уникальных студентов
- Учитывать только опубликованные курсы

**Логика расчета**:
```sql
SELECT 
  COUNT(DISTINCT student_id) as total_students
FROM student_course_access
WHERE course_id IN (published_course_ids)
```

### 4. Добавление карточки с доходом

**Файл**: `app/dashboard/page.tsx`

**Изменения в UI**:
- Добавить новую карточку статистики с доходом
- Использовать иконку для дохода (например, `DollarSignIcon` или `TrendingUpIcon`)
- Отображать доход в формате "1 000 ₽"

**Размещение**:
- Добавить карточку после карточки "Средний прогресс"
- Изменить grid с 4 колонок на 5 колонок (или оставить 4 и добавить карточку отдельно)

### 5. Исправление загрузки статистики покупок

**Файл**: `app/dashboard/page.tsx`

**Изменения**:
- Переместить загрузку статистики покупок из `handleRetry` в основной `loadDashboardData`
- Убрать дублирование кода
- Унифицировать загрузку всех статистических данных

### 6. Интеграция с CRM системой (опционально)

**Файл**: `app/dashboard/page.tsx`

**Изменения**:
- Добавить возможность просмотра краткой статистики по ученикам из CRM системы
- Использовать существующий API `/api/student-statistics` для получения данных
- Отображать топ-5 учеников по прогрессу или времени изучения

**Вариант реализации**:
- Добавить секцию "Топ учеников" на дашборд
- Показать краткую статистику: имя, прогресс, время изучения
- Добавить ссылку на полную статистику в `/students`

## 📝 Детальный план изменений

### Шаг 1: Обновление интерфейса и состояния

**Файл**: `app/dashboard/page.tsx`

1. Обновить интерфейс `DashboardStats`:
   ```typescript
   interface DashboardStats {
     totalStudents: number
     totalCourses: number
     publishedCourses: number
     averageProgress: number
     totalPurchases?: number
     purchasesWithFeedback?: number
     streamCourses?: number
     totalRevenue?: number
     totalRevenueFormatted?: string
   }
   ```

2. Обновить начальное состояние:
   ```typescript
   const [stats, setStats] = useState<DashboardStats>({
     totalStudents: 0,
     totalCourses: 0,
     publishedCourses: 0,
     averageProgress: 0,
     totalPurchases: 0,
     purchasesWithFeedback: 0,
     streamCourses: 0,
     totalRevenue: 0,
     totalRevenueFormatted: "0 ₽",
   })
   ```

### Шаг 2: Создание функции форматирования дохода

**Файл**: `app/dashboard/page.tsx`

Добавить функцию для форматирования дохода:
```typescript
function formatRevenue(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
```

### Шаг 3: Обновление функции `loadDashboardData`

**Файл**: `app/dashboard/page.tsx`

1. Заменить запрос к `student_sessions` на запрос к `student_course_access`:
   ```typescript
   // Старый код (удалить):
   const { data: sessionsData, error: sessionsError } = await supabase
     .from("student_sessions")
     .select("progress")
     .in("course_id", publishedCourseIds)

   // Новый код:
   const { data: accessData, error: accessError } = await supabase
     .from("student_course_access")
     .select("student_id, progress")
     .in("course_id", publishedCourseIds)

   // Подсчет уникальных студентов
   const uniqueStudents = new Set(accessData?.map(a => a.student_id) || [])
   totalStudents = uniqueStudents.size

   // Расчет среднего прогресса
   if (accessData && accessData.length > 0) {
     // Логика расчета прогресса из CRM системы
     // Использовать функцию calculateProgress из API
   }
   ```

2. Добавить расчет дохода:
   ```typescript
   // Загрузка покупок с тарифами
   const { data: purchasesData, error: purchasesError } = await supabase
     .from("course_purchases")
     .select(`
       id,
       purchase_status,
       course_pricing (
         price
       )
     `)
     .in("course_id", publishedCourseIds)
     .eq("purchase_status", "completed")

   // Расчет дохода
   let totalRevenue = 0
   if (purchasesData && !purchasesError) {
     totalRevenue = purchasesData.reduce((sum, purchase) => {
       const price = purchase.course_pricing?.price || 0
       return sum + Number(price)
     }, 0)
   }

   const totalRevenueFormatted = formatRevenue(totalRevenue)
   ```

3. Обновить установку статистики:
   ```typescript
   setStats({
     totalStudents,
     totalCourses,
     publishedCourses,
     averageProgress,
     totalPurchases: purchasesData?.length || 0,
     purchasesWithFeedback: purchasesData?.filter(
       (p: any) => p.course_pricing?.has_feedback
     ).length || 0,
     streamCourses: coursesData.filter(
       (c) => c.launch_mode === "stream" && c.is_published
     ).length,
     totalRevenue,
     totalRevenueFormatted,
   })
   ```

### Шаг 4: Добавление карточки с доходом

**Файл**: `app/dashboard/page.tsx`

1. Добавить импорт иконки для дохода:
   ```typescript
   import { DollarSignIcon } from "@/components/ui/icons"
   // Или использовать существующую иконку TrendingUpIcon
   ```

2. Добавить карточку в grid статистики:
   ```typescript
   <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
     <CardContent className="p-6">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm font-semibold text-primary mb-2">Доход</p>
           <p className="text-3xl font-bold text-slate-900">{stats.totalRevenueFormatted || "0 ₽"}</p>
         </div>
         <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
           <DollarSignIcon className="w-7 h-7 text-white" />
         </div>
       </div>
     </CardContent>
   </Card>
   ```

3. Обновить grid для размещения 5 карточек:
   ```typescript
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8">
     {/* Карточки статистики */}
   </div>
   ```

### Шаг 5: Удаление дублирования кода

**Файл**: `app/dashboard/page.tsx`

1. Удалить дублирование в функции `handleRetry`
2. Унифицировать загрузку статистики в одной функции
3. Убрать повторяющийся код из `handleRetry`

### Шаг 6: Добавление иконки для дохода (если нужно)

**Файл**: `components/ui/icons.tsx`

Добавить иконку `DollarSignIcon` или использовать существующую иконку `TrendingUpIcon`.

## 🎨 UI изменения

### Текущий вид статистики:
- 4 карточки в grid: Ученики, Курсы, Опубликовано, Прогресс

### Новый вид статистики:
- 5 карточек в grid: Ученики, Курсы, Опубликовано, Прогресс, Доход
- Или оставить 4 карточки и добавить доход отдельно

### Карточка дохода:
```
┌─────────────────┐
│  Доход          │
│  1 000 ₽        │
│  [Иконка]       │
└─────────────────┘
```

## 🔍 Проверка данных

### Источники данных:
1. **Количество студентов**: `student_course_access` (уникальные `student_id`)
2. **Количество курсов**: `courses` (где `author_id = user.id`)
3. **Доход**: `course_purchases` + `course_pricing` (сумма `price` для `purchase_status = 'completed'`)
4. **Статистика студентов**: API `/api/student-statistics` (уже реализовано)

### Условия фильтрации:
- Только опубликованные курсы (`is_published = true`)
- Только завершенные покупки (`purchase_status = 'completed'`)
- Только курсы автора (и соавтора)

## 🚀 Последовательность реализации

1. ✅ Обновить интерфейс `DashboardStats`
2. ✅ Добавить функцию форматирования дохода
3. ✅ Обновить функцию `loadDashboardData` для расчета дохода
4. ✅ Исправить расчет количества студентов (использовать `student_course_access`)
5. ✅ Добавить карточку с доходом в UI
6. ✅ Удалить дублирование кода
7. ✅ Протестировать загрузку статистики

## 📊 Ожидаемый результат

### Статистика на дашборде:
1. **Всего учеников** - количество уникальных студентов из `student_course_access`
2. **Курсов создано** - количество курсов автора
3. **Опубликовано** - количество опубликованных курсов
4. **Средний прогресс** - средний прогресс студентов из CRM системы
5. **Доход** - общий доход от всех завершенных покупок (НОВОЕ)

### Данные из CRM системы:
- Время изучения (`total_time_spent`)
- Прогресс прохождения (`progress`)
- Тип студента (`student_type`)
- Дата регистрации (`first_accessed_at`)
- Последняя активность (`last_accessed_at`)

## 🔒 Безопасность

### Проверки доступа:
- Только автор может видеть статистику своих курсов
- Учитываются курсы соавтора
- Используется RLS для проверки доступа к данным

### Валидация данных:
- Проверка на `null` и `undefined`
- Форматирование чисел для отображения
- Обработка ошибок при загрузке данных

## 📝 Примечания

1. **Валюта**: По умолчанию используется RUB (рубль), можно изменить на другую валюту
2. **Форматирование**: Доход форматируется с помощью `Intl.NumberFormat`
3. **Кэширование**: Статистика загружается при каждом открытии дашборда
4. **Производительность**: Запросы выполняются параллельно для ускорения загрузки

## ✅ Чек-лист проверки

- [ ] Доход рассчитывается корректно
- [ ] Количество студентов берется из `student_course_access`
- [ ] Статистика покупок загружается в основном `loadDashboardData`
- [ ] Карточка с доходом отображается на дашборде
- [ ] Данные из CRM системы используются корректно
- [ ] Нет дублирования кода
- [ ] Обработка ошибок работает корректно
- [ ] UI выглядит корректно на всех устройствах

---

**Готов к реализации**: ✅
**Требуется согласование**: ⏳

