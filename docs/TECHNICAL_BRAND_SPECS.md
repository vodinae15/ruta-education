# 🔧 **Технические спецификации бренда Ruta Education**

## 📋 **CSS переменные и классы**

### **Цветовые переменные (globals.css):**
```css
:root {
  /* Ruta.education custom colors */
  --color-ruta-primary: #659ab8;
  --color-ruta-primary-light: #cde6f9;
  --color-ruta-neutral-light: #f3fafe;
  --color-ruta-cream: #fefdf2;
  --color-ruta-primary-dark: #4a7a9a;
  --color-ruta-primary-hover: #5a8bad;
  --color-ruta-neutral-medium: #e8f4fd;
  --color-ruta-neutral-dark: #64748b;
  --color-ruta-text-primary: #1e293b;
  --color-ruta-text-secondary: #64748b;
  --color-ruta-text-muted: #94a3b8;
  --color-ruta-success: #10b981;
  --color-ruta-warning: #f59e0b;
  --color-ruta-error: #ef4444;
}
```

### **Utility классы:**
```css
/* Текстовые цвета */
.text-ruta-primary { color: var(--color-ruta-primary); }
.text-ruta-primary-dark { color: var(--color-ruta-primary-dark); }
.text-ruta-secondary { color: var(--color-ruta-text-secondary); }
.text-ruta-muted { color: var(--color-ruta-text-muted); }

/* Фоновые цвета */
.bg-ruta-primary { background-color: var(--color-ruta-primary); }
.bg-ruta-primary-light { background-color: var(--color-ruta-primary-light); }
.bg-ruta-neutral-light { background-color: var(--color-ruta-neutral-light); }
.bg-ruta-cream { background-color: var(--color-ruta-cream); }

/* Границы */
.border-ruta-primary { border-color: var(--color-ruta-primary); }
.border-ruta-primary-light { border-color: var(--color-ruta-primary-light); }

/* Тени */
.shadow-ruta-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.shadow-ruta-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
.shadow-ruta-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
```

---

## 🎨 **Tailwind CSS конфигурация**

### **Рекомендуемая конфигурация tailwind.config.js:**
```javascript
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ruta Education Brand Colors
        'ruta-primary': '#659ab8',
        'ruta-primary-light': '#cde6f9',
        'ruta-neutral-light': '#f3fafe',
        'ruta-cream': '#fefdf2',
        'ruta-primary-dark': '#4a7a9a',
        'ruta-primary-hover': '#5a8bad',
        'ruta-neutral-medium': '#e8f4fd',
        'ruta-neutral-dark': '#64748b',
        'ruta-text-primary': '#1e293b',
        'ruta-text-secondary': '#64748b',
        'ruta-text-muted': '#94a3b8',
        'ruta-success': '#10b981',
        'ruta-warning': '#f59e0b',
        'ruta-error': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
      },
      borderRadius: {
        '4xl': '2rem',    // 32px
      },
      boxShadow: {
        'ruta-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'ruta-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'ruta-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
```

---

## 📐 **Стандартные компоненты**

### **Кнопки:**
```tsx
// Primary Button
<Button 
  className="bg-ruta-primary hover:bg-ruta-primary-hover text-white font-medium px-6 py-3 rounded-md transition-colors"
  size="lg"
>
  Текст кнопки
</Button>

// Secondary Button
<Button 
  variant="outline"
  className="border-2 border-ruta-primary/20 hover:border-ruta-primary/40 text-ruta-primary font-medium px-6 py-3 rounded-md transition-colors"
  size="lg"
>
  Текст кнопки
</Button>
```

### **Карточки:**
```tsx
// Основная карточка
<Card className="bg-white border-2 hover:border-ruta-primary/20 transition-colors rounded-lg shadow-ruta-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-lg text-ruta-primary">Заголовок</CardTitle>
  </CardHeader>
  <CardContent className="text-sm text-ruta-text-secondary">
    Содержимое карточки
  </CardContent>
</Card>

// Выделенная карточка
<Card className="bg-ruta-primary-light rounded-2xl p-6 sm:p-8 lg:p-10">
  <CardContent>
    Содержимое выделенной карточки
  </CardContent>
</Card>
```

### **Иконки:**
```tsx
// Контейнер иконки
<div className="w-14 h-14 bg-ruta-primary rounded-full flex items-center justify-center mx-auto mb-4">
  <IconComponent className="w-7 h-7 text-white" />
</div>

// Большая иконка для статистики
<div className="w-20 h-20 bg-ruta-primary rounded-full flex items-center justify-center mx-auto mb-6">
  <IconComponent className="w-10 h-10 text-white" />
</div>
```

---

## 📱 **Адаптивные паттерны**

### **Контейнеры:**
```tsx
// Основной контейнер
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  Содержимое
</div>

// Средний контейнер
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
  Содержимое
</div>

// Узкий контейнер
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  Содержимое
</div>
```

### **Сетки:**
```tsx
// Адаптивная сетка карточек
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
  {cards.map(card => <CardComponent key={card.id} {...card} />)}
</div>

// Сетка статистики
<div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
  {stats.map(stat => <StatComponent key={stat.id} {...stat} />)}
</div>
```

