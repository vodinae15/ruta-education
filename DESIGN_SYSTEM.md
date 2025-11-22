# Ruta Education Design System

## Цвета

### Основные цвета
- **Primary**: `#659AB8` - основной цвет кнопок и акцентов
- **Primary hover**: `#5589a7` - цвет при наведении
- **Text primary**: `#5589a7` - цвет заголовков и важного текста

### Фоновые цвета
- **Cream**: `bg-cream` - основной фон страниц
- **Light blue**: `bg-light-blue` - фон карточек с акцентом
- **Badge background**: `#FDF8F3` - фон статусных плашек

### Текстовые цвета
- **Main text**: `text-slate-900` - основной текст
- **Secondary text**: `text-slate-600` - вторичный текст
- **Muted text**: `text-[#6B7280]` - приглушенный текст

---

## Компоненты

### Статусные плашки (Status Badges)

Используются для отображения статусов: "Черновик", "Опубликован", "Соавтор", суперсила автора и т.д.

```tsx
<span className="text-xs px-2 py-1 rounded-full bg-[#FDF8F3] text-slate-600 border border-[#E5E7EB]">
  Текст статуса
</span>
```

**Правила:**
- Размер шрифта: `text-xs`
- Отступы: `px-2 py-1`
- Форма: `rounded-full`
- Фон: `bg-[#FDF8F3]`
- Текст: `text-slate-600`
- Граница: `border border-[#E5E7EB]`

---

### Кнопки

#### Основная кнопка (Primary)
```tsx
<button className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]">
  Текст кнопки
</button>
```

#### Вторичная кнопка (Secondary/Outline)
```tsx
<button className="bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white">
  Текст кнопки
</button>
```

#### Маленькая кнопка
```tsx
<button className="bg-white text-[#659AB8] px-4 py-1.5 border-2 border-[#659AB8] rounded-lg text-xs font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white">
  Текст
</button>
```

**Правила:**
- Толщина границы: `border-2`
- Шрифт: `font-semibold`
- Скругление: `rounded-lg`
- Анимация: `transition-colors duration-200`
- **Без иконок** внутри кнопок
- **Без теней**

---

### Карточки (Cards)

```tsx
<Card className="border">
  <CardHeader>
    <CardTitle className="text-xl text-[#5589a7] font-bold">
      Заголовок
    </CardTitle>
  </CardHeader>
  <CardContent>
    Контент
  </CardContent>
</Card>
```

**Правила:**
- Только `border`, без теней
- Заголовки: `text-[#5589a7] font-bold`

#### Карточка с акцентом
```tsx
<Card className="bg-light-blue border rounded-2xl">
```

---

### Списки с маркерами

#### Точечный маркер
```tsx
<div className="flex items-start py-1">
  <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
  <p className="text-sm text-slate-600 leading-relaxed">Текст пункта</p>
</div>
```

#### Нумерованный маркер
```tsx
<div className="flex items-start py-1">
  <div className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 mt-0.5">
    1
  </div>
  <p className="text-sm text-slate-600 leading-relaxed">Текст пункта</p>
</div>
```

---

### Статистика (Stats Cards)

```tsx
<div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shrink-0">
  <Icon className="w-7 h-7 text-white" />
</div>
```

**Размеры:**
- Круг: `w-14 h-14`
- Иконка: `w-7 h-7`

---

## Типографика

### Заголовки
- **H1 (Page header)**: `text-3xl lg:text-4xl font-bold text-slate-900`
- **H2 (Section)**: `text-2xl lg:text-3xl font-bold text-[#5589a7]`
- **H3 (Card title)**: `text-xl text-[#5589a7] font-bold`
- **H4 (Subsection)**: `text-lg text-[#5589a7] font-bold`

### Текст
- **Body**: `text-sm text-slate-600 leading-relaxed`
- **Large body**: `text-xl lg:text-2xl text-slate-900 font-medium leading-relaxed`

---

## Отступы и контейнеры

### Страницы
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
```

### Узкий контент
```tsx
<div className="max-w-2xl mx-auto">
```

### Средний контент
```tsx
<div className="max-w-4xl mx-auto">
```

### Широкий контент
```tsx
<div className="max-w-6xl mx-auto">
```

---

## Формы

### Radio группы
```tsx
<RadioGroup className="space-y-1">
  <div className="flex items-start space-x-4 py-2 px-3 rounded-lg hover:bg-light-blue transition-colors">
    <RadioGroupItem className="mt-1 border-[#659AB8] text-[#659AB8]" />
    <Label className="text-lg leading-relaxed cursor-pointer flex-1 text-slate-900">
      Текст опции
    </Label>
  </div>
</RadioGroup>
```

---

## Сетки

### 3 колонки
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
```

### 2 колонки
```tsx
<div className="grid md:grid-cols-2 gap-3">
```

---

## Состояния

### Disabled
```tsx
className="disabled:opacity-50 disabled:cursor-not-allowed"
```

### Ошибки
```tsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
  <p className="text-red-600 text-sm">Текст ошибки</p>
</div>
```

### Информационные блоки
```tsx
<div className="p-4 bg-light-blue rounded-lg">
  <p className="text-sm text-slate-600 leading-relaxed">
    <span className="font-semibold text-[#5589a7]">Совет:</span> Текст
  </p>
</div>
```
