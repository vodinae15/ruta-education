# 📋 Настройка переменных окружения

## 🎯 Быстрый старт

### Для локальной разработки:

1. Скопируйте пример файла:
   ```bash
   cp .env.example .env.local
   ```

2. Откройте `.env.local` и заполните значениями из вашего Supabase проекта

3. Проверьте настройки:
   ```bash
   node scripts/check-env.js
   ```

### Для production на сервере:

1. Скопируйте пример файла:
   ```bash
   cp .env.production.example .env.production
   ```

2. Откройте `.env.production` и заполните реальными значениями:
   - Замените `NEXT_PUBLIC_APP_URL` на ваш домен
   - Замените все `your_*` на реальные значения

3. Проверьте настройки:
   ```bash
   node scripts/check-env.js --production
   ```

## 📝 Обязательные переменные

### Для всех окружений:
- `NEXT_PUBLIC_SUPABASE_URL` - URL вашего Supabase проекта
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon ключ из Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role ключ из Supabase

### Для production дополнительно:
- `NEXT_PUBLIC_APP_URL` - Базовый URL вашего приложения (например, `https://rutaedve.beget.tech`)
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` - URL для редиректа после авторизации
- `NODE_ENV=production` - Режим production

## 🔧 Опциональные переменные

- `OPENROUTER_API_KEY` - Для AI адаптации контента
- `OPENROUTER_MODEL` - Модель AI (по умолчанию: `anthropic/claude-3.5-sonnet`)
- `CLAUDE_API_KEY` - Альтернативный AI API
- `OPENAI_API_KEY` - Для транскрибации видео
- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` - Для поиска изображений
- `PORT` - Порт сервера (по умолчанию: 3000)

## ✅ Скрипт проверки

Используйте скрипт `scripts/check-env.js` для проверки переменных окружения:

```bash
# Для development
node scripts/check-env.js

# Для production
node scripts/check-env.js --production
```

Скрипт проверит:
- ✅ Наличие всех обязательных переменных
- ✅ Корректность формата URL
- ✅ Длину API ключей
- ✅ Использование HTTPS в production
- ✅ Совпадение доменов в URL

## 🔒 Безопасность

⚠️ **ВАЖНО:**
- Никогда не коммитьте файлы `.env`, `.env.local`, `.env.production` в Git
- Эти файлы уже добавлены в `.gitignore`
- Используйте `.env.example` и `.env.production.example` как шаблоны

## 📚 Где получить значения

### Supabase:
1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Скопируйте:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** ключ → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** ключ → `SUPABASE_SERVICE_ROLE_KEY`

### OpenRouter:
1. Зарегистрируйтесь на [OpenRouter.ai](https://openrouter.ai/)
2. Создайте API ключ
3. Скопируйте ключ → `OPENROUTER_API_KEY`

## 🚀 После настройки переменных

### Для production:

1. **Добавьте URL в Supabase:**
   - Откройте Supabase Dashboard → **Authentication** → **URL Configuration**
   - Добавьте в **Redirect URLs**:
     - `https://your-domain.com/dashboard`
     - `https://your-domain.com/student-dashboard`
     - `https://your-domain.com/auth`

2. **Проверьте CORS настройки:**
   - Убедитесь, что ваш домен добавлен в разрешенные источники

3. **Запустите проверку:**
   ```bash
   node scripts/check-env.js --production
   ```

4. **Соберите проект:**
   ```bash
   npm run build
   ```

