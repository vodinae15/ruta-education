# 🎨 **Примеры дизайна Ruta Education**

## 📋 **Готовые макеты и паттерны**

### **1. Hero Section (Главная секция)**

```tsx
<section className="bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
    <div className="text-center">
      {/* Заголовок */}
      <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-6">
        Образовательная платформа&nbsp;
        <br />
        <span className="text-primary">с двойной персонализацией</span>
      </h1>

      {/* Описательный блок */}
      <div className="bg-light-blue rounded-2xl p-6 sm:p-8 lg:p-10 mb-8 sm:mb-12 lg:mb-16 max-w-4xl mx-auto">
        <p className="text-xl lg:text-2xl text-slate-900 font-medium">
          Ruta.education адаптирует коммуникацию{" "}
          <span className="text-primary">под&nbsp;стиль преподавателя</span> и&nbsp;тип восприятия каждого
          ученика&nbsp;— один курс дает <span className="text-primary">72&nbsp;варианта подачи материала</span>{" "}
          для&nbsp;максимальной эффективности обучения
        </p>
      </div>

      {/* Кнопки */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
        <Button size="lg" asChild>
          <Link href="/auth">Начать использовать платформу</Link>
        </Button>
        <Button variant="secondary" size="lg" asChild>
          <Link href="#why-it-works">Как это работает</Link>
        </Button>
      </div>
    </div>
  </div>
</section>
```

**Ключевые особенности:**
- Белый фон для контраста
- Крупный заголовок с акцентами
- Выделенный блок с светло-голубым фоном
- Две кнопки: primary и secondary

---

### **2. Секция с переключателем вкладок**

```tsx
<section className="py-8 sm:py-10 lg:py-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Заголовок секции */}
    <div className="text-center mb-6">
      <h2 className="text-3xl lg:text-4xl font-bold mb-4">
        <span className="text-primary">Принцип</span> двойной персонализации
      </h2>
      <p className="text-lg text-slate-600 max-w-3xl mx-auto">
        Платформа определяет тип автора и&nbsp;локализует коммуникацию для&nbsp;каждого участника процесса.
        Преподаватель и&nbsp;студенты получают то, что близко именно им
      </p>
    </div>

    {/* Переключатель вкладок */}
    <div className="flex justify-center mb-10">
      <div className="bg-light-gray rounded-lg p-1 flex">
        <button className="px-6 py-3 rounded-md font-medium bg-white text-primary shadow-sm">
          Для преподавателей
        </button>
        <button className="px-6 py-3 rounded-md font-medium text-slate-600 hover:text-slate-900">
          Для студентов
        </button>
      </div>
    </div>

    {/* Сетка карточек */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {/* Карточки процесса */}
    </div>
  </div>
</section>
```

**Ключевые особенности:**
- Кремовый фон секции
- Центрированный переключатель вкладок
- 4-колоночная сетка карточек
- Адаптивные отступы

---

### **3. Карточка процесса**

```tsx
<Card className="text-center border-2 hover:border-primary/20 transition-colors h-full">
  <CardHeader className="pb-4">
    {/* Иконка */}
    <div className="w-14 h-14 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-4">
      <UserIcon className="w-7 h-7 text-white" />
    </div>
    
    {/* Заголовок */}
    <CardTitle className="text-lg text-primary">
      Пройдите тест на тип автора
    </CardTitle>
  </CardHeader>
  
  {/* Описание */}
  <CardContent className="text-sm text-slate-600 space-y-2 text-center">
    <p>Определите свой стиль и начните работать с&nbsp;персонализированными рекомендациями</p>
  </CardContent>
</Card>
```

**Ключевые особенности:**
- Круглая иконка с основным цветом
- Hover-эффект на границе
- Одинаковая высота карточек
- Центрированный текст

---

### **4. Секция статистики**

```tsx
<section className="bg-white py-8 sm:py-10 lg:py-12">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    {/* Заголовок */}
    <h2 className="text-3xl lg:text-4xl font-bold mb-6">
      <span className="text-primary">Почему</span> это работает
    </h2>
    
    {/* Описание */}
    <div className="text-lg text-slate-600 max-w-3xl mx-auto">
      <p>
        Ruta.education адаптирует один курс <span className="text-primary">под&nbsp;стиль автора</span> и&nbsp;
        <span className="text-primary">тип восприятия учеников</span>
      </p>
    </div>
    
    {/* Статистика */}
    <div className="mt-16">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUpIcon className="w-10 h-10 text-white" />
          </div>
          <div className="text-4xl font-bold text-primary mb-2">8 типов</div>
          <p className="text-slate-600 font-medium">авторов с персонализированными конструкторами</p>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-10 h-10 text-white" />
          </div>
          <div className="text-4xl font-bold text-primary mb-2">9 типов</div>
          <p className="text-slate-600 font-medium">учеников с адаптивным контентом</p>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 bg-[#659AB8] rounded-full flex items-center justify-center mx-auto mb-6">
            <BookIcon className="w-10 h-10 text-white" />
          </div>
          <div className="text-4xl font-bold text-primary mb-2">72 подхода</div>
          <p className="text-slate-600 font-medium">к обучению и прохождению курсов</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Ключевые особенности:**
- Белый фон для контраста
- 3-колоночная сетка статистики
- Крупные круглые иконки
- Большие цифры с акцентным цветом

---

### **5. CTA секция**

```tsx
<section className="bg-light-blue py-8 sm:py-10 lg:py-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="max-w-3xl">
      <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
        <span className="text-primary">Создайте</span> свой первый курс
        <br />
        за 15 минут
      </h2>
      <p className="text-lg text-slate-600 mb-10">
        Пройдите тест, выберите шаблон и&nbsp;наполните курс контентом. Система сама адаптирует материал
        под&nbsp;разные типы восприятия студентов
      </p>
      <Button size="lg" asChild>
        <Link href="/auth">Начать создание курса</Link>
      </Button>
    </div>
  </div>
