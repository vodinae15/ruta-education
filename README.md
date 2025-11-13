# Ruta Education

Образовательная платформа для создания и управления онлайн-курсами с адаптивным контентом.

## 🚀 Быстрый старт

### Развертывание на сервере

**📖 Подробная инструкция:** [ИНСТРУКЦИЯ_РАЗВЕРТЫВАНИЯ.md](./ИНСТРУКЦИЯ_РАЗВЕРТЫВАНИЯ.md)

**⚡ Краткая версия:** [QUICK_START.md](./QUICK_START.md)

**🔧 Полная документация:** [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📋 Технологии

- **Framework:** Next.js 14
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI

## 🛠️ Локальная разработка

1. Клонируйте репозиторий
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Создайте файл `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Запустите dev сервер:
   ```bash
   npm run dev
   ```

## 📁 Структура проекта

- `app/` - Next.js App Router страницы и API routes
- `components/` - React компоненты
- `lib/` - Утилиты и конфигурация
- `scripts/` - SQL скрипты для миграции БД
- `public/` - Статические файлы

## 🗄️ База данных

Миграция базы данных выполняется через SQL скрипты в папке `scripts/`.

**Полная миграция:** `scripts/00-complete-migration.sql`

## 📝 Переменные окружения

См. `.env.example` для списка всех переменных окружения.

**Обязательные:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🔗 Полезные ссылки

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 Лицензия

Private project
