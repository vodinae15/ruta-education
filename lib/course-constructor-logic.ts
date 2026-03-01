export interface CourseBlock {
  id: string
  type:
    | "introduction"
    | "navigation"
    | "main_block_1"
    | "intermediate_practice"
    | "main_block_2"
    | "intermediate_test"
    | "main_block_3"
    | "conclusion"
    | "bonus_support"
  title: string
  description: string
  purpose?: string
  elements: CourseElement[]
  required: boolean
  completed: boolean
  theses?: string
  category?: 'educational' | 'meta'
  authorOrder?: number
  studentOrder?: number
}

export interface CourseElement {
  id: string
  type: "title" | "text" | "video" | "audio" | "image" | "task" | "test" | "file"
  content: string
  required: boolean
  completed: boolean
}

export type EducationalBlockType = "theory" | "example" | "practice" | "knowledge_check"

export interface EducationalBlockTemplate {
  type: EducationalBlockType
  title: string
  description: string
  suggestedFields: FlexibleField[]
  hints: string[]
}

export interface FlexibleField {
  id: string
  label: string
  placeholder: string
  type: "text" | "textarea" | "file" | "url"
  required: boolean
  hint?: string
}

// Educational block templates with flexible structure
export const getEducationalBlockTemplate = (blockType: EducationalBlockType): EducationalBlockTemplate => {
  switch (blockType) {
    case "theory":
      return {
        type: "theory",
        title: "Теория",
        description: "Структурированное объяснение концепций",
        suggestedFields: [
          {
            id: "main_concept",
            label: "Основная концепция",
            placeholder: "Объясните главную идею простыми словами",
            type: "textarea",
            required: true,
            hint: "Начните с определения или ключевой мысли",
          },
          {
            id: "key_terms",
            label: "Ключевые термины",
            placeholder: "Перечислите важные термины и их значения",
            type: "textarea",
            required: false,
            hint: "Помогает ученикам запомнить новые понятия",
          },
          {
            id: "principles",
            label: "Принципы работы",
            placeholder: "Как это работает? Какие есть правила?",
            type: "textarea",
            required: false,
            hint: "Объясните механизм или логику",
          },
          {
            id: "visual_aid",
            label: "Схема или диаграмма",
            placeholder: "Загрузите изображение для наглядности",
            type: "file",
            required: false,
            hint: "Визуализация помогает лучше понять сложные концепции",
          },
        ],
        hints: [
          "Объясните простыми словами",
          "Добавьте схему или диаграмму",
          "Используйте аналогии из жизни",
          "Структурируйте от простого к сложному",
        ],
      }

    case "example":
      return {
        type: "example",
        title: "Пример",
        description: "Разбор конкретного кейса",
        suggestedFields: [
          {
            id: "situation",
            label: "Ситуация",
            placeholder: "Опишите конкретный случай или задачу",
            type: "textarea",
            required: true,
            hint: "Используйте реальные примеры из практики",
          },
          {
            id: "step_by_step",
            label: "Пошаговый разбор",
            placeholder: "Как решалась задача? Какие шаги предпринимались?",
            type: "textarea",
            required: true,
            hint: "Покажите процесс решения детально",
          },
          {
            id: "result",
            label: "Результат",
            placeholder: "Что получилось в итоге? Какой эффект?",
            type: "textarea",
            required: true,
            hint: "Покажите конкретный результат",
          },
          {
            id: "lessons_learned",
            label: "Выводы",
            placeholder: "Какие выводы можно сделать? Что важно запомнить?",
            type: "textarea",
            required: false,
            hint: "Помогите ученикам извлечь урок",
          },
          {
            id: "reflection_question",
            label: "Вопрос для размышления",
            placeholder: "Задайте вопрос, который заставит подумать",
            type: "text",
            required: false,
            hint: "Активизирует мышление учеников",
          },
        ],
        hints: [
          "Используйте реальные случаи",
          "Покажите ошибки и их решения",
          "Объясните, почему именно так",
          "Добавьте альтернативные варианты",
        ],
      }

    case "practice":
      return {
        type: "practice",
        title: "Практика",
        description: "Задание для выполнения",
        suggestedFields: [
          {
            id: "task_description",
            label: "Формулировка задачи",
            placeholder: "Четко опишите, что нужно сделать",
            type: "textarea",
            required: true,
            hint: "Задание должно быть конкретным и выполнимым",
          },
          {
            id: "instructions",
            label: "Инструкция",
            placeholder: "Пошаговое руководство к выполнению",
            type: "textarea",
            required: true,
            hint: "Помогите ученику не запутаться",
          },
          {
            id: "time_estimate",
            label: "Время выполнения",
            placeholder: "Сколько времени потребуется? (например: 15-20 минут)",
            type: "text",
            required: false,
            hint: "Помогает ученику планировать время",
          },
          {
            id: "success_criteria",
            label: "Критерии успеха",
            placeholder: "Как понять, что задание выполнено правильно?",
            type: "textarea",
            required: false,
            hint: "Дает ученику ориентир для самопроверки",
          },
          {
            id: "resources",
            label: "Материалы и ресурсы",
            placeholder: "Что понадобится для выполнения?",
            type: "textarea",
            required: false,
            hint: "Список инструментов, ссылок, файлов",
          },
        ],
        hints: [
          "Задание на 10-15 минут оптимально",
          "Добавьте чек-лист для самопроверки",
          "Предусмотрите разные уровни сложности",
          "Дайте обратную связь по результатам",
        ],
      }

    case "knowledge_check":
      return {
        type: "knowledge_check",
        title: "Проверка знаний",
        description: "Тест или вопросы",
        suggestedFields: [
          {
            id: "questions",
            label: "Вопросы",
            placeholder: "Сформулируйте 3-5 вопросов по теме",
            type: "textarea",
            required: true,
            hint: "Каждый вопрос с новой строки",
          },
          {
            id: "answer_options",
            label: "Варианты ответов",
            placeholder: "Для каждого вопроса укажите варианты ответов",
            type: "textarea",
            required: false,
            hint: "Используйте формат: А) вариант 1, Б) вариант 2",
          },
          {
            id: "correct_answers",
            label: "Правильные ответы",
            placeholder: "Укажите правильные ответы с объяснениями",
            type: "textarea",
            required: true,
            hint: "Объясните, почему именно этот ответ правильный",
          },
          {
            id: "feedback",
            label: "Обратная связь",
            placeholder: "Что сказать ученику после прохождения теста?",
            type: "textarea",
            required: false,
            hint: "Поддержите и дайте рекомендации",
          },
        ],
        hints: [
          "3-5 вопросов оптимально",
          "Объясните правильные ответы",
          "Добавьте поддерживающую обратную связь",
          "Проверяйте понимание, а не память",
        ],
      }

    default:
      return {
        type: "theory",
        title: "Образовательный блок",
        description: "Структурированный контент",
        suggestedFields: [],
        hints: [],
      }
  }
}

