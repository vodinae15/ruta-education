# 🚀 Инструкция по развертыванию Ruta Education на сервере

## 📋 Обзор

Это руководство поможет вам развернуть проект Ruta Education на сервере Beget (Ubuntu).

**Время выполнения:** ~2-3 часа

## 🎯 План действий

1. ✅ Подготовка проекта (GitHub)
2. ✅ Настройка Supabase (self-hosted или Cloud)
3. ✅ Развертывание на сервере
4. ✅ Миграция базы данных
5. ✅ Настройка домена и SSL

---

## Шаг 1: Подготовка проекта для GitHub

### 1.1 Создайте репозиторий на GitHub

1. Перейдите на [github.com](https://github.com)
2. Создайте новый репозиторий (например, `ruta-education`)
3. **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)

### 1.2 Загрузите проект в GitHub

```bash
# В папке проекта выполните:
cd /Users/vbthy/Downloads/ruta-edu-project

# Инициализируйте git (если еще не инициализирован)
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: Ruta Education project"

# Добавьте удаленный репозиторий (замените YOUR_USERNAME и YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Загрузите код
git branch -M main
git push -u origin main
```

---

## Шаг 2: Настройка Supabase

У вас есть два варианта:

### Вариант A: Supabase Cloud (рекомендуется для быстрого старта) ⚡

**Преимущества:** Быстро, просто, бесплатный тарифный план

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте аккаунт и новый проект
3. Запишите:
   - Project URL (например, `https://xxxxx.supabase.co`)
   - Anon Key (в Settings > API)
   - Service Role Key (в Settings > API, секция "service_role")

### Вариант B: Self-hosted Supabase на вашем сервере 🐳

**Преимущества:** Полный контроль, нет ограничений облачного плана

См. раздел "Установка Supabase на сервере" ниже.

---

## Шаг 3: Развертывание на сервере

### 3.1 Подключение к серверу

```bash
ssh root@93.189.229.85
```

### 3.2 Установка необходимого ПО

Выполните на сервере:

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PM2 (менеджер процессов)
npm install -g pm2

# Установка Nginx
apt install -y nginx

# Установка Git
apt install -y git

# Проверка версий
node --version  # должно быть v20.x
npm --version
```

### 3.3 Клонирование проекта

```bash
# Создайте директорию для проекта
mkdir -p /var/www/ruta-education
cd /var/www/ruta-education

# Клонируйте репозиторий (замените на ваш URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Или если репозиторий приватный, используйте SSH ключ
```

### 3.4 Установка зависимостей

```bash
cd /var/www/ruta-education
npm install
```

### 3.5 Настройка переменных окружения

```bash
# Создайте файл .env.production
nano .env.production
```

Добавьте следующие переменные (замените на ваши значения):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redirect URL
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=https://rutaedve.beget.tech/dashboard

# Опционально: AI API ключи (если используете)
OPENROUTER_API_KEY=your_key
OPENAI_API_KEY=your_key
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_key
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X)

### 3.6 Сборка проекта

```bash
cd /var/www/ruta-education
npm run build
```

### 3.7 Запуск приложения с PM2

```bash
cd /var/www/ruta-education

# Создайте файл ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
require('dotenv').config({ path: '.env.production' })

