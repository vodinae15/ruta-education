// Student Test Logic - система определения когнитивного стиля и предпочтений обратной связи
// Обновлённая версия: 4 вопроса вместо 7, фокус на когнитивном стиле и типе обратной связи

export interface StudentTestQuestion {
  id: string
  question: string
  options: StudentTestOption[]
}

export interface StudentTestOption {
  id: string
  text: string
  value: string // "A" или "B"
}

export interface StudentTestAnswers {
  q1: string // Когнитивный стиль - вопрос 1 (приоритетный)
  q2: string // Когнитивный стиль - вопрос 2 (уточняющий)
  q3: string // Тип обратной связи - вопрос 3
  q4: string // Тип обратной связи - вопрос 4
}

export interface StudentTypeResult {
  cognitiveStyle: "reflective" | "impulsive" | "mixed"
  feedbackPreference: "short" | "detailed" | "mixed"
  generalMessage: string // Обобщённое сообщение для студента
  // Для автора (внутреннее использование):
  authorHints: {
    cognitiveStyle: string
    feedbackPreference: string
    recommendations: string[]
  }
}

// Тест из 4 вопросов
export const studentTestQuestions: StudentTestQuestion[] = [
  {
    id: "q1",
    question: "Представьте: вам нужно прочитать параграф, который не очень интересен. Ваши действия:",
    options: [
      {
        id: "read_full",
        text: "Всё равно читаю его от начала до конца",
        value: "A",
      },
      {
        id: "skim_through",
        text: "Пробегаю заголовок, начало, середину, может быть конец",
        value: "B",
      },
    ],
  },
  {
    id: "q2",
    question: "На тесте встречается вопрос, который кажется сложным. Вы скорее:",
    options: [
      {
        id: "think_longer",
        text: "Подумаю подольше и попробую разобраться",
        value: "A",
      },
      {
        id: "mark_first",
        text: "Сразу отмечу первый подходящий вариант и пойду дальше",
        value: "B",
      },
    ],
  },
  {
    id: "q3",
    question: "Что вам приятнее получать от преподавателя?",
    options: [
      {
        id: "short_hint",
        text: "Короткую чёткую подсказку",
        value: "A",
      },
      {
        id: "detailed_explanation",
        text: "Подробное объяснение с аргументами",
        value: "B",
      },
    ],
  },
  {
    id: "q4",
    question: "Когда вам указывают на ошибку…",
    options: [
      {
        id: "key_advice",
        text: "Лучше сразу получить ключевой совет",
        value: "A",
      },
      {
        id: "detailed_fix",
        text: "Лучше, если преподаватель развернёт, в чём именно ошибка и как её исправить",
        value: "B",
      },
    ],
  },
]

// Генерация обобщённого сообщения для студента
function generateGeneralMessage(
  cognitiveStyle: "reflective" | "impulsive" | "mixed",
  feedbackPreference: "short" | "detailed" | "mixed"
): string {
  const styleMessages = {
    reflective: "Вы предпочитаете глубокое изучение материала",
    impulsive: "Вы предпочитаете быстрое изучение материала",
    mixed: "Вы гибко подходите к изучению материала",
  }

  const feedbackMessages = {
    short: "и краткие, чёткие подсказки",
    detailed: "и подробную обратную связь",
    mixed: "и воспринимаете разные форматы обратной связи",
  }

  const baseMessage = styleMessages[cognitiveStyle]
  const feedbackMessage = feedbackMessages[feedbackPreference]

  // Специальные комбинации для более точных формулировок
  if (cognitiveStyle === "reflective" && feedbackPreference === "detailed") {
    return "Вы предпочитаете глубокое изучение материала и детальную обратную связь. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "reflective" && feedbackPreference === "short") {
    return "Вы предпочитаете тщательное изучение материала и краткие, чёткие подсказки. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "impulsive" && feedbackPreference === "detailed") {
    return "Вы предпочитаете быстрое изучение материала и подробные объяснения. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "impulsive" && feedbackPreference === "short") {
    return "Вы предпочитаете быстрое изучение материала и краткие, конкретные подсказки. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "mixed" && feedbackPreference === "detailed") {
    return "Вы гибко подходите к изучению материала и цените подробную обратную связь. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "mixed" && feedbackPreference === "short") {
    return "Вы гибко подходите к изучению материала и предпочитаете краткие, конкретные подсказки. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "reflective" && feedbackPreference === "mixed") {
    return "Вы предпочитаете глубокое изучение материала и воспринимаете разные форматы обратной связи. Курсы будут адаптированы под ваш стиль обучения."
  }
  if (cognitiveStyle === "impulsive" && feedbackPreference === "mixed") {
    return "Вы предпочитаете быстрое изучение материала и воспринимаете разные форматы обратной связи. Курсы будут адаптированы под ваш стиль обучения."
  }

  // Смешанный когнитивный стиль + смешанная обратная связь
  return "Вы гибко подходите к обучению и воспринимаете разные форматы обратной связи. Курсы будут адаптированы под ваш стиль обучения."
}