</section>
```

**Ключевые особенности:**
- Светло-голубой фон
- Узкий контейнер для текста
- Крупная кнопка призыва к действию
- Многострочный заголовок

---

### **6. Footer**

```tsx
<footer className="bg-light-gray py-6 sm:py-8">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Image
          src="/images/ruta-logo-compact.png"
          alt="Ruta.education"
          width={360}
          height={144}
          className="h-36 w-auto"
        />
      </div>
      <p className="text-slate-600">Платформа персонализированного обучения</p>
    </div>
  </div>
</footer>
```

**Ключевые особенности:**
- Светло-серый фон
- Центрированный логотип
- Минималистичный дизайн
- Описательный текст

---

## 🎨 **Цветовые схемы для разных контекстов**

### **Схема 1: Основная (Hero)**
```css
.hero-scheme {
  background: #fefdf2; /* cream */
  color: #1e293b; /* slate-900 */
  accent: #659ab8; /* primary */
  highlight: #cde6f9; /* light-blue */
}
```

### **Схема 2: Контентная (Process)**
```css
.content-scheme {
  background: #fefdf2; /* cream */
  color: #1e293b; /* slate-900 */
  accent: #659ab8; /* primary */
  secondary: #64748b; /* slate-600 */
}
```

### **Схема 3: Акцентная (Stats)**
```css
.accent-scheme {
  background: #ffffff; /* white */
  color: #1e293b; /* slate-900 */
  accent: #659ab8; /* primary */
  highlight: #cde6f9; /* light-blue */
}
```

### **Схема 4: CTA (Call-to-Action)**
```css
.cta-scheme {
  background: #cde6f9; /* light-blue */
  color: #1e293b; /* slate-900 */
  accent: #659ab8; /* primary */
  button: #659ab8; /* primary */
}
```

---

## 📱 **Адаптивные паттерны**

### **Мобильная версия (до 640px):**
- 1 колонка для всех сеток
- Вертикальные стеки для кнопок
- Уменьшенные отступы
- Крупные touch-элементы

### **Планшетная версия (640px - 1024px):**
- 2 колонки для карточек
- Горизонтальные кнопки
- Средние отступы
- Оптимизированные размеры

### **Десктопная версия (1024px+):**
- 4 колонки для карточек
- Максимальные отступы
- Полная типографическая иерархия
- Hover-эффекты

---

## 🎯 **Паттерны взаимодействия**

### **Hover эффекты:**
```css
/* Карточки */
.card-hover:hover {
  border-color: rgba(101, 154, 184, 0.2);
  transition: border-color 150ms ease-in-out;
}

/* Кнопки */
.button-hover:hover {
  background-color: #5a8bad; /* primary-hover */
  transition: background-color 150ms ease-in-out;
}

/* Ссылки */
.link-hover:hover {
  color: #659ab8; /* primary */
  transition: color 150ms ease-in-out;
}
```

### **Focus состояния:**
```css
/* Доступность */
.focus-visible:focus-visible {
  outline: 2px solid #659ab8;
  outline-offset: 2px;
}
```

---

## 📊 **Примеры компонентов**

### **Навигация:**
```tsx
<nav className="bg-white border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      <div className="flex items-center">
        <Image src="/logo.png" alt="Ruta" width={120} height={48} />
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm">Войти</Button>
        <Button size="sm">Регистрация</Button>
      </div>
    </div>
  </div>
</nav>
```

### **Форма:**
```tsx
<form className="space-y-6">
  <div>
    <Label htmlFor="email" className="text-sm font-medium text-slate-700">
      Email
    </Label>
    <Input
      id="email"
      type="email"
      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
    />
  </div>
  <Button type="submit" className="w-full">
    Отправить
  </Button>
</form>
```

### **Уведомление:**
```tsx
<div className="bg-light-blue border border-primary/20 rounded-lg p-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <CheckCircleIcon className="h-5 w-5 text-primary" />
    </div>
    <div className="ml-3">
      <p className="text-sm text-slate-900">
        Ваш курс успешно создан!
      </p>
    </div>
  </div>
</div>
```

---

## 🎨 **Вдохновение и референсы**

### **Стиль:**
- **Минимализм:** Чистые линии, много воздуха
- **Профессионализм:** Деловой, но дружелюбный тон
- **Современность:** Актуальные тренды веб-дизайна
- **Функциональность:** Каждый элемент имеет цель

### **Влияния:**
- **Material Design:** Четкие тени и переходы
- **Apple HIG:** Простота и элегантность
- **Bootstrap:** Сетка и компоненты
- **Tailwind CSS:** Utility-first подход

---

*Эти примеры служат основой для создания новых страниц и компонентов в соответствии с брендом Ruta Education.*
