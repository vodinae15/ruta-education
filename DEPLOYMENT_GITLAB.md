# 🚀 Инструкция по развертыванию на сервере через GitLab

## 📋 Обзор

Это руководство поможет вам загрузить проект на GitLab и развернуть его на сервере Beget.

**Время выполнения:** ~1-2 часа

---

## 🎯 План действий

1. ✅ Загрузка проекта на GitLab
2. ✅ Подготовка сервера
3. ✅ Клонирование и настройка проекта
4. ✅ Запуск приложения
5. ✅ Настройка Nginx и SSL

---

## Шаг 1: Загрузка проекта на GitLab (15-20 минут)

### 1.1 Создайте репозиторий на GitLab

1. Откройте [gitlab.com](https://gitlab.com) и войдите в аккаунт
2. Нажмите **"New project"** или **"Create project"**
3. Выберите **"Create blank project"**
4. Заполните:
   - **Project name:** `ruta-education` (или любое другое)
   - **Visibility:** Private (рекомендуется) или Public
5. **НЕ** ставьте галочки на README, .gitignore, license
6. Нажмите **"Create project"**

### 1.2 Загрузите проект в GitLab

Выполните в терминале на вашем компьютере:

```bash
# Перейдите в папку проекта
cd /Users/vbthy/Downloads/ruta-edu-project

# Инициализируйте git (если еще не инициализирован)
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: Ruta Education project ready for deployment"

# Добавьте удаленный репозиторий GitLab
# ЗАМЕНИТЕ YOUR_USERNAME и YOUR_PROJECT на ваши данные!
git remote add origin https://gitlab.com/YOUR_USERNAME/YOUR_PROJECT.git

# Или если используете SSH:
# git remote add origin git@gitlab.com:YOUR_USERNAME/YOUR_PROJECT.git

# Установите основную ветку
git branch -M main

# Загрузите код на GitLab
git push -u origin main
```

**Важно:** Замените `YOUR_USERNAME` и `YOUR_PROJECT` на реальные значения из вашего GitLab проекта!

После выполнения команд вы увидите URL вашего репозитория, например:
- `https://gitlab.com/username/ruta-education`
- Или SSH: `git@gitlab.com:username/ruta-education.git`

**Сохраните этот URL - он понадобится на сервере!**

---

## Шаг 2: Подготовка сервера (10-15 минут)

### 2.1 Подключитесь к серверу

```bash
ssh root@93.189.229.85
```

Если спросит пароль, введите пароль от сервера.

### 2.2 Установите необходимое ПО

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
node --version  # должно быть v20.x или выше
npm --version
pm2 --version
```

---

## Шаг 3: Клонирование и настройка проекта (15-20 минут)

### 3.1 Клонируйте проект с GitLab

```bash
# Создайте директорию для проекта
mkdir -p /var/www/ruta-education
cd /var/www/ruta-education

# Клонируйте репозиторий с GitLab
# ЗАМЕНИТЕ URL на ваш реальный URL из GitLab!
git clone https://gitlab.com/YOUR_USERNAME/YOUR_PROJECT.git .

# Или если используете SSH:
# git clone git@gitlab.com:YOUR_USERNAME/YOUR_PROJECT.git .
```

### 3.2 Установите зависимости

```bash
cd /var/www/ruta-education
npm install
```

Это займет 2-3 минуты.

### 3.3 Настройте переменные окружения

```bash
# Скопируйте пример production файла
cp .env.production.example .env.production

# Откройте файл для редактирования
nano .env.production
```

**Файл уже содержит ваши данные!** Просто проверьте, что:
- `NEXT_PUBLIC_APP_URL=https://rutaedve.beget.tech` (правильный домен)
- Все ключи Supabase на месте
- `NODE_ENV=production`

**Как сохранить в nano:**
- Нажмите `Ctrl + O` (сохранить)
- Нажмите `Enter` (подтвердить)
- Нажмите `Ctrl + X` (выйти)

### 3.4 Проверьте переменные окружения

```bash
node scripts/check-env.js --production
```

Должны увидеть: ✅ Все проверки пройдены успешно!

---

## Шаг 4: Сборка и запуск приложения (10-15 минут)

### 4.1 Соберите проект

```bash
cd /var/www/ruta-education
npm run build
```

Это займет 2-3 минуты. Дождитесь завершения.

### 4.2 Создайте конфигурацию PM2

```bash
cd /var/www/ruta-education

# Создайте файл ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ruta-education',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/ruta-education',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOF

# Создайте папку для логов
mkdir -p logs
```

### 4.3 Запустите приложение

```bash
# Запустите через PM2
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую выведет PM2 (обычно что-то вроде: sudo env PATH=...)
```

### 4.4 Проверьте статус

```bash
# Проверьте статус приложения
pm2 status

# Посмотрите логи
pm2 logs ruta-education
```

Должны увидеть, что приложение запущено и работает.

---

## Шаг 5: Настройка Nginx (10-15 минут)

### 5.1 Создайте конфигурацию Nginx

```bash
nano /etc/nginx/sites-available/ruta-education
```

Добавьте следующее:

```nginx
server {
    listen 80;
    server_name rutaedve.beget.tech;

    # Логи
    access_log /var/log/nginx/ruta-education-access.log;
    error_log /var/log/nginx/ruta-education-error.log;

    # Максимальный размер загружаемых файлов
    client_max_body_size 50M;

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
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X).

### 5.2 Активируйте конфигурацию

```bash
# Создайте символическую ссылку
ln -s /etc/nginx/sites-available/ruta-education /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (если есть)
rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Если все ОК, перезапустите Nginx
systemctl restart nginx
```

### 5.3 Настройте SSL (Let's Encrypt)

```bash
# Установите Certbot
apt install -y certbot python3-certbot-nginx

# Получите SSL сертификат
certbot --nginx -d rutaedve.beget.tech

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями (A)
# - Выберите редирект HTTP на HTTPS (2)
```

Certbot автоматически обновит конфигурацию Nginx для использования HTTPS.

---

## Шаг 6: Настройка Supabase (5-10 минут)

### 6.1 Добавьте URL в Supabase Dashboard

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Authentication** → **URL Configuration**
4. В разделе **Redirect URLs** добавьте:
   - `https://rutaedve.beget.tech/dashboard`
   - `https://rutaedve.beget.tech/student-dashboard`
   - `https://rutaedve.beget.tech/auth`
5. В разделе **Site URL** укажите:
   - `https://rutaedve.beget.tech`
6. Нажмите **Save**

### 6.2 Проверьте CORS настройки

1. В Supabase Dashboard перейдите в **Settings** → **API**
2. Убедитесь, что ваш домен разрешен для CORS (обычно разрешены все, но проверьте)

---

## Шаг 7: Проверка работы (5 минут)

### 7.1 Откройте сайт в браузере

Откройте: `https://rutaedve.beget.tech`

Должна загрузиться главная страница приложения.

### 7.2 Проверьте логи

```bash
# Логи приложения
pm2 logs ruta-education

# Логи Nginx
tail -f /var/log/nginx/ruta-education-error.log
```

### 7.3 Проверьте статус сервисов

```bash
# Статус PM2
pm2 status

# Статус Nginx
systemctl status nginx
```

---

## 🔄 Обновление проекта

Когда нужно обновить проект на сервере:

```bash
# Подключитесь к серверу
ssh root@93.189.229.85

# Перейдите в папку проекта
cd /var/www/ruta-education

# Получите последние изменения с GitLab
git pull origin main

# Установите новые зависимости (если есть)
npm install

# Пересоберите проект
npm run build

# Перезапустите приложение
pm2 restart ruta-education
```

---

## 🐛 Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
pm2 logs ruta-education

# Проверьте переменные окружения
cat .env.production

# Проверьте, занят ли порт 3000
netstat -tulpn | grep 3000
```

### Ошибки подключения к Supabase

1. Проверьте URL и ключи в `.env.production`
2. Проверьте доступность Supabase: `curl https://lcemzlxyohmrhulzyekx.supabase.co`
3. Проверьте настройки CORS в Supabase Dashboard

### Проблемы с Nginx

```bash
# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx

# Проверьте логи
tail -f /var/log/nginx/error.log
```

### Проблемы с SSL

```bash
# Проверьте статус сертификата
certbot certificates

# Обновите сертификат вручную
certbot renew --dry-run
```

---

## ✅ Чеклист развертывания

- [ ] Проект загружен на GitLab
- [ ] Сервер подготовлен (Node.js, PM2, Nginx установлены)
- [ ] Проект клонирован на сервер
- [ ] Зависимости установлены (`npm install`)
- [ ] Переменные окружения настроены (`.env.production`)
- [ ] Проверка переменных пройдена (`node scripts/check-env.js --production`)
- [ ] Проект собран (`npm run build`)
- [ ] Приложение запущено через PM2
- [ ] Nginx настроен и работает
- [ ] SSL сертификат установлен
- [ ] URL добавлены в Supabase Dashboard
- [ ] Приложение доступно по домену
- [ ] Тестирование функционала пройдено

---

## 📞 Полезные команды

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

# Мониторинг
pm2 monit
```

### Просмотр логов

```bash
# Логи приложения
pm2 logs ruta-education

# Логи Nginx
tail -f /var/log/nginx/ruta-education-access.log
tail -f /var/log/nginx/ruta-education-error.log
```

---

**Удачи с развертыванием! 🚀**

