#!/bin/bash

# Скрипт для миграции базы данных Supabase
# Использование: ./migrate-database.sh

set -e

echo "🗄️  Миграция базы данных Supabase..."

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка переменных окружения
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Переменные окружения не установлены!${NC}"
    echo "Установите:"
    echo "  export NEXT_PUBLIC_SUPABASE_URL=your_url"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=your_key"
    exit 1
fi

# Директория со скриптами
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"

# Порядок выполнения SQL скриптов
SQL_FILES=(
    "01-create-author-profiles.sql"
    "02-create-courses.sql"
    "03-create-course-modules.sql"
    "04-create-content-blocks.sql"
    "05-create-student-sessions.sql"
    "09-create-students-table.sql"
    "10-create-student-course-access-table.sql"
    "12-create-student-test-results-table.sql"
)

echo -e "${GREEN}📋 Найденные SQL скрипты:${NC}"
for file in "${SQL_FILES[@]}"; do
    if [ -f "$SCRIPTS_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo -e "  ${YELLOW}⚠️  $file (не найден)${NC}"
    fi
done

echo ""
echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Этот скрипт выполнит SQL команды в вашей базе данных!${NC}"
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Отменено."
    exit 0
fi

# Установка psql, если нужно
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql не установлен. Установите PostgreSQL клиент:${NC}"
    echo "  apt install postgresql-client"
    echo ""
    echo -e "${YELLOW}Альтернатива: Используйте Supabase Dashboard > SQL Editor${NC}"
    exit 1
fi

# Извлечение хоста и базы данных из URL
# Формат: postgresql://postgres:[password]@[host]:[port]/postgres
DB_URL="${SUPABASE_DB_URL:-}"

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ SUPABASE_DB_URL не установлен!${NC}"
    echo "Для self-hosted Supabase установите:"
    echo "  export SUPABASE_DB_URL=postgresql://postgres:password@localhost:5432/postgres"
    echo ""
    echo -e "${YELLOW}Для Supabase Cloud используйте Dashboard > SQL Editor${NC}"
    exit 1
fi

# Выполнение SQL скриптов
for file in "${SQL_FILES[@]}"; do
    if [ -f "$SCRIPTS_DIR/$file" ]; then
        echo -e "${GREEN}📄 Выполнение: $file${NC}"
        psql "$DB_URL" -f "$SCRIPTS_DIR/$file" || {
            echo -e "${RED}❌ Ошибка при выполнении $file${NC}"
            read -p "Продолжить? (yes/no): " continue_anyway
            if [ "$continue_anyway" != "yes" ]; then
                exit 1
            fi
        }
    fi
done

echo ""
echo -e "${GREEN}✅ Миграция завершена!${NC}"
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo "1. Проверьте таблицы в Supabase Dashboard"
echo "2. Проверьте RLS политики"
echo "3. Протестируйте приложение"

