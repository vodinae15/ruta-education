#!/bin/bash

# Скрипт автоматического развертывания Ruta Education на сервере
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начало развертывания Ruta Education..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Пожалуйста, запустите скрипт с правами root или через sudo${NC}"
    exit 1
fi

# Переменные
PROJECT_DIR="/var/www/ruta-education"
APP_NAME="ruta-education"
PORT=3000

echo -e "${GREEN}📦 Шаг 1: Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}📦 Шаг 2: Установка Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "${YELLOW}⚠️  Node.js уже установлен: $(node --version)${NC}"
fi

echo -e "${GREEN}📦 Шаг 3: Установка PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo -e "${YELLOW}⚠️  PM2 уже установлен${NC}"
fi

echo -e "${GREEN}📦 Шаг 4: Установка Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
else
    echo -e "${YELLOW}⚠️  Nginx уже установлен${NC}"
fi

echo -e "${GREEN}📦 Шаг 5: Создание директории проекта...${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Проверка, нужно ли клонировать репозиторий
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Репозиторий не найден. Пожалуйста, клонируйте проект вручную:${NC}"
    echo "   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git $PROJECT_DIR"
    exit 1
fi

echo -e "${GREEN}📦 Шаг 6: Обновление кода из Git...${NC}"
git pull origin main || git pull origin master

echo -e "${GREEN}📦 Шаг 7: Установка зависимостей...${NC}"
npm install --production

echo -e "${GREEN}📦 Шаг 8: Проверка переменных окружения...${NC}"
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Файл .env.production не найден!${NC}"
    echo -e "${YELLOW}Создайте файл .env.production с необходимыми переменными${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Шаг 9: Сборка проекта...${NC}"
npm run build

echo -e "${GREEN}📦 Шаг 10: Настройка PM2...${NC}"
# Создание конфигурации PM2
cat > $PROJECT_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '$PROJECT_DIR',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/pm2/$APP_NAME-error.log',
    out_file: '/var/log/pm2/$APP_NAME-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}
EOF

# Создание директории для логов
mkdir -p /var/log/pm2

# Остановка старого процесса, если есть
pm2 delete $APP_NAME 2>/dev/null || true

# Запуск приложения
pm2 start ecosystem.config.js
pm2 save

# Настройка автозапуска
pm2 startup | grep -v PM2_HOME | bash || true

echo -e "${GREEN}📦 Шаг 11: Настройка Nginx...${NC}"
# Создание конфигурации Nginx
cat > /etc/nginx/sites-available/$APP_NAME << 'NGINX_EOF'
server {
    listen 80;
    server_name rutaedve.beget.tech;

    # Увеличение размера загружаемых файлов
    client_max_body_size 100M;

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
        
        # Таймауты для больших запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_EOF

# Активация конфигурации
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации, если есть
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
if nginx -t; then
    systemctl restart nginx
    echo -e "${GREEN}✅ Nginx настроен и перезапущен${NC}"
else
    echo -e "${RED}❌ Ошибка в конфигурации Nginx!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Развертывание завершено!${NC}"
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo "1. Настройте SSL сертификат: certbot --nginx -d rutaedve.beget.tech"
echo "2. Проверьте работу приложения: pm2 logs $APP_NAME"
echo "3. Откройте в браузере: http://rutaedve.beget.tech"
echo ""
echo -e "${GREEN}🎉 Готово!${NC}"