// Генерация рекомендаций для автора
function generateAuthorRecommendations(
  cognitiveStyle: "reflective" | "impulsive" | "mixed",
  feedbackPreference: "short" | "detailed" | "mixed"
): string[] {
  const recommendations: string[] = []

  // Рекомендации по когнитивному стилю
  if (cognitiveStyle === "reflective") {
    recommendations.push("Студент предпочитает тщательное изучение материала")
    recommendations.push("Давайте время на размышление и анализ")
    recommendations.push("Предоставляйте структурированную информацию")
  } else if (cognitiveStyle === "impulsive") {
    recommendations.push("Студент предпочитает быстрое изучение материала")
    recommendations.push("Используйте краткие, конкретные формулировки")
    recommendations.push("Разбивайте материал на небольшие блоки")
  } else {
    recommendations.push("Студент гибко подходит к изучению материала")
    recommendations.push("Предоставляйте разнообразные форматы подачи")
  }

  // Рекомендации по обратной связи
  if (feedbackPreference === "short") {
    recommendations.push("Давайте краткие, чёткие подсказки")
    recommendations.push("Фокусируйтесь на ключевых моментах")
  } else if (feedbackPreference === "detailed") {
    recommendations.push("Предоставляйте подробные объяснения с аргументами")
    recommendations.push("Развёрнуто объясняйте ошибки и способы их исправления")
  } else {
    recommendations.push("Студент воспринимает разные форматы обратной связи")
    recommendations.push("Адаптируйте обратную связь под ситуацию")
  }

  return recommendations
}

// Функция определения типа ученика
export function determineStudentType(answers: StudentTestAnswers): StudentTypeResult {
  // Логика определения когнитивного стиля
  let cognitiveStyle: "reflective" | "impulsive" | "mixed"

  if (answers.q1 === "A" && answers.q2 === "A") {
    cognitiveStyle = "reflective"
  } else if (answers.q1 === "B" && answers.q2 === "B") {
    cognitiveStyle = "impulsive"
  } else {
    // Приоритет первому вопросу
    cognitiveStyle = answers.q1 === "A" ? "reflective" : "impulsive"
  }

  // Логика определения предпочтений обратной связи
  let feedbackPreference: "short" | "detailed" | "mixed"

  if (answers.q3 === "A" && answers.q4 === "A") {
    feedbackPreference = "short"
  } else if (answers.q3 === "B" && answers.q4 === "B") {
    feedbackPreference = "detailed"
  } else {
    feedbackPreference = "mixed"
  }

  // Генерация обобщённого сообщения
  const generalMessage = generateGeneralMessage(cognitiveStyle, feedbackPreference)

  // Генерация рекомендаций для автора
  const recommendations = generateAuthorRecommendations(cognitiveStyle, feedbackPreference)

  return {
    cognitiveStyle,
    feedbackPreference,
    generalMessage,
    authorHints: {
      cognitiveStyle: cognitiveStyle === "reflective" ? "Рефлексивный" : cognitiveStyle === "impulsive" ? "Импульсивный" : "Смешанный",
      feedbackPreference: feedbackPreference === "short" ? "Короткая ОС" : feedbackPreference === "detailed" ? "Развёрнутая ОС" : "Смешанная ОС",
      recommendations,
    },
  }
}
