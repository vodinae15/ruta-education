"use client"

import React, { useState } from "react"
import { FlipCards } from "@/components/adaptation/templates/original/FlipCards"
import { StructuredText } from "@/components/adaptation/templates/original/StructuredText"
import { MermaidDiagram } from "@/components/adaptation/templates/visual/MermaidDiagram"
import { ComparisonTable } from "@/components/adaptation/templates/visual/ComparisonTable"
import { AudioUploadBlock } from "@/components/adaptation/templates/auditory/AudioUploadBlock"
import { AudioCards } from "@/components/adaptation/templates/auditory/AudioCards"
import { GoalsChecklist } from "@/components/adaptation/templates/kinesthetic/GoalsChecklist"
import { PracticalText } from "@/components/adaptation/templates/kinesthetic/PracticalText"
import { PracticeBlock } from "@/components/adaptation/blocks/PracticeBlock"
import { AttachmentsBlock } from "@/components/adaptation/blocks/AttachmentsBlock"
import { TestBlock } from "@/components/adaptation/blocks/TestBlock"

type AdaptationType = "original" | "visual" | "auditory" | "kinesthetic"

export default function AdaptationPreviewPage() {
  const [selectedType, setSelectedType] = useState<AdaptationType>("original")

  // Примеры данных для демонстрации
  const sampleFlipCards = [
    { id: "1", front: "Реакция", back: "Химический процесс превращения одних веществ в другие" },
    { id: "2", front: "Катализатор", back: "Вещество, ускоряющее химическую реакцию" },
    { id: "3", front: "Продукт", back: "Вещество, образующееся в результате реакции" },
    { id: "4", front: "Реагент", back: "Исходное вещество, вступающее в реакцию" },
    { id: "5", front: "Энергия активации", back: "Минимальная энергия для начала реакции" },
    { id: "6", front: "Скорость реакции", back: "Изменение концентрации веществ за единицу времени" },
  ]

  const sampleStructuredText = {
    sections: [
      {
        id: "1",
        title: "Введение в тему",
        content: "Химические реакции - это основа всех процессов в природе и технике.",
      },
      {
        id: "2",
        title: "Основные понятия",
        content: "Каждая реакция характеризуется скоростью, энергией и продуктами.",
      },
    ],
  }

  const sampleComparisonTable = {
    rows: [
      {
        id: "1",
        concept: "Экзотермическая реакция",
        definition: "Реакция с выделением тепла",
        signs: "Нагрев, свет",
        example: "Горение",
      },
      {
        id: "2",
        concept: "Эндотермическая реакция",
        definition: "Реакция с поглощением тепла",
        signs: "Охлаждение",
        example: "Фотосинтез",
      },
    ],
  }

  const sampleAudioCards = [
    { id: "1", term: "Реакция", audioUrl: "", duration: "0:45" },
    { id: "2", term: "Катализатор", audioUrl: "", duration: "1:20" },
    { id: "3", term: "Продукт", audioUrl: "", duration: "0:55" },
    { id: "4", term: "Реагент", audioUrl: "", duration: "1:05" },
    { id: "5", term: "Энергия активации", audioUrl: "", duration: "1:30" },
    { id: "6", term: "Скорость реакции", audioUrl: "", duration: "1:10" },
  ]

  const sampleGoals = [
    { id: "1", goal: "Понять механизм химических реакций", completed: false },
    { id: "2", goal: "Научиться определять типы реакций", completed: false },
    { id: "3", goal: "Применять знания на практике", completed: false },
  ]

  const samplePracticalText = {
    sections: [
      {
        id: "1",
        title: "Практическое применение",
        content: "Попробуйте провести простой эксперимент: смешайте соду и уксус.",
      },
    ],
  }

  const sampleIntroText = "В этом уроке мы разберем основы химических реакций. Вы узнаете, что такое реакция, какие типы реакций существуют, и как они применяются в реальной жизни."

  const sampleContentText = "Химические реакции делятся на несколько типов в зависимости от того, выделяется или поглощается энергия. Понимание этих различий поможет вам предсказывать поведение веществ."

  const sampleAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Пример аудио для демонстрации

  // Пример распределения основного текстового контента по блокам
  const mainTextBlock1 = `Химические реакции окружают нас повсюду: от процессов в нашем организме до явлений природы и технологических процессов. Понимание механизмов химических реакций является фундаментом для изучения многих естественных наук.

Химическая реакция — это процесс превращения одних веществ (реагентов) в другие (продукты реакции). При этом происходит разрыв старых химических связей и образование новых. Важно понимать, что в ходе химической реакции атомы не исчезают и не появляются, а лишь перераспределяются между молекулами.`

  const mainTextBlock2 = `Все химические реакции можно классифицировать по различным признакам. Один из важнейших критериев — это энергетический баланс реакции.

Экзотермические реакции сопровождаются выделением энергии в виде тепла. Примером может служить горение: когда дрова сгорают в камине, выделяется большое количество тепла и света. Другой пример — реакция нейтрализации кислоты щелочью.

Эндотермические реакции, напротив, требуют постоянного подвода энергии извне. Классический пример — фотосинтез в растениях, где энергия солнечного света используется для превращения углекислого газа и воды в глюкозу и кислород.`

  const mainTextBlock3 = `Скорость химической реакции — это изменение концентрации реагентов или продуктов за единицу времени. На скорость реакции влияют несколько факторов:

1. Температура — при повышении температуры молекулы движутся быстрее, чаще сталкиваются друг с другом, что ускоряет реакцию.

2. Концентрация реагентов — чем больше концентрация, тем выше вероятность столкновения молекул.

3. Площадь поверхности — измельченные вещества реагируют быстрее, так как имеют большую площадь контакта.

4. Присутствие катализатора — вещества, которые ускоряют реакцию, не расходуясь при этом.`

  const mainTextBlock4 = `Катализаторы играют особую роль в химии. Они снижают энергию активации реакции — минимальную энергию, необходимую для начала химического процесса. При этом катализатор не входит в состав конечных продуктов и может использоваться многократно.

В живых организмах роль катализаторов выполняют ферменты — белковые молекулы, которые ускоряют биохимические реакции в миллионы раз. Без ферментов большинство реакций в организме протекали бы слишком медленно для поддержания жизни.

В промышленности катализаторы применяются повсеместно: от производства серной кислоты до переработки нефти и создания полимеров.`

  const mainTextBlock5 = `Закон сохранения массы, сформулированный М.В. Ломоносовым, гласит: масса веществ, вступивших в реакцию, равна массе образовавшихся продуктов. Этот закон является основой для составления уравнений химических реакций.

При написании уравнения реакции необходимо уравнять количество атомов каждого элемента в левой и правой частях уравнения. Это делается с помощью коэффициентов перед формулами веществ.

Понимание химических реакций открывает двери к осознанному изучению окружающего мира и позволяет предсказывать поведение веществ в различных условиях.`

  const adaptationTypes = [
    {
      id: "original" as const,
      name: "Оригинальный",
      description: "Для тех, кто любит структуру и систематизацию. Четкие определения и логичное изложение.",
    },
    {
      id: "visual" as const,
      name: "Визуальный",
      description: "Для тех, кто лучше воспринимает информацию через схемы и таблицы. Наглядные связи между понятиями.",
    },
    {
      id: "auditory" as const,
      name: "Аудиальный",
      description: "Для тех, кто предпочитает слушать. Удобно учиться во время прогулки или в дороге.",
    },
    {
      id: "kinesthetic" as const,
      name: "Кинестетический",
      description: "Для тех, кто учится через действие. Практические задачи и пошаговые инструкции.",
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Заголовок */}
      <div className="bg-white border-b border-[#E5E7EB] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            Шаблоны <span className="text-[#5589a7]">адаптации курсов</span>
          </h1>
          <p className="text-lg text-slate-600">
            Выберите тип адаптации, чтобы увидеть структуру шаблона
          </p>
        </div>
      </div>

      {/* Выбор типа адаптации */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {adaptationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`text-left p-6 rounded-lg border-2 transition-all duration-200 ${
                selectedType === type.id
                  ? "border-[#659AB8] bg-[#E8F4FA]"
                  : "border-[#E5E7EB] bg-white hover:border-[#659AB8]"
              }`}
            >
              <h3 className="font-semibold text-slate-900 mb-2">{type.name}</h3>
              <p className="text-sm text-slate-600">{type.description}</p>
            </button>
          ))}
        </div>

        {/* Информационная плашка */}
        <div className="bg-[#FDF8F3] border border-[#E5E7EB] rounded-lg p-4 mb-8">
          <p className="text-sm text-slate-600">
            <strong>Примечание:</strong> Это пустые шаблоны. После генерации AI заполнит их
            содержимым на основе вашего урока. Вы сможете редактировать любой текст, но не
            изменять структуру блоков.
          </p>
        </div>

        {/* Структура из 5 блоков */}
        <div className="space-y-6">
          {/* Блок 1 - зависит от типа */}
          {selectedType === "original" && <FlipCards isEmpty={false} cards={sampleFlipCards} introText={sampleIntroText} mainText={mainTextBlock1} />}
          {selectedType === "visual" && <MermaidDiagram isEmpty={false} introText={sampleIntroText} mainText={mainTextBlock1} />}
          {selectedType === "auditory" && <AudioUploadBlock isEmpty={false} audioUrl={sampleAudioUrl} introText={sampleIntroText} mainText={mainTextBlock1} />}
          {selectedType === "kinesthetic" && <GoalsChecklist isEmpty={false} goals={sampleGoals} introText={sampleIntroText} mainText={mainTextBlock1} />}

          {/* Блок 2 - зависит от типа */}
          {selectedType === "original" && <StructuredText isEmpty={false} sections={sampleStructuredText.sections} mainText={mainTextBlock2} />}
          {selectedType === "visual" && <ComparisonTable isEmpty={false} rows={sampleComparisonTable.rows} contentText={sampleContentText} mainText={mainTextBlock2} />}
          {selectedType === "auditory" && <AudioCards isEmpty={false} cards={sampleAudioCards} contentText={sampleContentText} mainText={mainTextBlock2} />}
          {selectedType === "kinesthetic" && <PracticalText isEmpty={false} sections={samplePracticalText.sections} mainText={mainTextBlock2} />}

          {/* Блок 3 - Практика (одинаковый для всех) */}
          <PracticeBlock isEmpty={false} mainText={mainTextBlock3} />

          {/* Блок 4 - Вложения (одинаковый для всех) */}
          <AttachmentsBlock isEmpty={false} mainText={mainTextBlock4} />

          {/* Блок 5 - Тест (одинаковый для всех) */}
          <TestBlock isEmpty={false} mainText={mainTextBlock5} />
        </div>

        {/* Итоговая информация */}
        <div className="mt-8 bg-white border border-[#E5E7EB] rounded-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Структура адаптации "{adaptationTypes.find((t) => t.id === selectedType)?.name}"
          </h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <strong>Обзор темы:</strong>{" "}
                {selectedType === "original" && "6 интерактивных флип-карточек"}
                {selectedType === "visual" && "Визуальная диаграмма с узлами и связями"}
                {selectedType === "auditory" && "Аудио-обзор темы (3-5 минут)"}
                {selectedType === "kinesthetic" && "Структура целей с интерактивным чек-листом"}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <strong>Основы темы:</strong>{" "}
                {selectedType === "original" && "Структурированный текст с разделами"}
                {selectedType === "visual" &&
                  "Таблица сравнения (4 колонки: Понятие, Определение, Признаки, Пример)"}
                {selectedType === "auditory" && "6 аудио-карточек с терминами"}
                {selectedType === "kinesthetic" && "Практико-ориентированный текст с примерами"}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <strong>Практическое закрепление:</strong> Практические задания (одинаковые для
                всех типов)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <div>
                <strong>Углубленное изучение:</strong> Все медиа-вложения из оригинального урока
                (видео, аудио, документы, изображения)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#659AB8] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">5</span>
              </div>
              <div>
                <strong>Итоговое задание:</strong> Тест из 10 вопросов (одна попытка)
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка возврата */}
        <div className="mt-8 text-center">
          <a
            href="/course-constructor"
            className="inline-block bg-[#659AB8] text-white px-8 py-3 border-2 border-[#659AB8] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#5589a7] hover:border-[#5589a7]"
          >
            Вернуться к конструктору
          </a>
        </div>
      </div>
    </div>
  )
}
