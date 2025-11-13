#!/bin/bash

# Скрипт для загрузки проекта на GitHub
# GitHub: vodinae15/ruta-education

echo "🚀 Загрузка проекта на GitHub..."
echo ""

# Переходим в папку проекта
cd /Users/vbthy/Downloads/ruta-edu-project

# Проверяем, инициализирован ли git
if [ ! -d ".git" ]; then
    echo "📦 Инициализация git..."
    git init
fi

# Добавляем все файлы
echo "📝 Добавление файлов..."
git add .

# Создаем коммит
echo "💾 Создание коммита..."
git commit -m "Initial commit: Ruta Education project ready for deployment" || echo "⚠️  Коммит уже существует или нет изменений"

# Добавляем remote (если еще не добавлен)
if ! git remote get-url origin &>/dev/null; then
    echo "🔗 Добавление remote репозитория..."
    git remote add origin https://github.com/vodinae15/ruta-education.git
else
    echo "✅ Remote уже настроен"
fi

# Устанавливаем основную ветку
git branch -M main

echo ""
echo "✅ Готово к загрузке!"
echo ""
echo "📤 Теперь выполните:"
echo "   git push -u origin main"
echo ""
echo "🔐 При запросе:"
echo "   Username: vodinae15"
echo "   Password: ваш Personal Access Token"
echo ""
