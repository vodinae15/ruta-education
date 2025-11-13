# 🔐 Исправление аутентификации GitHub

## ✅ Что уже сделано:
- ✅ Git инициализирован
- ✅ Файлы добавлены и закоммичены
- ✅ Remote настроен на GitHub: `https://github.com/vodinae15/ruta-education.git`

## 🔑 Теперь нужно загрузить на GitHub

### Вариант 1: Использование токена в URL (рекомендуется)

Выполните команду, заменив `YOUR_TOKEN` на ваш Personal Access Token:

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/vodinae15/ruta-education.git

git push -u origin main
```

**Пример:**
```bash
git remote set-url origin https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/vodinae15/ruta-education.git

git push -u origin main
```

### Вариант 2: Использование токена при push

Просто выполните:
```bash
git push -u origin main
```

При запросе:
- **Username:** `vodinae15`
- **Password:** ваш Personal Access Token (начинается с `ghp_`)

---

## 🔑 Как получить Personal Access Token

1. Откройте: https://github.com/settings/tokens
2. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
3. Название: `ruta-education-deploy`
4. Срок действия: выберите нужный (например, 90 дней)
5. Выберите права доступа:
   - ✅ **repo** (полный доступ к репозиториям)
6. Нажмите **"Generate token"** внизу страницы
7. **Скопируйте токен** (он показывается только один раз!)
   - Токен начинается с `ghp_`

---

## 📝 Команды для выполнения

После получения токена выполните:

```bash
# Способ 1: Указать токен в URL (удобнее)
git remote set-url origin https://ВАШ_ТОКЕН@github.com/vodinae15/ruta-education.git
git push -u origin main

# Или способ 2: Ввести токен при запросе
git push -u origin main
# Username: vodinae15
# Password: ВАШ_ТОКЕН
```

---

## ⚠️ Важно

После успешной загрузки, для безопасности удалите токен из URL:

```bash
git remote set-url origin https://github.com/vodinae15/ruta-education.git
```

Git запомнит токен в credential helper, так что больше не нужно будет его вводить.

