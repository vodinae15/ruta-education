# 🚀 Быстрый старт: Развертывание на сервере

## ⏱️ План на 3 часа

### Час 1: Подготовка (30-40 минут)

1. **Загрузите проект в GitHub** (10 мин)
   ```bash
   cd /Users/vbthy/Downloads/ruta-edu-project
   git init
   git add .
   git commit -m "Initial commit"
   # Создайте репозиторий на GitHub и выполните:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Настройте Supabase Cloud** (20 мин)
   - Зайдите на [supabase.com](https://supabase.com)
   - Создайте проект
   - Запишите: URL, Anon Key, Service Role Key

### Час 2: Развертывание на сервере (60-80 минут)

1. **Подключитесь к серверу**
   ```bash
   ssh root@93.189.229.85
   ```

2. **Запустите скрипт развертывания**
   ```bash
   # Клонируйте проект
   mkdir -p /var/www/ruta-education
   cd /var/www/ruta-education
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
   
   # Сделайте скрипт исполняемым
   chmod +x scripts/deploy.sh
   
   # Запустите развертывание
   sudo ./scripts/deploy.sh
   ```

3. **Настройте переменные окружения**
   ```bash
   nano .env.production
   ```
   
   Добавьте:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=https://rutaedve.beget.tech/dashboard
   ```

4. **Соберите и запустите**
   ```bash
   npm run build
   pm2 restart ruta-education
   ```

5. **Настройте SSL**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d rutaedve.beget.tech
   ```

### Час 3: Миграция БД и тестирование (40-50 минут)

1. **Мигрируйте базу данных**
   - Откройте Supabase Dashboard > SQL Editor
   - Выполните SQL скрипты из папки `scripts/` в порядке:
     - 01-create-author-profiles.sql
     - 02-create-courses.sql
     - 03-create-course-modules.sql
     - 04-create-content-blocks.sql
     - 09-create-students-table.sql
     - 10-create-student-course-access-table.sql
     - 12-create-student-test-results-table.sql

2. **Проверьте работу**
   - Откройте: https://rutaedve.beget.tech
   - Зарегистрируйтесь
   - Проверьте основные функции

3. **Настройте мониторинг**
   ```bash
   pm2 logs ruta-education  # Просмотр логов
   pm2 monit  # Мониторинг в реальном времени
   ```

## 📝 Важные команды

```bash
# Обновление проекта
cd /var/www/ruta-education
git pull
npm install
npm run build
pm2 restart ruta-education

# Просмотр логов
pm2 logs ruta-education

# Перезапуск Nginx
systemctl restart nginx
```

## ⚠️ Если что-то пошло не так

1. Проверьте логи: `pm2 logs ruta-education`
2. Проверьте переменные: `cat .env.production`
3. Проверьте Nginx: `nginx -t`
4. Проверьте порт: `netstat -tulpn | grep 3000`

## 🎯 Альтернатива: Self-hosted Supabase

Если хотите установить Supabase на сервер:

```bash
chmod +x scripts/setup-supabase-docker.sh
sudo ./scripts/setup-supabase-docker.sh
```

**Время:** +30-40 минут

---

**Подробная инструкция:** См. `DEPLOYMENT.md`

