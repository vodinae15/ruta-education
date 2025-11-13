# 📋 Команды для деплоя - Шпаргалка

## 🖥️ На вашем компьютере (Mac)

### 1. Инициализация Git и загрузка на GitLab

```bash
cd /Users/vbthy/Downloads/ruta-edu-project

# Инициализируйте git
git init

# Добавьте все файлы
git add .

# Создайте коммит
git commit -m "Initial commit: Ruta Education project ready for deployment"

# Добавьте GitLab репозиторий (ЗАМЕНИТЕ на ваш URL!)
git remote add origin https://gitlab.com/YOUR_USERNAME/YOUR_PROJECT.git

# Установите основную ветку
git branch -M main

# Загрузите на GitLab
git push -u origin main
```

**⚠️ ВАЖНО:** Сначала создайте репозиторий на GitLab.com, затем замените `YOUR_USERNAME` и `YOUR_PROJECT` на реальные значения!

---

## 🖥️ На сервере (через SSH)

### 2. Подключение к серверу

```bash
ssh root@93.189.229.85
```

### 3. Установка ПО (если еще не установлено)

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
```

### 4. Клонирование проекта

```bash
mkdir -p /var/www/ruta-education
cd /var/www/ruta-education
git clone https://gitlab.com/YOUR_USERNAME/YOUR_PROJECT.git .
```

### 5. Настройка проекта

```bash
# Установка зависимостей
npm install

# Копирование переменных окружения (уже с вашими данными!)
cp .env.production.example .env.production

# Проверка переменных
node scripts/check-env.js --production
```

### 6. Сборка и запуск

```bash
# Сборка проекта
npm run build

# Создание PM2 конфига
cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'ruta-education',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/ruta-education',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
}
PM2EOF

# Запуск
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Настройка Nginx

```bash
cat > /etc/nginx/sites-available/ruta-education << 'NGINXEOF'
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
    }
}
NGINXEOF

ln -s /etc/nginx/sites-available/ruta-education /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 8. Установка SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d rutaedve.beget.tech
```

---

## ✅ Проверка

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs ruta-education

# Статус Nginx
systemctl status nginx
```

---

## 🔄 Обновление проекта

```bash
cd /var/www/ruta-education
git pull origin main
npm install
npm run build
pm2 restart ruta-education
```
