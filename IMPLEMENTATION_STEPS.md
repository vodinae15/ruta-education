# 🚀 Пошаговый план реализации: Бизнес-аналитика и отчётность

## 📋 Согласованные требования

✅ Добавить 5-ю карточку с доходом  
✅ Валюта: рубли (RUB)  
✅ Формат: только рубли (без копеек)  
✅ Краткая статистика студентов на дашборде (без ссылок)

---

## 📝 Этап 1: Обновление интерфейсов и типов

### Задача 1.1: Обновить интерфейс `DashboardStats`

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти интерфейс `DashboardStats` (строки ~41-49)
2. Добавить новые поля:
   ```typescript
   interface DashboardStats {
     totalStudents: number
     totalCourses: number
     publishedCourses: number
     averageProgress: number
     totalPurchases?: number
     purchasesWithFeedback?: number
     streamCourses?: number
     totalRevenue?: number              // НОВОЕ
     totalRevenueFormatted?: string     // НОВОЕ
   }
   ```

**Ожидаемый результат**: Интерфейс содержит поля для дохода

---

### Задача 1.2: Обновить начальное состояние статистики

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти инициализацию `stats` (строки ~55-63)
2. Добавить новые поля:
   ```typescript
   const [stats, setStats] = useState<DashboardStats>({
     totalStudents: 0,
     totalCourses: 0,
     publishedCourses: 0,
     averageProgress: 0,
     totalPurchases: 0,
     purchasesWithFeedback: 0,
     streamCourses: 0,
     totalRevenue: 0,              // НОВОЕ
     totalRevenueFormatted: "0 ₽", // НОВОЕ
   })
   ```

**Ожидаемый результат**: Начальное состояние содержит поля для дохода

---

## 📝 Этап 2: Создание функции форматирования дохода

### Задача 2.1: Добавить функцию `formatRevenue`

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Добавить функцию форматирования дохода после импортов (перед компонентом `DashboardPage`)
2. Реализовать функцию:
   ```typescript
   function formatRevenue(amount: number): string {
     // Форматируем число с пробелами в качестве разделителей тысяч
     const formatted = new Intl.NumberFormat('ru-RU', {
       style: 'decimal',
       minimumFractionDigits: 0,
       maximumFractionDigits: 0,
     }).format(amount)
     
     return `${formatted} ₽`
   }
   ```

**Ожидаемый результат**: Функция форматирует число в строку вида "1 000 ₽"

**Тестовые случаи**:
- `formatRevenue(0)` → `"0 ₽"`
- `formatRevenue(1000)` → `"1 000 ₽"`
- `formatRevenue(1000000)` → `"1 000 000 ₽"`

---

## 📝 Этап 3: Обновление функции `loadDashboardData`

### Задача 3.1: Исправить расчет количества студентов

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти расчет количества студентов (строки ~192-208)
2. Заменить запрос к `student_sessions` на запрос к `student_course_access`:
   ```typescript
   // СТАРЫЙ КОД (удалить):
   const { data: sessionsData, error: sessionsError } = await supabase
     .from("student_sessions")
     .select("progress")
     .in("course_id", publishedCourseIds)

   if (sessionsError) throw sessionsError

   totalStudents = sessionsData?.length || 0
   if (sessionsData && sessionsData.length > 0) {
     const totalProgress = sessionsData.reduce((sum, session) => sum + (session.progress || 0), 0)
     averageProgress = Math.round(totalProgress / sessionsData.length)
   }

   // НОВЫЙ КОД:
   const { data: accessData, error: accessError } = await supabase
     .from("student_course_access")
     .select("student_id, progress")
     .in("course_id", publishedCourseIds)

   if (accessError) throw accessError

   // Подсчет уникальных студентов
   const uniqueStudents = new Set(accessData?.map(a => a.student_id) || [])
   totalStudents = uniqueStudents.size

   // Расчет среднего прогресса
   if (accessData && accessData.length > 0) {
     // Извлекаем прогресс из JSONB поля
     const progressValues = accessData
       .map(access => {
         if (!access.progress || typeof access.progress !== 'object') return 0
         
         // Проверяем разные форматы прогресса
         if (typeof access.progress.progress_percentage === 'number') {
           return access.progress.progress_percentage
         }
         
         if (Array.isArray(access.progress.completed_lessons)) {
           // Если есть информация о количестве уроков, можно рассчитать процент
           // Пока просто возвращаем количество завершенных уроков
           return access.progress.completed_lessons.length * 10 // Примерная оценка
         }
         
         // Подсчитываем завершенные уроки из объекта
         const completedCount = Object.keys(access.progress).filter(key => {
           const lesson = access.progress[key]
           return lesson && (lesson.completed === true || lesson.completed === 'true' || lesson.status === 'completed')
         }).length
         
         return completedCount * 10 // Примерная оценка
       })
       .filter(p => p > 0)
     
     if (progressValues.length > 0) {
       const totalProgress = progressValues.reduce((sum, p) => sum + p, 0)
       averageProgress = Math.round(totalProgress / progressValues.length)
       // Ограничиваем максимальное значение 100%
       averageProgress = Math.min(100, averageProgress)
     }
   }
   ```

