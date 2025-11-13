/**
 * Утилиты для работы с ID уроков
 * Уроки могут иметь строковые ID (из modules.lessons) или UUID (из course_lessons)
 * Эта функция обеспечивает совместимость между этими форматами
 */

/**
 * Генерирует детерминированный UUID из строкового ID
 * Использует простой хеш для консистентности
 */
export function generateUUIDFromString(str: string): string {
  // Простая хеш-функция для генерации UUID-подобного идентификатора
  // Используем формат UUID v4 с namespace
  const hash = simpleHash(str)
  
  // Форматируем как UUID v4
  return `00000000-0000-4000-8000-${hash.toString(16).padStart(12, '0')}`
}

/**
 * Простая хеш-функция для строки
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Нормализует ID урока для использования в БД
 * Если ID уже UUID, возвращает его как есть
 * Если ID - строка, генерирует UUID из него
 */
export function normalizeLessonId(lessonId: string, courseId: string): string {
  // Проверяем, является ли ID валидным UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(lessonId)) {
    return lessonId
  }
  
  // Если это не UUID, генерируем его из строкового ID с учетом courseId для уникальности
  return generateUUIDFromString(`${courseId}-${lessonId}`)
}

/**
 * Проверяет, является ли строка валидным UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

