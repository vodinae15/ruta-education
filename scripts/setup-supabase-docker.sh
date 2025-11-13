#!/bin/bash

# Скрипт для установки self-hosted Supabase на сервере
# Использование: ./setup-supabase-docker.sh

set -e

echo "🐳 Установка Supabase на сервере..."

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Пожалуйста, запустите скрипт с правами root или через sudo${NC}"
    exit 1
fi

SUPABASE_DIR="/opt/supabase"

echo -e "${GREEN}📦 Шаг 1: Установка Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo -e "${YELLOW}⚠️  Docker уже установлен: $(docker --version)${NC}"
fi

echo -e "${GREEN}📦 Шаг 2: Установка Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose
else
    echo -e "${YELLOW}⚠️  Docker Compose уже установлен${NC}"
fi

echo -e "${GREEN}📦 Шаг 3: Клонирование Supabase...${NC}"
if [ ! -d "$SUPABASE_DIR" ]; then
    mkdir -p "$SUPABASE_DIR"
    cd "$SUPABASE_DIR"
    git clone --depth 1 https://github.com/supabase/supabase.git .
    cd docker
else
    echo -e "${YELLOW}⚠️  Supabase уже клонирован${NC}"
    cd "$SUPABASE_DIR/docker"
    git pull || true
fi

echo -e "${GREEN}📦 Шаг 4: Настройка конфигурации...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Отредактируйте файл .env перед запуском!${NC}"
    echo "  nano $SUPABASE_DIR/docker/.env"
    echo ""
    echo "Важные параметры:"
    echo "  - POSTGRES_PASSWORD (установите надежный пароль)"
    echo "  - JWT_SECRET (сгенерируйте случайную строку)"
    echo "  - ANON_KEY (будет сгенерирован автоматически)"
    echo "  - SERVICE_ROLE_KEY (будет сгенерирован автоматически)"
    echo ""
    read -p "Нажмите Enter после редактирования .env файла..."
fi

echo -e "${GREEN}📦 Шаг 5: Запуск Supabase...${NC}"
docker-compose up -d

echo -e "${GREEN}⏳ Ожидание запуска сервисов (30 секунд)...${NC}"
sleep 30

echo -e "${GREEN}📦 Шаг 6: Проверка статуса...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Supabase установлен!${NC}"
echo ""
echo -e "${YELLOW}📝 Информация о доступе:${NC}"
echo "  - API URL: http://localhost:8000"
echo "  - Dashboard: http://localhost:8001"
echo "  - Kong Admin: http://localhost:8002"
echo "  - Postgres: localhost:5432"
echo ""
echo -e "${YELLOW}📝 Получение ключей:${NC}"
echo "  ANON_KEY и SERVICE_ROLE_KEY находятся в файле:"
echo "  $SUPABASE_DIR/docker/.env"
echo ""
echo -e "${YELLOW}📝 Настройка Nginx для Supabase API:${NC}"
echo "  Создайте конфигурацию для проксирования API на поддомен"
echo "  (например, api.rutaedve.beget.tech -> localhost:8000)"
echo ""
echo -e "${GREEN}🎉 Готово!${NC}"