module.exports = {
  apps: [{
    name: 'ruta-education',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/ruta-education',
    instances: 2,
    exec_mode: 'cluster',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Установите dotenv для загрузки переменных окружения
npm install dotenv --save

# Запустите приложение
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую выведет PM2
```

---

## Шаг 4: Настройка Nginx

### 4.1 Создайте конфигурацию Nginx

```bash
nano /etc/nginx/sites-available/ruta-education
```

Добавьте:

```nginx
server {
    listen 80;
    server_name rutaedve.beget.tech;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Сохраните и активируйте:

```bash
# Создайте символическую ссылку
ln -s /etc/nginx/sites-available/ruta-education /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (если есть)
rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx
```

### 4.2 Настройка SSL (Let's Encrypt)

```bash
# Установите Certbot
apt install -y certbot python3-certbot-nginx

# Получите SSL сертификат
certbot --nginx -d rutaedve.beget.tech

# Следуйте инструкциям (укажите email, согласитесь с условиями)
# Certbot автоматически обновит конфигурацию Nginx
```

---

## Шаг 5: Миграция базы данных

### 5.1 Если используете Supabase Cloud

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните все SQL скрипты из папки `scripts/` в порядке:
   - `01-create-author-profiles.sql`
   - `02-create-courses.sql`
   - `03-create-course-modules.sql`
   - `04-create-content-blocks.sql`
   - `05-create-student-sessions.sql`
   - `09-create-students-table.sql`
   - `10-create-student-course-access-table.sql`
   - `12-create-student-test-results-table.sql`
   - И другие по необходимости

### 5.2 Если используете self-hosted Supabase

См. раздел "Установка Supabase на сервере" ниже.

---

## Шаг 6: Проверка работы

1. Откройте в браузере: `https://rutaedve.beget.tech`
2. Проверьте, что приложение загружается
3. Попробуйте зарегистрироваться/войти
4. Проверьте логи: `pm2 logs ruta-education`

---

## 🔧 Установка Supabase на сервере (Self-hosted)

Если вы хотите установить Supabase на свой сервер:

### Требования:
- Docker и Docker Compose
- Минимум 4GB RAM (у вас 8GB - отлично!)
- 50GB свободного места (у вас есть)

### Установка:

```bash
# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установите Docker Compose
apt install -y docker-compose

# Клонируйте Supabase
cd /opt
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Скопируйте пример конфигурации
cp .env.example .env

# Отредактируйте .env (укажите домен и пароли)
nano .env

# Запустите Supabase
docker-compose up -d

# Проверьте статус
docker-compose ps
```

После запуска Supabase будет доступен на:
- API: `http://93.189.229.85:8000` (или через домен)
- Dashboard: `http://93.189.229.85:8001`

**Важно:** Настройте Nginx для проксирования Supabase API на поддомен (например, `api.rutaedve.beget.tech`).

---

## 📝 Полезные команды

### Управление приложением

```bash
# Просмотр логов
pm2 logs ruta-education

# Перезапуск
pm2 restart ruta-education

# Остановка
pm2 stop ruta-education

# Статус
pm2 status
```

### Обновление проекта

```bash
cd /var/www/ruta-education
git pull origin main
npm install
npm run build
pm2 restart ruta-education
```

### Просмотр логов Nginx

```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## 🐛 Решение проблем

### Приложение не запускается

1. Проверьте логи: `pm2 logs ruta-education`
2. Проверьте переменные окружения: `cat .env.production`
3. Проверьте порт: `netstat -tulpn | grep 3000`

### Ошибки подключения к Supabase

1. Проверьте URL и ключи в `.env.production`
2. Проверьте доступность Supabase: `curl https://your-project.supabase.co`
3. Проверьте настройки CORS в Supabase Dashboard

### Проблемы с Nginx

1. Проверьте конфигурацию: `nginx -t`
2. Перезапустите: `systemctl restart nginx`
3. Проверьте логи: `tail -f /var/log/nginx/error.log`

---

## 📞 Поддержка

Если возникнут проблемы, проверьте:
1. Логи приложения: `pm2 logs`
2. Логи Nginx: `/var/log/nginx/`
3. Статус сервисов: `systemctl status nginx`, `pm2 status`

---

## ✅ Чеклист развертывания

- [ ] Проект загружен в GitHub
- [ ] Supabase настроен (Cloud или self-hosted)
- [ ] Сервер подготовлен (Node.js, PM2, Nginx)
- [ ] Проект клонирован на сервер
- [ ] Зависимости установлены
- [ ] Переменные окружения настроены
- [ ] Проект собран (`npm run build`)
- [ ] Приложение запущено через PM2
- [ ] Nginx настроен и работает
- [ ] SSL сертификат установлен
- [ ] База данных мигрирована
- [ ] Приложение доступно по домену
- [ ] Тестирование функционала пройдено

---

**Удачи с развертыванием! 🚀**

