# ⚡ **Быстрая справка по бренду Ruta Education**

## 🎨 **Основные цвета**

| Цвет | Hex | Использование |
|------|-----|---------------|
| **Primary** | `#659AB8` | Заголовки, кнопки, иконки |
| **Light Blue** | `#CDE6F9` | Фоны секций, выделения |
| **Light Gray** | `#F3FAFE` | Фоны карточек, переключатели |
| **Cream** | `#FEFDF2` | Основной фон страниц |
| **Text Primary** | `#1E293B` | Основной текст |
| **Text Secondary** | `#64748B` | Вторичный текст |

## 📐 **Отступы и размеры**

### **Контейнеры:**
- **Широкий:** `max-w-7xl` (1280px)
- **Средний:** `max-w-6xl` (1152px)  
- **Узкий:** `max-w-4xl` (896px)

### **Отступы секций:**
- **Вертикальные:** `py-8 sm:py-10 lg:py-12` (32px → 40px → 48px)
- **Горизонтальные:** `px-4 sm:px-6 lg:px-8` (16px → 24px → 32px)

### **Сетки:**
- **Карточки:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Статистика:** `grid-cols-1 sm:grid-cols-3`
- **Отступы:** `gap-6 sm:gap-8` (24px → 32px)

## 📝 **Типографика**

| Элемент | Размер | Вес | Цвет |
|---------|--------|-----|------|
| **H1 (Hero)** | `text-4xl lg:text-6xl` | `font-bold` | `text-slate-900` |
| **H2 (Секции)** | `text-3xl lg:text-4xl` | `font-bold` | `text-slate-900` |
| **H3 (Подсекции)** | `text-2xl lg:text-3xl` | `font-bold` | `text-primary` |
| **Большой текст** | `text-xl lg:text-2xl` | `font-medium` | `text-slate-900` |
| **Основной текст** | `text-lg` | `font-normal` | `text-slate-600` |
| **Малый текст** | `text-sm` | `font-normal` | `text-slate-600` |

## 🎯 **Компоненты**

### **Кнопки:**
```tsx
// Primary
<Button className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-md">

// Secondary  
<Button variant="outline" className="border-2 border-primary/20 text-primary px-6 py-3 rounded-md">
```

### **Карточки:**
```tsx
// Основная
<Card className="bg-white border-2 hover:border-primary/20 rounded-lg shadow-sm">

// Выделенная
<Card className="bg-light-blue rounded-2xl p-6 sm:p-8 lg:p-10">
```

### **Иконки:**
```tsx
// Контейнер
<div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
  <Icon className="w-7 h-7 text-white" />
</div>
```

## 🎨 **Цветовые схемы**

### **Hero секция:**
- Фон: `bg-white`
- Акцент: `bg-light-blue`
- Текст: `text-slate-900`

### **Process секция:**
- Фон: `bg-cream`
- Карточки: `bg-white`
- Акцент: `text-primary`

### **Stats секция:**
- Фон: `bg-white`
- Иконки: `bg-primary`
- Цифры: `text-primary`

### **CTA секция:**
- Фон: `bg-light-blue`
- Кнопка: `bg-primary`
- Текст: `text-slate-900`

## 📱 **Адаптивность**

| Устройство | Breakpoint | Сетка | Отступы |
|------------|------------|-------|---------|
| **Mobile** | до 640px | 1 колонка | `px-4 py-8` |
| **Tablet** | 640px+ | 2 колонки | `sm:px-6 sm:py-10` |
| **Desktop** | 1024px+ | 4 колонки | `lg:px-8 lg:py-12` |

## ⚡ **Быстрые классы**

### **Цвета:**
- `text-primary` - основной цвет текста
- `bg-primary` - основной фон
- `bg-light-blue` - светло-голубой фон
- `bg-cream` - кремовый фон
- `border-primary` - основная граница

### **Отступы:**
- `py-8 sm:py-10 lg:py-12` - стандартные отступы секций
- `px-4 sm:px-6 lg:px-8` - стандартные горизонтальные отступы
- `mb-6` - отступ снизу заголовков
- `gap-6 sm:gap-8` - отступы в сетках

### **Размеры:**
- `max-w-7xl` - широкий контейнер
- `max-w-6xl` - средний контейнер
- `max-w-4xl` - узкий контейнер
- `h-full` - полная высота карточек

## 🚫 **Что НЕ делать**

- ❌ Не использовать яркие цвета
- ❌ Не создавать контраст менее 3:1
- ❌ Не делать элементы меньше 44px
- ❌ Не использовать более 3-4 цветов
- ❌ Не делать строки длиннее 75 символов
- ❌ Не перегружать страницу информацией

## ✅ **Чек-лист**

- [ ] Использованы правильные цвета
- [ ] Соблюдены отступы
- [ ] Проверена адаптивность
- [ ] Добавлены hover-эффекты
- [ ] Проверена контрастность
- [ ] Обеспечена доступность

---

*Этот файл - краткая справка для быстрого доступа к основным принципам бренда Ruta Education.*
