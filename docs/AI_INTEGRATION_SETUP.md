# 🤖 Настройка AI интеграции для Ruta Education

## 📋 Обзор

Система поддерживает интеграцию с различными AI сервисами для:
- **Транскрибации аудио** (голосовые заметки)
- **Транскрибации видео** (видеоуроки)
- **Обработки контента** (умные подсказки)

## 🔧 Настройка API ключей

### 1. OpenAI API (Рекомендуется)

**Для чего:** Транскрибация аудио и видео с помощью Whisper

**Настройка:**
1. Зарегистрируйтесь на [OpenAI](https://platform.openai.com/)
2. Создайте API ключ в разделе "API Keys"
3. Добавьте в `.env.local`:
```env
OPENAI_API_KEY=sk-your-openai-api-key
```

**Стоимость:** ~$0.006 за минуту аудио
**Поддерживаемые форматы:** MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM

### 2. Google Cloud Speech-to-Text

**Для чего:** Альтернативная транскрибация аудио

**Настройка:**
1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Включите Speech-to-Text API
3. Создайте API ключ
4. Добавьте в `.env.local`:
```env
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key
```

**Стоимость:** ~$0.006 за минуту аудио
**Особенности:** Поддержка 125+ языков, включая русский

### 3. AssemblyAI

**Для чего:** Специализированная транскрибация с высокой точностью

**Настройка:**
1. Зарегистрируйтесь на [AssemblyAI](https://www.assemblyai.com/)
2. Получите API ключ в Dashboard
3. Добавьте в `.env.local`:
```env
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
```

**Стоимость:** ~$0.00065 за секунду аудио
**Особенности:** Автоматическая пунктуация, распознавание спикеров

### 4. Rev.ai

**Для чего:** Профессиональная транскрибация с ручной проверкой

**Настройка:**
1. Зарегистрируйтесь на [Rev.ai](https://www.rev.ai/)
2. Получите API ключ
3. Добавьте в `.env.local`:
```env
REV_AI_API_KEY=your-rev-ai-api-key
```

**Стоимость:** ~$0.02 за минуту аудио
**Особенности:** Высокая точность, поддержка сложных аудио

## 🖼️ Настройка библиотеки изображений

### Unsplash API

**Для чего:** Бесплатная библиотека изображений

**Настройка:**
1. Зарегистрируйтесь на [Unsplash Developers](https://unsplash.com/developers)
2. Создайте приложение
3. Получите Access Key
4. Добавьте в `.env.local`:
```env
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-access-key
```

**Лимиты:** 50 запросов в час (бесплатно)
**Лицензия:** Unsplash License (бесплатное коммерческое использование)

## 📁 Настройка файлового хранилища

### AWS S3 (Рекомендуется)

**Для чего:** Хранение загруженных аудио/видео файлов

**Настройка:**
1. Создайте аккаунт AWS
2. Создайте S3 bucket
3. Создайте IAM пользователя с правами на S3
4. Добавьте в `.env.local`:
```env
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### Google Cloud Storage

**Альтернатива S3 для хранения файлов**

**Настройка:**
1. Создайте проект в Google Cloud
2. Включите Cloud Storage API
3. Создайте Service Account
4. Скачайте JSON ключ
5. Добавьте в `.env.local`:
```env
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_STORAGE_KEY_FILE=path/to/service-account-key.json
```

## 🚀 Приоритеты настройки

### Минимальная конфигурация (для тестирования)
```env
# Обязательно для работы
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Для транскрибации (выберите один)
OPENAI_API_KEY=your_openai_key

# Для изображений
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_key
```

### Полная конфигурация (для продакшена)
```env
# Все API ключи из раздела выше
# + настройка файлового хранилища
# + мониторинг и логирование
```

## 🔄 Fallback стратегия

Система работает даже без AI API:
- **Без транскрибации:** Пользователь вводит текст вручную
- **Без библиотеки изображений:** Только загрузка собственных файлов
- **Без файлового хранилища:** Файлы хранятся локально (не рекомендуется для продакшена)

## 📊 Мониторинг использования

### OpenAI API
- Dashboard: https://platform.openai.com/usage
- Лимиты: Зависят от тарифного плана

### Google Cloud
- Console: https://console.cloud.google.com/billing
- Квоты: Настраиваются в Cloud Console

### AssemblyAI
- Dashboard: https://www.assemblyai.com/dashboard
- Лимиты: 3 часа в месяц (бесплатно)

## 🛠️ Отладка

### Проверка API ключей
```bash
# Проверка OpenAI
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Проверка Unsplash
curl "https://api.unsplash.com/photos/random?client_id=$NEXT_PUBLIC_UNSPLASH_ACCESS_KEY"
```

### Логи ошибок
Проверяйте консоль браузера и серверные логи для диагностики проблем с API.

## 💡 Рекомендации

1. **Начните с OpenAI** - самый простой в настройке
2. **Используйте Unsplash** - бесплатные изображения высокого качества
3. **Настройте S3** - для надежного хранения файлов
4. **Мониторьте расходы** - AI API могут быть дорогими при больших объемах
5. **Используйте fallback** - система должна работать даже без AI

## 🔒 Безопасность

- **Никогда не коммитьте** API ключи в репозиторий
- **Используйте переменные окружения** для всех ключей
- **Ограничьте права** API ключей минимально необходимыми
- **Регулярно ротируйте** ключи
- **Мониторьте использование** для обнаружения утечек

