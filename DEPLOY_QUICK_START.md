# ⚡ Быстрый старт: Загрузка на сервер

## 🎯 Краткая инструкция (30 минут)

### Шаг 1: Загрузите на GitLab (10 мин)

```bash
cd /Users/vbthy/Downloads/ruta-edu-project

# Инициализируйте git
git init
git add .
git commit -m "Initial commit"

# Добавьте GitLab репозиторий (замените на ваш URL!)
git remote add origin https://gitlab.com/YOUR_USERNAME/YOUR_PROJECT.git
git branch -M main
git push -u origin main
```

**Создайте репозиторий на [gitlab.com](https://gitlab.com) перед выполнением команд!**

---

### Шаг 2: На сервере (20 мин)

```bash
# 1. Подключитесь к серверу
ssh root@93.189.229.85

# 2. Установите ПО (если еще не установлено)
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2

# 3. Клонируйте проект
mkdir -p /var/www/ruta-education
cd /var/www/ruta-education
git clone https://gitlab.com/YOUR_USERNAME/YOUR_PROJECT.git .

# 4. Настройте
npm install
cp .env.production.example .env.production
# Проверьте .env.production - там уже ваши данные!

# 5. Соберите и запустите
npm run build

# Создайте PM2 конфиг
cat > ecosystem.config.js << 'EOF'
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
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. Настройте Nginx
cat > /etc/nginx/sites-available/ruta-education << 'EOF'
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
EOF

ln -s /etc/nginx/sites-available/ruta-education /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 7. Установите SSL
apt install -y certbot python3-certbot-nginx
certbot --nginx -d rutaedve.beget.tech
```

---

### Шаг 3: Настройте Supabase (5 мин)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Ваш проект → **Authentication** → **URL Configuration**
3. Добавьте в **Redirect URLs**:
   - `https://rutaedve.beget.tech/dashboard`
   - `https://rutaedve.beget.tech/student-dashboard`
4. Сохраните

---

### Готово! 🎉

Откройте: `https://rutaedve.beget.tech`

---

## 📖 Подробная инструкция

См. [DEPLOYMENT_GITLAB.md](./DEPLOYMENT_GITLAB.md) для детальной инструкции.