### **Отступы секций:**
```tsx
// Стандартные отступы секций
<section className="py-8 sm:py-10 lg:py-12">
  Содержимое секции
</section>

// Отступы с фоном
<section className="bg-white py-8 sm:py-10 lg:py-12">
  Содержимое секции
</section>
```

---

## 🎯 **Типографические паттерны**

### **Заголовки:**
```tsx
// H1 - Hero заголовок
<h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-6">
  Заголовок с <span className="text-ruta-primary">акцентом</span>
</h1>

// H2 - Заголовок секции
<h2 className="text-3xl lg:text-4xl font-bold mb-4">
  <span className="text-ruta-primary">Акцентный</span> текст
</h2>

// H3 - Подзаголовок
<h3 className="text-2xl lg:text-3xl font-bold text-ruta-primary mb-4">
  Подзаголовок
</h3>
```

### **Текст:**
```tsx
// Большой текст
<p className="text-xl lg:text-2xl text-slate-900 font-medium">
  Важный текст с <span className="text-ruta-primary">акцентом</span>
</p>

// Основной текст
<p className="text-lg text-slate-600">
  Основной текст секции
</p>

// Вторичный текст
<p className="text-sm text-slate-600">
  Вторичный текст в карточках
</p>
```

---

## 🎨 **Цветовые комбинации**

### **Успешные комбинации:**
```css
/* Основная комбинация */
.primary-combo {
  background: #fefdf2; /* cream */
  color: #1e293b; /* slate-900 */
  border-color: #659ab8; /* primary */
}

/* Акцентная комбинация */
.accent-combo {
  background: #cde6f9; /* light-blue */
  color: #1e293b; /* slate-900 */
  border-color: #659ab8; /* primary */
}

/* Нейтральная комбинация */
.neutral-combo {
  background: #f3fafe; /* light-gray */
  color: #64748b; /* slate-600 */
  border-color: #e8f4fd; /* neutral-medium */
}
```

### **Hover состояния:**
```css
/* Primary hover */
.primary-hover:hover {
  background-color: #5a8bad; /* primary-hover */
  transition: background-color 150ms ease-in-out;
}

/* Border hover */
.border-hover:hover {
  border-color: rgba(101, 154, 184, 0.4); /* primary/40 */
  transition: border-color 150ms ease-in-out;
}
```

---

## 📊 **Компоненты для статистики**

### **Блок статистики:**
```tsx
function StatBlock({ icon: Icon, number, description }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-ruta-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-white" />
      </div>
      <div className="text-4xl font-bold text-ruta-primary mb-2">
        {number}
      </div>
      <p className="text-slate-600 font-medium">
        {description}
      </p>
    </div>
  );
}
```

### **Карточка процесса:**
```tsx
function ProcessCard({ icon: Icon, title, description }) {
  return (
    <Card className="text-center border-2 hover:border-ruta-primary/20 transition-colors h-full">
      <CardHeader className="pb-4">
        <div className="w-14 h-14 bg-ruta-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <CardTitle className="text-lg text-ruta-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600 space-y-2 text-center">
        <p>{description}</p>
      </CardContent>
    </Card>
  );
}
```

---

## 🔧 **Утилиты для разработки**

### **Отладочные классы:**
```css
/* Для отладки сетки */
.debug-grid {
  background-image: 
    linear-gradient(rgba(255,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Для отладки отступов */
.debug-spacing * {
  outline: 1px solid red;
}
```

### **Анимации:**
```css
/* Стандартные переходы */
.transition-standard {
  transition: all 150ms ease-in-out;
}

.transition-colors {
  transition: color 150ms ease-in-out, 
              background-color 150ms ease-in-out, 
              border-color 150ms ease-in-out;
}

/* Hover анимации */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}
```

---

## 📋 **Чек-лист для разработчиков**

### **Перед коммитом:**
- [ ] Проверить соответствие цветовой палитре
- [ ] Убедиться в правильности отступов
- [ ] Проверить адаптивность на всех устройствах
- [ ] Протестировать hover-эффекты
- [ ] Проверить контрастность текста
- [ ] Убедиться в доступности (ARIA, семантика)

### **При создании новых компонентов:**
- [ ] Использовать существующие CSS переменные
- [ ] Следовать паттернам отступов
- [ ] Добавить hover-состояния
- [ ] Обеспечить адаптивность
- [ ] Добавить правильную семантику
- [ ] Протестировать с реальным контентом

### **При обновлении стилей:**
- [ ] Обновить CSS переменные при необходимости
- [ ] Проверить влияние на другие компоненты
- [ ] Обновить документацию
- [ ] Протестировать на всех страницах
- [ ] Убедиться в обратной совместимости

---

## 🚀 **Оптимизация производительности**

### **CSS оптимизация:**
```css
/* Используйте CSS переменные для динамических значений */
.dynamic-color {
  color: var(--color-ruta-primary);
}

/* Минимизируйте количество уникальных цветов */
.reuse-colors {
  /* Используйте существующие классы */
}
```

### **Изображения:**
```tsx
// Оптимизированные изображения
<Image
  src="/images/logo.png"
  alt="Ruta Education"
  width={360}
  height={144}
  className="h-36 w-auto"
  priority // для критических изображений
/>
```

---

*Эти технические спецификации должны использоваться всеми разработчиками для обеспечения консистентности бренда в коде.*
