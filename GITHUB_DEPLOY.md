# 🚀 Загрузка проекта на GitHub

## 📋 Информация о репозитории

- **GitHub username:** `vodinae15`
- **Репозиторий:** `ruta-education`
- **URL репозитория:** `https://github.com/vodinae15/ruta-education.git`

---

## 🔑 Шаг 1: Создайте репозиторий на GitHub (если еще не создан)

1. Откройте [github.com](https://github.com) и войдите в аккаунт
2. Нажмите **"+"** → **"New repository"**
3. Название: `ruta-education`
4. **НЕ** ставьте галочки на README, .gitignore, license (они уже есть в проекте)
5. Нажмите **"Create repository"**

---

## 🔐 Шаг 2: Получите Personal Access Token

Если у вас еще нет токена:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
3. Название: `ruta-education-deploy`
4. Выберите права доступа:
   - ✅ `repo` (полный доступ к репозиториям)
5. Нажмите **"Generate token"**
6. **Скопируйте токен** (он показывается только один раз!)

---

## 💻 Шаг 3: Выполните команды в терминале

Откройте терминал и выполните команды по порядку:

```bash
# Перейдите в папку проекта
cd /Users/vbthy/Downloads/ruta-edu-project

# Инициализируйте git (если еще не инициализирован)
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: Ruta Education project ready for deployment"

# Добавьте удаленный репозиторий GitHub
git remote add origin https://github.com/vodinae15/ruta-education.git

# Установите основную ветку
git branch -M main

# Загрузите код на GitHub
# При запросе username введите: vodinae15
# При запросе password введите: ВАШ_ACCESS_TOKEN
git push -u origin main
```

---

## 🔐 Альтернативный способ: Использование токена в URL

Если хотите указать токен прямо в команде (менее безопасно, но удобнее):

```bash
# Замените YOUR_TOKEN на ваш реальный access token
git remote set-url origin https://YOUR_TOKEN@github.com/vodinae15/ruta-education.git

# Затем просто push
git push -u origin main
```

**⚠️ Внимание:** Токен будет виден в истории команд. После использования лучше удалить его из URL:

```bash
git remote set-url origin https://github.com/vodinae15/ruta-education.git
```

---

## ✅ Проверка

После выполнения команд проверьте:

1. Откройте [https://github.com/vodinae15/ruta-education](https://github.com/vodinae15/ruta-education)
2. Убедитесь, что все файлы загружены

---

## 🔄 Обновление проекта

Когда нужно обновить код на GitHub:

```bash
cd /Users/vbthy/Downloads/ruta-edu-project

git add .
git commit -m "Описание изменений"
git push origin main
```

---

## 🖥️ На сервере: Клонирование с GitHub

После загрузки на GitHub, на сервере выполните:

```bash
# Подключитесь к серверу
ssh root@93.189.229.85

# Клонируйте проект
mkdir -p /var/www/ruta-education
cd /var/www/ruta-education
git clone https://github.com/vodinae15/ruta-education.git .

# Или с токеном (если репозиторий приватный):
# git clone https://YOUR_TOKEN@github.com/vodinae15/ruta-education.git .
```

---

## 📝 Полный список команд (копируйте по порядку)

```bash
cd /Users/vbthy/Downloads/ruta-edu-project
git init
git add .
git commit -m "Initial commit: Ruta Education project ready for deployment"
git remote add origin https://github.com/vodinae15/ruta-education.git
git branch -M main
git push -u origin main
```

При запросе:
- **Username:** `vodinae15`
- **Password:** ваш Personal Access Token (не пароль от GitHub!)

---

**Готово! После загрузки переходите к деплою на сервер.** 🚀