**Ожидаемый результат**: Количество студентов берется из `student_course_access`, учитываются только уникальные студенты

---

### Задача 3.2: Добавить расчет дохода

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти место после расчета статистики покупок (строки ~393-410)
2. Добавить расчет дохода:
   ```typescript
   // Расчет дохода из покупок
   let totalRevenue = 0
   if (publishedCourseIds.length > 0) {
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

     if (!purchasesError && purchasesData) {
       // Суммируем доход из всех завершенных покупок
       totalRevenue = purchasesData.reduce((sum, purchase) => {
         const price = purchase.course_pricing?.price || 0
         return sum + Number(price)
       }, 0)
     }
   }

   const totalRevenueFormatted = formatRevenue(totalRevenue)
   ```

**Ожидаемый результат**: Доход рассчитывается из завершенных покупок

---

### Задача 3.3: Обновить установку статистики

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти `setStats` в функции `loadDashboardData` (строки ~210-215)
2. Обновить установку статистики:
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
     totalRevenue,              // НОВОЕ
     totalRevenueFormatted,     // НОВОЕ
   })
   ```

**Ожидаемый результат**: Статистика содержит данные о доходе

---

### Задача 3.4: Обновить функцию `handleRetry`

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти функцию `handleRetry` (строки ~285-433)
2. Обновить расчет статистики в `handleRetry` аналогично `loadDashboardData`:
   - Использовать `student_course_access` вместо `student_sessions`
   - Добавить расчет дохода
   - Обновить установку статистики с новыми полями

**Ожидаемый результат**: Функция `handleRetry` использует ту же логику, что и `loadDashboardData`

---

## 📝 Этап 4: Обновление UI - добавление карточки с доходом

### Задача 4.1: Проверить наличие иконки для дохода

**Файл**: `components/ui/icons.tsx`

**Действия**:
1. Открыть файл `components/ui/icons.tsx`
2. Проверить наличие иконки `DollarSignIcon` или `CurrencyIcon`
3. Если нет - использовать существующую иконку `TrendingUpIcon` или `BarChartIcon`

**Ожидаемый результат**: Определена иконка для отображения дохода

---

### Задача 4.2: Обновить grid статистики

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти grid статистики (строки ~517)
2. Изменить grid с 4 колонок на 5 колонок:
   ```typescript
   // БЫЛО:
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">

   // СТАЛО:
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8">
   ```

**Ожидаемый результат**: Grid поддерживает 5 карточек

---

### Задача 4.3: Добавить карточку с доходом

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти место после карточки "Средний прогресс" (после строки ~588)
2. Добавить новую карточку:
   ```typescript
   <Card className="bg-white border-2 hover:border-primary/20 transition-colors rounded-lg shadow-ruta-sm">
     <CardContent className="p-6">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm font-semibold text-primary mb-2">Доход</p>
           <p className="text-3xl font-bold text-slate-900">{stats.totalRevenueFormatted || "0 ₽"}</p>
         </div>
         <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
           <TrendingUpIcon className="w-7 h-7 text-white" />
         </div>
       </div>
     </CardContent>
   </Card>
   ```

**Ожидаемый результат**: Карточка с доходом отображается на дашборде

---

### Задача 4.4: Обновить загрузочные состояния

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Найти загрузочные состояния для карточек статистики (строки ~518-529)
2. Обновить количество загрузочных карточек с 4 на 5:
   ```typescript
   // БЫЛО:
   {[1, 2, 3, 4].map((i) => (
     <Card key={i} ...>
       ...
     </Card>
   ))}

   // СТАЛО:
   {[1, 2, 3, 4, 5].map((i) => (
     <Card key={i} ...>
       ...
     </Card>
   ))}
   ```

**Ожидаемый результат**: При загрузке отображается 5 карточек-скелетонов

---

## 📝 Этап 5: Добавление краткой статистики студентов

### Задача 5.1: Создать компонент краткой статистики студентов

**Файл**: `components/ui/student-stats-summary.tsx` (новый файл)

**Действия**:
1. Создать новый файл `components/ui/student-stats-summary.tsx`
2. Создать компонент для отображения краткой статистики:
   ```typescript
   "use client"

   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
   import { UserIcon, TrendingUpIcon, ClockIcon } from "@/components/ui/icons"
   import { Progress } from "@/components/ui/progress"

   interface StudentStatsSummaryProps {
     totalStudents: number
     averageProgress: number
     topStudents?: Array<{
       email: string
       progress: number
       timeSpentFormatted: string
     }>
     loading?: boolean
   }

   export function StudentStatsSummary({
     totalStudents,
     averageProgress,
     topStudents = [],
     loading = false
   }: StudentStatsSummaryProps) {
     if (loading) {
       return (
         <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
           <CardContent className="p-6">
             <div className="animate-pulse space-y-4">
               <div className="h-4 bg-slate-200 rounded w-1/3"></div>
               <div className="h-8 bg-slate-200 rounded w-1/2"></div>
             </div>
           </CardContent>
         </Card>
       )
     }

     return (
       <Card className="bg-white border-2 rounded-lg shadow-ruta-sm">
         <CardHeader>
           <CardTitle className="text-xl text-primary font-bold flex items-center gap-2">
             <UserIcon className="w-5 h-5" />
             Статистика учеников
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Общая статистика */}
           <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-light-blue/30 rounded-lg">
               <p className="text-sm text-slate-600 mb-1">Всего учеников</p>
               <p className="text-2xl font-bold text-primary">{totalStudents}</p>
             </div>
             <div className="p-4 bg-light-blue/30 rounded-lg">
               <p className="text-sm text-slate-600 mb-1">Средний прогресс</p>
               <p className="text-2xl font-bold text-primary">{averageProgress}%</p>
               <Progress value={averageProgress} className="mt-2 h-2" />
             </div>
           </div>

           {/* Топ учеников */}
           {topStudents.length > 0 && (
             <div className="space-y-3">
               <p className="text-sm font-semibold text-slate-700">Топ учеников по прогрессу</p>
               <div className="space-y-2">
                 {topStudents.slice(0, 5).map((student, index) => (
                   <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                         {index + 1}
                       </div>
                       <div>
                         <p className="text-sm font-medium text-slate-900">{student.email}</p>
                         <div className="flex items-center gap-2 text-xs text-slate-600">
                           <ClockIcon className="w-3 h-3" />
                           <span>{student.timeSpentFormatted}</span>
                         </div>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-primary">{student.progress}%</p>
                       <Progress value={student.progress} className="mt-1 h-1 w-20" />
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </CardContent>
       </Card>
     )
   }
   ```

**Ожидаемый результат**: Создан компонент для отображения краткой статистики студентов

---

### Задача 5.2: Добавить загрузку статистики студентов в дашборд

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Добавить состояние для статистики студентов:
   ```typescript
   const [studentStats, setStudentStats] = useState<{
     totalStudents: number
     averageProgress: number
     topStudents: Array<{
       email: string
       progress: number
       timeSpentFormatted: string
     }>
   }>({
     totalStudents: 0,
     averageProgress: 0,
     topStudents: []
   })
   const [studentStatsLoading, setStudentStatsLoading] = useState(false)
   ```

2. Добавить функцию загрузки статистики студентов:
   ```typescript
   const loadStudentStats = async () => {
     if (!user) return
     
     try {
       setStudentStatsLoading(true)
       const response = await fetch("/api/student-statistics")
       
       if (!response.ok) {
         throw new Error("Не удалось загрузить статистику студентов")
       }
       
       const data = await response.json()
       
       if (data.students && data.students.length > 0) {
         // Сортируем студентов по прогрессу
         const sortedStudents = data.students
           .sort((a: any, b: any) => b.progress - a.progress)
           .slice(0, 5) // Топ 5
         
         // Рассчитываем средний прогресс
         const avgProgress = data.students.reduce((sum: number, student: any) => sum + student.progress, 0) / data.students.length
         
         setStudentStats({
           totalStudents: data.students.length,
           averageProgress: Math.round(avgProgress),
           topStudents: sortedStudents.map((student: any) => ({
             email: student.email,
             progress: student.progress,
             timeSpentFormatted: student.timeSpentFormatted
           }))
         })
       }
     } catch (error) {
       console.error("Error loading student stats:", error)
     } finally {
       setStudentStatsLoading(false)
     }
   }
   ```

3. Вызвать функцию загрузки статистики студентов в `useEffect`:
   ```typescript
   useEffect(() => {
     // ... существующий код ...
     
     if (user && !authLoading) {
       loadDashboardData()
       loadStudentStats() // НОВОЕ
     }
   }, [user, authLoading, router])
   ```

**Ожидаемый результат**: Статистика студентов загружается при открытии дашборда

---

### Задача 5.3: Добавить компонент статистики студентов в UI

**Файл**: `app/dashboard/page.tsx`

**Действия**:
1. Импортировать компонент:
   ```typescript
   import { StudentStatsSummary } from "@/components/ui/student-stats-summary"
   ```

2. Добавить компонент на дашборд после карточек статистики (после строки ~591):
   ```typescript
   {/* Student Statistics Summary */}
   <div className="mb-8">
     <StudentStatsSummary
       totalStudents={studentStats.totalStudents}
       averageProgress={studentStats.averageProgress}
       topStudents={studentStats.topStudents}
       loading={studentStatsLoading}
     />
   </div>
   ```

**Ожидаемый результат**: Краткая статистика студентов отображается на дашборде

---

## 📝 Этап 6: Тестирование и проверка

### Задача 6.1: Проверка расчета дохода

**Действия**:
1. Создать тестовый курс с тарифами
2. Создать тестовые покупки
3. Проверить расчет дохода на дашборде
4. Убедиться, что доход отображается корректно

**Ожидаемый результат**: Доход рассчитывается и отображается корректно

---

### Задача 6.2: Проверка расчета количества студентов

**Действия**:
1. Создать тестовых студентов
2. Предоставить доступ к курсам
3. Проверить количество студентов на дашборде
4. Убедиться, что учитываются только уникальные студенты

**Ожидаемый результат**: Количество студентов рассчитывается корректно

---

### Задача 6.3: Проверка отображения статистики студентов

**Действия**:
1. Проверить загрузку статистики студентов
2. Убедиться, что топ-5 студентов отображается корректно
3. Проверить отображение среднего прогресса
4. Убедиться, что время изучения отображается корректно

**Ожидаемый результат**: Статистика студентов отображается корректно

---

### Задача 6.4: Проверка адаптивности UI

**Действия**:
1. Проверить отображение на мобильных устройствах
2. Проверить отображение на планшетах
3. Проверить отображение на десктопе
4. Убедиться, что grid корректно адаптируется

**Ожидаемый результат**: UI корректно отображается на всех устройствах

---

## 📝 Этап 7: Оптимизация и рефакторинг

### Задача 7.1: Удаление дублирования кода

**Действия**:
1. Проверить функции `loadDashboardData` и `handleRetry`
2. Вынести общую логику в отдельную функцию
3. Убедиться, что нет дублирования кода

**Ожидаемый результат**: Код не содержит дублирования

---

### Задача 7.2: Оптимизация запросов

**Действия**:
1. Проверить количество запросов к базе данных
2. Объединить запросы, где возможно
3. Использовать параллельные запросы, где возможно

**Ожидаемый результат**: Запросы оптимизированы

---

### Задача 7.3: Обработка ошибок

**Действия**:
1. Проверить обработку ошибок при загрузке данных
2. Добавить обработку ошибок, где необходимо
3. Убедиться, что пользователь видит понятные сообщения об ошибках

**Ожидаемый результат**: Ошибки обрабатываются корректно

---

## ✅ Чек-лист проверки

### Функциональность
- [ ] Доход рассчитывается корректно
- [ ] Количество студентов берется из `student_course_access`
- [ ] Статистика студентов загружается корректно
- [ ] Топ-5 студентов отображается корректно
- [ ] Средний прогресс рассчитывается корректно

### UI
- [ ] Карточка с доходом отображается на дашборде
- [ ] Краткая статистика студентов отображается на дашборде
- [ ] Grid корректно адаптируется на разных устройствах
- [ ] Загрузочные состояния отображаются корректно

### Производительность
- [ ] Запросы оптимизированы
- [ ] Нет дублирования кода
- [ ] Ошибки обрабатываются корректно

---

## 🚀 Порядок выполнения

1. **Этап 1**: Обновление интерфейсов и типов
2. **Этап 2**: Создание функции форматирования дохода
3. **Этап 3**: Обновление функции `loadDashboardData`
4. **Этап 4**: Обновление UI - добавление карточки с доходом
5. **Этап 5**: Добавление краткой статистики студентов
6. **Этап 6**: Тестирование и проверка
7. **Этап 7**: Оптимизация и рефакторинг

---

## 📝 Примечания

- Все изменения должны быть протестированы на разных устройствах
- Необходимо убедиться, что нет дублирования кода
- Ошибки должны обрабатываться корректно
- UI должен быть адаптивным

---

**Готов к реализации**: ✅