export interface CourseTemplate {
  blocks: CourseBlock[]
  hints: string[]
  focusAreas: string[]
}

export interface CourseLesson {
  id: string
  title: string
  description: string
  order: number
  blocks: CourseBlock[]
  completed: boolean
}

export const getTemplateForAuthorType = (authorType: string): CourseTemplate => {
  const baseBlocks: CourseBlock[] = [
    {
      id: "introduction",
      type: "introduction",
      title: "Как работать с уроком",
      description: "Инструкция для ученика перед началом урока",
      purpose: "Объяснить ученику, зачем нужен урок и что он получит",
      elements: [],
      required: true,
      completed: false,
      category: 'meta',
      studentOrder: 1, // Первым для ученика
    },
    {
      id: "navigation",
      type: "navigation",
      title: "Навигация",
      description: "Структура урока для ученика",
      purpose: "Помочь ученику сориентироваться в структуре урока",
      elements: [],
      required: false,
      completed: false,
      category: 'meta',
      studentOrder: 2, // Вторым для ученика
    },
    {
      id: "main_block_1",
      type: "main_block_1",
      title: "Основной блок 1",
      description: "Первая ключевая тема урока",
      purpose: "Дать основные знания по первой важной теме",
      elements: [],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 3,
    },
    {
      id: "intermediate_practice",
      type: "intermediate_practice",
      title: "Промежуточная практика",
      description: "Закрепление материала через действие",
      purpose: "Помочь ученику применить полученные знания на практике",
      elements: [],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 5,
    },
    {
      id: "main_block_2",
      type: "main_block_2",
      title: "Основной блок 2",
      description: "Вторая ключевая тема урока",
      purpose: "Развить тему или дать дополнительные важные знания",
      elements: [],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 4,
    },
    {
      id: "intermediate_test",
      type: "intermediate_test",
      title: "Промежуточный тест",
      description: "Проверка понимания материала",
      purpose: "Убедиться, что ученик усвоил пройденный материал",
      elements: [],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 6,
    },
    {
      id: "main_block_3",
      type: "main_block_3",
      title: "Основной блок 3",
      description: "Третья ключевая тема или углубление",
      purpose: "Завершить изучение темы или дать продвинутые знания",
      elements: [],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 7,
    },
    {
      id: "conclusion",
      type: "conclusion",
      title: "Интеграция и завершение",
      description: "Итоги урока и следующие шаги",
      purpose: "Подвести итоги и дать ученику план дальнейших действий",
      elements: [],
      required: true,
      completed: false,
      category: 'meta',
      studentOrder: 8,
    },
    {
      id: "bonus_support",
      type: "bonus_support",
      title: "Бонус и поддержка",
      description: "Дополнительные материалы и поддержка",
      purpose: "Предоставить дополнительные ресурсы и возможности для связи",
      elements: [],
      required: false,
      completed: false,
      category: 'educational',
      studentOrder: 9,
    },
  ]

  const getAdaptedElementsForBlock = (blockType: CourseBlock["type"], authorType: string): CourseElement[] => {
    // Определяем базовые элементы для каждого типа автора
    const authorElementsMap: Record<string, CourseElement["type"][]> = {
      Оратор: ["video", "audio", "text"],
      Методист: ["title", "text", "image", "file", "test", "task"],
      "Автор на вдохновении": ["video", "text", "image", "task"],
      Первопроходец: ["video", "text", "file", "task", "test"],
      "Загруженный эксперт": ["audio", "text", "title", "file", "task", "test"],
      "Педагог с эмпатией": ["video", "text", "audio", "test", "task"],
      "Практик-рационал": ["text", "task", "file", "image", "test"],
      "Интуитивный автор": ["image", "video", "text", "task", "test"],
    }

    // Получаем элементы для данного типа автора
    const authorElements = authorElementsMap[authorType] || ["text", "video", "task"]

    // Адаптируем элементы в зависимости от типа блока
    let blockElements: CourseElement["type"][] = []

    switch (blockType) {
      case "introduction":
        if (authorType === "Оратор") {
          blockElements = ["video", "audio", "text"]
        } else if (authorType === "Методист") {
          blockElements = ["title", "text", "image"]
        } else if (authorType === "Автор на вдохновении") {
          blockElements = ["video", "text", "image"]
        } else if (authorType === "Первопроходец") {
          blockElements = ["video", "text", "file"]
        } else if (authorType === "Загруженный эксперт") {
          blockElements = ["audio", "text", "title"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["video", "text", "audio"]
        } else if (authorType === "Практик-рационал") {
          blockElements = ["text", "task", "file"]
        } else if (authorType === "Интуитивный автор") {
          blockElements = ["image", "video", "text"]
        } else {
          blockElements = ["text", "video"]
        }
        break

      case "navigation":
        if (authorType === "Методист") {
          blockElements = ["text", "image", "file"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["text", "video", "test"]
        } else {
          blockElements = ["text"]
        }
        break

      case "main_block_1":
      case "main_block_2":
      case "main_block_3":
        if (authorType === "Оратор") {
          blockElements = ["video", "audio", "text"]
        } else if (authorType === "Методист") {
          blockElements = ["text", "image", "file"]
        } else if (authorType === "Автор на вдохновении") {
          blockElements = ["text", "video", "image"]
        } else if (authorType === "Первопроходец") {
          blockElements = ["text", "image", "file"]
        } else if (authorType === "Загруженный эксперт") {
          blockElements = ["audio", "text", "file"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["text", "video", "test"]
        } else if (authorType === "Практик-рационал") {
          blockElements = ["text", "task", "image"]
        } else if (authorType === "Интуитивный автор") {
          blockElements = ["image", "text", "video"]
        } else {
          blockElements = ["text", "video"]
        }
        break

      case "intermediate_practice":
        if (authorType === "Оратор") {
          blockElements = ["audio", "task", "video"]
        } else if (authorType === "Методист") {
          blockElements = ["task", "test", "text"]
        } else if (authorType === "Автор на вдохновении") {
          blockElements = ["task", "text", "image"]
        } else if (authorType === "Первопроходец") {
          blockElements = ["task", "file", "test"]
        } else if (authorType === "Загруженный эксперт") {
          blockElements = ["audio", "task", "test"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["task", "test", "text"]
        } else if (authorType === "Практик-рационал") {
          blockElements = ["task", "test", "file"]
        } else if (authorType === "Интуитивный автор") {
          blockElements = ["task", "image", "test"]
        } else {
          blockElements = ["task", "test"]
        }
        break

      case "intermediate_test":
        if (authorType === "Оратор") {
          blockElements = ["audio", "test"]
        } else if (authorType === "Методист") {
          blockElements = ["test", "task", "text"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["test", "task", "text"]
        } else {
          blockElements = ["test", "task"]
        }
        break

      case "conclusion":
        if (authorType === "Оратор") {
          blockElements = ["video", "audio", "text"]
        } else if (authorType === "Методист") {
          blockElements = ["text", "image", "file"]
        } else if (authorType === "Автор на вдохновении") {
          blockElements = ["text", "video", "image"]
        } else if (authorType === "Первопроходец") {
          blockElements = ["text", "video", "file"]
        } else if (authorType === "Загруженный эксперт") {
          blockElements = ["audio", "text", "file"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["text", "video", "task"]
        } else if (authorType === "Практик-рационал") {
          blockElements = ["text", "task", "image"]
        } else if (authorType === "Интуитивный автор") {
          blockElements = ["image", "video", "text"]
        } else {
          blockElements = ["text", "video"]
        }
        break

      case "bonus_support":
        if (authorType === "Оратор") {
          blockElements = ["video", "audio"]
        } else if (authorType === "Методист") {
          blockElements = ["file", "text", "image"]
        } else if (authorType === "Автор на вдохновении") {
          blockElements = ["video", "image", "task"]
        } else if (authorType === "Первопроходец") {
          blockElements = ["file", "video", "text"]
        } else if (authorType === "Загруженный эксперт") {
          blockElements = ["file", "audio", "text"]
        } else if (authorType === "Педагог с эмпатией") {
          blockElements = ["text", "video", "task"]
        } else if (authorType === "Практик-рационал") {
          blockElements = ["file", "task", "image"]
        } else if (authorType === "Интуитивный автор") {
          blockElements = ["image", "video", "task"]
        } else {
          blockElements = ["file", "text"]
        }
        break

      default:
        blockElements = authorElements.slice(0, 3)
    }

    // Создаем элементы
    return blockElements.map((type, index) => ({
      id: `${blockType}_element_${index}`,
      type,
      content: "",
      required: index === 0, // Первый элемент обязательный
      completed: false,
    }))
  }

  return {
    blocks: baseBlocks.map((block) => ({
      ...block,
      elements: getAdaptedElementsForBlock(block.type, authorType),
    })),
    hints: getAuthorTypeHints(authorType),
    focusAreas: getAuthorTypeFocusAreas(authorType),
  }
}

export const getStandardTemplate = (): CourseTemplate => {
  const baseBlocks: CourseBlock[] = [
    {
      id: "introduction",
      type: "introduction",
      title: "Как работать с уроком",
      description: "Инструкция для ученика перед началом урока",
      purpose: "Объяснить ученику, зачем нужен урок и что он получит",
      elements: [
        { id: "intro_title", type: "title", content: "", required: true, completed: false },
        { id: "intro_text", type: "text", content: "", required: true, completed: false },
        { id: "intro_goals", type: "text", content: "", required: true, completed: false },
      ],
      required: true,
      completed: false,
      category: 'meta',
      studentOrder: 1,
    },
    {
      id: "navigation",
      type: "navigation",
      title: "Навигация",
      description: "Структура урока для ученика",
      purpose: "Помочь ученику сориентироваться в структуре урока",
      elements: [
        { id: "nav_structure", type: "text", content: "", required: true, completed: false },
        { id: "nav_instructions", type: "text", content: "", required: false, completed: false },
      ],
      required: false,
      completed: false,
      category: 'meta',
      studentOrder: 2,
    },
    {
      id: "main_block_1",
      type: "main_block_1",
      title: "Основной блок 1",
      description: "Первая ключевая тема урока",
      purpose: "Дать основные знания по первой важной теме",
      elements: [
        { id: "main1_theory", type: "text", content: "", required: true, completed: false },
        { id: "main1_example", type: "text", content: "", required: true, completed: false },
        { id: "main1_task", type: "task", content: "", required: true, completed: false },
      ],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 3,
    },
    {
      id: "intermediate_practice",
      type: "intermediate_practice",
      title: "Промежуточная практика",
      description: "Закрепление материала через действие",
      purpose: "Помочь ученику применить полученные знания на практике",
      elements: [
        { id: "practice_task", type: "task", content: "", required: true, completed: false },
        { id: "practice_instruction", type: "text", content: "", required: true, completed: false },
        { id: "practice_criteria", type: "text", content: "", required: true, completed: false },
      ],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 5,
    },
    {
      id: "main_block_2",
      type: "main_block_2",
      title: "Основной блок 2",
      description: "Вторая ключевая тема урока",
      purpose: "Развить тему или дать дополнительные важные знания",
      elements: [
        { id: "main2_development", type: "text", content: "", required: true, completed: false },
        { id: "main2_connection", type: "text", content: "", required: true, completed: false },
      ],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 4,
    },
    {
      id: "intermediate_test",
      type: "intermediate_test",
      title: "Промежуточный тест",
      description: "Проверка понимания материала",
      purpose: "Убедиться, что ученик усвоил пройденный материал",
      elements: [
        { id: "test_questions", type: "test", content: "", required: true, completed: false },
        { id: "test_feedback", type: "text", content: "", required: false, completed: false },
      ],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 6,
    },
    {
      id: "main_block_3",
      type: "main_block_3",
      title: "Основной блок 3",
      description: "Третья ключевая тема или углубление",
      purpose: "Завершить изучение темы или дать продвинутые знания",
      elements: [
        { id: "main3_advanced", type: "text", content: "", required: true, completed: false },
        { id: "main3_application", type: "task", content: "", required: true, completed: false },
      ],
      required: true,
      completed: false,
      category: 'educational',
      studentOrder: 7,
    },
    {
      id: "conclusion",
      type: "conclusion",
      title: "Интеграция и завершение",
      description: "Итоги урока и следующие шаги",
      purpose: "Подвести итоги и дать ученику план дальнейших действий",
      elements: [
        { id: "conclusion_summary", type: "text", content: "", required: true, completed: false },
        { id: "conclusion_reflection", type: "text", content: "", required: true, completed: false },
        { id: "conclusion_next_steps", type: "text", content: "", required: true, completed: false },
      ],
      required: true,
      completed: false,
      category: 'meta',
      studentOrder: 8,
    },
    {
      id: "bonus_support",
      type: "bonus_support",
      title: "Бонус и поддержка",
      description: "Дополнительные материалы и поддержка",
      purpose: "Предоставить дополнительные ресурсы и возможности для связи",
      elements: [
        { id: "bonus_materials", type: "file", content: "", required: false, completed: false },
        { id: "support_contact", type: "text", content: "", required: false, completed: false },
      ],
      required: false,
      completed: false,
      category: 'educational',
      studentOrder: 9,
    },
  ]

  return {
    blocks: baseBlocks,
    hints: ["Правило: 1 блок = 1 мысль", "Структура: теория → пример → практика", "Добавляйте переходы между темами"],
    focusAreas: ["Универсальный подход"],
  }
}

const getAuthorTypeHints = (authorType: string): string[] => {
  const hints: Record<string, string[]> = {
    Оратор: [
      "Сначала расскажите, потом оформите",
      'Используйте кнопку "Записать голосовое сообщение"',
      "Минимальные требования к письменному тексту",
    ],
    Методист: [
      "Создайте подробную карту урока перед началом",
      "Используйте чек-листы обязательных элементов",
      "Добавьте схемы связей между блоками",
    ],
    "Автор на вдохновении": [
      "Используйте гибкие шаблоны",
      "Можете менять порядок блоков",
      "Творческий подход приветствуется",
    ],
    Первопроходец: [
      "Экспериментируйте с новыми форматами",
      "Добавляйте инновационные элементы",
      "Создавайте уникальный контент",
    ],
    "Загруженный эксперт": [
      "Используйте голосовой ввод для быстрого создания",
      "Автоматическое сохранение включено",
      "Создавайте урок частями, когда есть время",
    ],
    "Педагог с эмпатией": [
      "Добавьте блоки проверки понимания",
      "Предусмотрите альтернативные объяснения",
      "Включите FAQ и возможные сложности",
    ],
    "Практик-рационал": [
      "Фокусируйтесь на конкретных результатах",
      "Добавляйте цифры и кейсы",
      "Структура: проблема → шаги → результат",
    ],
    "Интуитивный автор": [
      "Свобода в оформлении",
      "Используйте визуальные и креативные форматы",
      "Комбинируйте разные типы контента",
    ],
  }

  return (
    hints[authorType] || [
      "Правило: 1 блок = 1 мысль",
      "Структура: теория → пример → практика",
      "Добавляйте переходы между темами",
    ]
  )
}

const getAuthorTypeFocusAreas = (authorType: string): string[] => {
  const focusAreas: Record<string, string[]> = {
    Оратор: ["Аудио/видео формат", "Помощь в оформлении"],
    Методист: ["Подробный шаблон", "Расширенные блоки и этапы"],
    "Автор на вдохновении": ["Гибкий шаблон", "Мягкие напоминания и этапность"],
    Первопроходец: ["Инновационные форматы", "Экспериментальные подходы"],
    "Загруженный эксперт": ["Быстрая сборка", "Шаблоны", "Голосовой ввод"],
    "Педагог с эмпатией": ["Подсказки по фидбэку", "Блоки вопросов и рефлексии"],
    "Практик-рационал": ["Шаблон проблема-решение", "Чёткие задания"],
    "Интуитивный автор": ["Свободная сборка", "Визуальные и креативные форматы"],
  }

  return focusAreas[authorType] || ["Универсальный подход"]
}

// Умные подсказки в реальном времени
export const getSmartHints = (block: CourseBlock, authorType: string): string[] => {
  const hints: string[] = []

  // Проверка структуры
  if (block.elements.filter((el) => el.completed).length === 0) {
    hints.push("Начните с заголовка и краткого описания")
  }

  // Проверка содержания
  const hasTheory = block.elements.some((el) => el.type === "text" && el.completed)
  const hasExample = block.elements.some((el) => el.content.includes("пример"))
  const hasTask = block.elements.some((el) => el.type === "task")

  if (hasTheory && !hasExample) {
    hints.push("Добавьте пример для лучшего понимания")
  }

  if (hasTheory && hasExample && !hasTask) {
    hints.push("Хорошо бы закрепить тестом или заданием")
  }

  // Персонализированные подсказки
  if (authorType === "Педагог с эмпатией") {
    hints.push("Добавьте проверку понимания")
  }

  if (authorType === "Практик-рационал") {
    hints.push("Объясните практическую ценность")
  }

  return hints
}

// Проверка готовности курса
export const validateCourse = (blocks: CourseBlock[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  blocks.forEach((block) => {
    const requiredElements = block.elements.filter((el) => el.required)
    const completedRequired = requiredElements.filter((el) => el.completed)

    if (completedRequired.length < requiredElements.length) {
      errors.push(`Блок "${block.title}": заполните все обязательные поля`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const getPersonalizedInterface = (authorProfile: {
  author_type: string
  communication_style: string
  motivation: string
  barrier: string
}) => {
  const { communication_style, motivation, barrier } = authorProfile

  const interface_adaptations = {
    // Адаптация по стилю подачи
    style_features: getStyleFeatures(communication_style),
    // Адаптация по мотивации
    motivation_focus: getMotivationFocus(motivation),
    // Адаптация по барьерам
    barrier_support: getBarrierSupport(barrier),
    // Персональные подсказки
    personal_hints: getPersonalHints(communication_style, motivation, barrier),
  }

  return interface_adaptations
}

const getStyleFeatures = (style: string) => {
  switch (style) {
    case "говорю":
      return {
        priority_elements: ["video", "audio"],
        interface_hints: ["Сначала расскажите, потом оформите", "Используйте голосовой ввод"],
        quick_actions: ["record_voice", "add_video"],
        text_requirements: "minimal",
      }
    case "пишу":
      return {
        priority_elements: ["text"],
        interface_hints: ["Используйте структурированные тексты", "Добавляйте списки и маркеры"],
        quick_actions: ["add_text", "format_text"],
        text_requirements: "extended",
      }
    case "структурирую":
      return {
        priority_elements: ["text", "image"],
        interface_hints: ["Начните с плана урока", "Используйте схемы и чек-листы"],
        quick_actions: ["create_outline", "add_checklist"],
        text_requirements: "structured",
      }
    case "миксую":
      return {
        priority_elements: ["text", "video", "image", "audio"],
        interface_hints: ["Комбинируйте разные форматы", "Творческий подход приветствуется"],
        quick_actions: ["add_mixed_content", "creative_tools"],
        text_requirements: "flexible",
      }
    default:
      return {
        priority_elements: ["text", "video"],
        interface_hints: ["Выберите удобный формат"],
        quick_actions: ["add_content"],
        text_requirements: "standard",
      }
  }
}

const getMotivationFocus = (motivation: string) => {
  switch (motivation) {
    case "делиться опытом":
      return {
        content_suggestions: ["Добавьте личную историю", "Расскажите о своем опыте"],
        block_additions: ["personal_story", "experience_block"],
        tone: "personal",
        questions: ["Как это было у вас?", "Какой опыт вы получили?"],
      }
    case "польза":
      return {
        content_suggestions: ["Покажите практическое применение", "Добавьте конкретные примеры"],
        block_additions: ["practical_task", "application_example"],
        tone: "helpful",
        questions: ["Как это поможет ученику?", "Где можно применить?"],
      }
    case "доход":
      return {
        content_suggestions: ["Опишите ценность урока", "Покажите результаты и ROI"],
        block_additions: ["value_proposition", "results_block"],
        tone: "business",
        questions: ["Какую ценность это даст?", "Какой результат получит ученик?"],
      }
    case "понятность":
      return {
        content_suggestions: ["Добавьте проверку понимания", "Предусмотрите FAQ"],
        block_additions: ["understanding_check", "faq_block"],
        tone: "empathetic",
        questions: ["Что может быть непонятно?", "Как лучше объяснить?"],
      }
    default:
      return {
        content_suggestions: ["Добавьте полезный контент"],
        block_additions: ["content_block"],
        tone: "neutral",
        questions: ["Что важно знать ученику?"],
      }
  }
}

const getBarrierSupport = (barrier: string) => {
  switch (barrier) {
    case "страх":
      return {
        ui_mode: "beginner_friendly",
        encouragement: ["Начните с черновика", "Ошибки - это нормально", "Можете скрыть урок до готовности"],
        templates: "simple",
        validation: "gentle",
        save_frequency: "auto",
      }
    case "перегруз":
      return {
        ui_mode: "step_by_step",
        encouragement: ["Не всё сразу", "Один блок за раз", "Используйте готовые шаблоны"],
        templates: "structured",
        validation: "progressive",
        save_frequency: "frequent",
      }
    case "уверенность":
      return {
        ui_mode: "full_access",
        encouragement: ["Используйте все возможности", "Экспериментируйте"],
        templates: "advanced",
        validation: "comprehensive",
        save_frequency: "manual",
      }
    case "нет времени":
      return {
        ui_mode: "quick_creation",
        encouragement: ["Быстрые шаблоны", "Голосовой ввод", "Создавайте частями"],
        templates: "express",
        validation: "minimal",
        save_frequency: "auto",
      }
    default:
      return {
        ui_mode: "standard",
        encouragement: ["Создавайте в удобном темпе"],
        templates: "standard",
        validation: "standard",
        save_frequency: "regular",
      }
  }
}

const getPersonalHints = (style: string, motivation: string, barrier: string) => {
  const hints: string[] = []

  // Комбинированные подсказки на основе всех параметров
  if (style === "говорю" && barrier === "нет времени") {
    hints.push("Записывайте голосовые заметки - их можно быстро превратить в контент")
  }

  if (motivation === "понятность" && style === "структурирую") {
    hints.push("Создайте пошаговую схему - ученикам будет легче следовать")
  }

  if (barrier === "страх" && motivation === "делиться опытом") {
    hints.push("Начните с простой истории из своего опыта - это всегда интересно")
  }

  if (style === "миксую" && motivation === "польза") {
    hints.push("Комбинируйте теорию с практическими заданиями для максимальной пользы")
  }

  // Универсальные подсказки
  hints.push("Правило: 1 блок = 1 ключевая мысль")
  hints.push("Структура: введение → объяснение → пример → практика")

  return hints
}

export const getContextualHints = (
  block: CourseBlock,
  authorProfile: {
    author_type: string
    communication_style: string
    motivation: string
    barrier: string
  },
) => {
  const hints: string[] = []
  const { communication_style, motivation, barrier } = authorProfile

  // Анализ текущего состояния блока
  const hasContent = block.elements.some((el) => el.content.trim().length > 0)
  const hasTitle = block.elements.some((el) => el.type === "title" && el.content.trim().length > 0)
  const hasTask = block.elements.some((el) => el.type === "task")
  const hasExample = block.elements.some((el) => el.content.includes("пример") || el.content.includes("например"))

  // Базовые структурные подсказки
  if (!hasTitle) {
    hints.push("Начните с заголовка блока")
  }

  if (hasTitle && !hasContent) {
    if (communication_style === "говорю") {
      hints.push("Запишите короткое видео-объяснение")
    } else {
      hints.push("Добавьте основное содержание")
    }
  }

  if (hasContent && !hasExample) {
    hints.push("Добавьте пример для лучшего понимания")
  }

  if (hasContent && hasExample && !hasTask && block.type !== "introduction") {
    hints.push("Закрепите материал практическим заданием")
  }

  // Персонализированные подсказки по мотивации
  if (motivation === "понятность" && hasContent) {
    hints.push("Добавьте вопрос для проверки понимания")
  }

  if (motivation === "делиться опытом" && hasContent) {
    hints.push("Поделитесь личным опытом по этой теме")
  }

  if (motivation === "польза" && hasContent) {
    hints.push("Объясните, как это применить на практике")
  }

  // Подсказки по барьерам
  if (barrier === "страх" && block.elements.length > 3) {
    hints.push("Не перегружайте блок - лучше разбить на части")
  }

  if (barrier === "перегруз" && hasContent) {
    hints.push("Отлично! Переходите к следующему блоку")
  }

  if (barrier === "нет времени" && communication_style === "говорю") {
    hints.push("Используйте голосовые заметки для быстрого создания")
  }

  return hints
}

// Интерфейс для проверки элементов урока
export interface LessonElementsCheck {
  hasExample: boolean
  hasPractice: boolean
  hasConclusion: boolean
  missingElements: Array<'example' | 'practice' | 'conclusion'>
}

// Интерфейс для динамической подсказки
export interface DynamicHint {
  id: string
  type: 'example' | 'practice' | 'conclusion'
  message: string
  priority: number
}

// Проверка наличия элементов в уроке
// Принимает CourseBlock[] или ExtendedCourseBlock[] для гибкости
export function checkLessonElements(blocks: CourseBlock[]): LessonElementsCheck {
  let hasExample = false
  let hasPractice = false
  let hasConclusion = false

  // Проверяем каждый блок
  blocks.forEach((block) => {
    // Проверка на пример
    const hasExampleInBlock = block.elements.some((el) => {
      // Проверяем educationalType (для ExtendedCourseElement)
      const extendedEl = el as any
      if (extendedEl.educationalType === 'example') {
        // Проверяем наличие контента в элементе
        const content = el.content?.trim() || ''
        if (content.length > 0) {
          return true
        }
      }
      // Проверяем содержимое на наличие слова "пример" (только если есть контент)
      const content = el.content?.toLowerCase() || ''
      if (content.length > 0 && (content.includes('пример') || content.includes('например'))) {
        return true
      }
      return false
    })

    if (hasExampleInBlock) {
      hasExample = true
    }

    // Проверка на практику
    // Проверяем тип блока (intermediate_practice содержит практику)
    if (block.type === 'intermediate_practice') {
      // Проверяем, что в блоке есть элементы с контентом
      const hasContentInPracticeBlock = block.elements.some((el) => {
        const content = el.content?.trim() || ''
        return content.length > 0
      })
      if (hasContentInPracticeBlock) {
        hasPractice = true
      }
    } else {
      const hasPracticeInBlock = block.elements.some((el) => {
        // Проверяем тип элемента и наличие контента
        if (el.type === 'task') {
          const content = el.content?.trim() || ''
          if (content.length > 0) {
            return true
          }
        }
        // Проверяем educationalType и наличие контента
        const extendedEl = el as any
        if (extendedEl.educationalType === 'practice') {
          const content = el.content?.trim() || ''
          if (content.length > 0) {
            return true
          }
        }
        return false
      })

      if (hasPracticeInBlock) {
        hasPractice = true
      }
    }

    // Проверка на итог (блок conclusion с заполненным контентом)
    if (block.type === 'conclusion') {
      const hasContent = block.elements.some((el) => el.content && el.content.trim().length > 0)
      if (hasContent) {
        hasConclusion = true
      }
    }
  })

  const missingElements: Array<'example' | 'practice' | 'conclusion'> = []
  if (!hasExample) missingElements.push('example')
  if (!hasPractice) missingElements.push('practice')
  if (!hasConclusion) missingElements.push('conclusion')

  return {
    hasExample,
    hasPractice,
    hasConclusion,
    missingElements,
  }
}

// Генерация динамических подсказок
export function generateDynamicHints(check: LessonElementsCheck): DynamicHint[] {
  const hints: DynamicHint[] = []

  // Приоритет 1: Пример
  if (!check.hasExample) {
    hints.push({
      id: 'hint-example',
      type: 'example',
      message: 'Добавьте пример',
      priority: 1,
    })
  }

  // Приоритет 2: Практика
  if (!check.hasPractice) {
    hints.push({
      id: 'hint-practice',
      type: 'practice',
      message: 'Добавьте практику или задание',
      priority: 2,
    })
  }

  // Приоритет 3: Итог
  if (!check.hasConclusion) {
    hints.push({
      id: 'hint-conclusion',
      type: 'conclusion',
      message: 'Сформулируйте итог',
      priority: 3,
    })
  }

  // Сортируем по приоритету
  return hints.sort((a, b) => a.priority - b.priority)
}
