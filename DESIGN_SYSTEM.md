# Дизайн-система Ruta.education

## Цвета

### Основные
- **#659AB8** - Primary (кнопки, заливка)
- **#5589a7** - Primary hover / текст на белом фоне
- **#111827** (slate-900) - Заголовки
- **#4B5563** (slate-600) - Основной текст
- **#FFFFFF** - Белый фон секций

### Фоновые
- **bg-cream** (#F8FAFB) - Основной фон страницы
- **bg-light-gray** (#E5E7EB) - Футер, табы
- **bg-light-blue** (#E8F4FA) - Акцентные блоки CTA
- **bg-primary** (#659AB8) - Иконки в кругах

---

## Типографика

### Заголовки
- **H1**: `text-4xl lg:text-6xl font-bold text-slate-900`
- **H2**: `text-3xl lg:text-4xl font-bold text-slate-900`
- **H3 (CTA)**: `text-2xl lg:text-3xl font-bold text-slate-900`
- **Card Title**: `text-lg text-[#5589a7]`
- **Stats числа**: `text-3xl font-bold text-[#5589a7]`

### Текст
- **Hero описание**: `text-xl lg:text-2xl text-slate-900 font-medium`
- **Секция описание**: `text-lg text-slate-600`
- **Card/Stats текст**: `text-sm text-slate-600`

### Акценты в заголовках
```tsx
<span className="text-[#5589a7]">Слово</span>
// или
<span className="text-primary">Слово</span>
```

---

## Кнопки

### Primary (заливка)
```tsx
className="bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
```

### Secondary (outline)
```tsx
className="bg-white text-[#659AB8] px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#659AB8] hover:text-white"
```

### Header button (меньше)
```tsx
className="bg-[#659AB8] text-white px-6 py-2 border-2 border-[#659AB8] rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
```

---

## Карточки

```tsx
<Card className="text-center border h-full">
  <CardHeader className="pb-4">
    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-7 h-7 text-white" />
    </div>
    <CardTitle className="text-lg text-[#5589a7]">Заголовок</CardTitle>
  </CardHeader>
  <CardContent className="text-sm text-slate-600 text-center">
    <p>Описание</p>
  </CardContent>
</Card>
```

**Правила:**
- Без теней
- Без hover эффектов на бордере
- Иконка: w-14 h-14 круг, иконка w-7 h-7

---

## Статистика

```tsx
<div className="text-center">
  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
    <Icon className="w-8 h-8 text-white" />
  </div>
  <div className="text-3xl font-bold text-[#5589a7] mb-2">8 типов</div>
  <p className="text-sm text-slate-600">описание</p>
</div>
```

**Размеры:**
- Иконка: w-16 h-16 круг, иконка w-8 h-8

---

## Плашки (статусы)

Используются для статусов: "Черновик", "Опубликован", "Соавтор", суперсила автора и т.д.

```tsx
<span className="text-xs px-2 py-1 rounded-full bg-[#FDF8F3] text-slate-600 border border-[#E5E7EB]">
  Текст статуса
</span>
```

**Правила:**
- Фон: `bg-[#FDF8F3]`
- Текст: `text-slate-600`
- Размер: `text-xs`
- Отступы: `px-2 py-1`
- Форма: `rounded-full`
- Рамка: `border border-[#E5E7EB]`

---

## Отступы

### Секции
- Padding: `py-12 sm:py-16 lg:py-20`
- Контейнер: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

### Внутри секций
- Заголовок → контент: `mb-8`
- Между элементами: `mb-4`
- CTA блок padding: `p-6 sm:p-8`

### Сетки
- Карточки: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`
- Статистика: `grid grid-cols-1 sm:grid-cols-3 gap-8`

---

## Табы

```tsx
<div className="bg-light-gray rounded-lg p-1 flex">
  <button className={`px-6 py-3 rounded-md font-medium transition-colors ${
    active ? "bg-white text-[#5589a7]" : "text-slate-600 hover:text-slate-900"
  }`}>
    Текст
  </button>
</div>
```

---

## Навигация

### Ссылки
```tsx
className={`text-sm font-medium transition-colors ${
  isActive ? "text-[#5589a7]" : "text-slate-600 hover:text-[#5589a7]"
}`}
```

---

## Специальные блоки

### Hero акцент
```tsx
<div className="bg-light-blue rounded-2xl p-6 sm:p-8 mb-8 max-w-4xl mx-auto">
```

### CTA блок
```tsx
<div className="bg-light-blue rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto text-center">
```

---

## Футер

```tsx
<footer className="bg-light-gray py-4">
  <div className="flex items-center justify-center gap-4">
    <Image className="h-36 w-auto" />
    <p className="text-sm text-slate-600">Текст</p>
  </div>
</footer>
```

---

## Анимации

Только на кнопках и ссылках:
- `transition-colors duration-200`

Карточки и блоки - без анимаций.

---

## Адаптивность

- **Mobile**: `text-4xl`, `py-12`, `grid-cols-1`
- **Tablet (sm)**: `grid-cols-2`, `py-16`, `flex-row`
- **Desktop (lg)**: `text-6xl`, `py-20`, `grid-cols-4`

---

## Списки с маркерами

### Точечный маркер
```tsx
<div className="flex items-start py-1">
  <div className="w-2 h-2 bg-[#659AB8] rounded-full mt-2 mr-3 flex-shrink-0"></div>
  <p className="text-sm text-slate-600 leading-relaxed">Текст пункта</p>
</div>
```

### Нумерованный маркер
```tsx
<div className="flex items-start py-1">
  <div className="w-6 h-6 bg-[#659AB8] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 mt-0.5">
    1
  </div>
  <p className="text-sm text-slate-600 leading-relaxed">Текст пункта</p>
</div>
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
