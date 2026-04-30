import { useState } from "react";

import Icon from "../components/Icon";

type Tab = "general" | "technical";

export default function Docs() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
            SUPPORT · DOCUMENTATION
          </div>
          <h1 className="page-title">Документация</h1>
          <div className="page-sub">
            Как устроен сервис и как им пользоваться.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--bg-line)",
          marginBottom: 18,
        }}
      >
        <TabButton active={tab === "general"} onClick={() => setTab("general")}>
          <Icon name="doc" size={14} />
          <span>Общий раздел</span>
        </TabButton>
        <TabButton active={tab === "technical"} onClick={() => setTab("technical")}>
          <Icon name="code" size={14} />
          <span>Технический раздел</span>
        </TabButton>
      </div>

      {tab === "general" ? <GeneralDocs /> : <TechnicalDocs />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        background: "transparent",
        border: "none",
        fontSize: 13,
        fontWeight: 500,
        color: active ? "var(--ink-1)" : "var(--ink-3)",
        borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
        marginBottom: -1,
        cursor: "pointer",
        transition: "color 120ms",
      }}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          margin: "0 0 12px",
          color: "var(--ink-1)",
        }}
      >
        {title}
      </h2>
      <div style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
}

function GeneralDocs() {
  return (
    <div>
      <Section title="Что это за сервис">
        <p>
          <b>Kick-off Prep</b> — тренажёр интервью для подготовки специалистов к
          кик-оффу проекта. По описанию проекта (Markdown-артефактам) сервис
          проводит голосовое Q&A с ИИ-наставником и лайв-кодинг, оценивает ответы
          по смыслу, выдаёт <b>итоговый вердикт готовности</b>{" "}
          (Готов / Почти готов / Нужна практика / Не готов) и формирует
          подробный отчёт.
        </p>
        <p>
          Голосовая часть работает через OpenAI Realtime API: ИИ говорит
          потоково, сам определяет конец вашей реплики (без кнопок), показывает
          живой транскрипт, поддерживает наводящие подсказки если кандидат
          застрял. Можно перебивать — модель замолчит и начнёт слушать.
        </p>
        <p>
          Это <b>тренажёр</b>, не одноразовый экзамен: одно и то же назначение
          можно перепроходить сколько угодно раз, отслеживая прогресс по дельте
          между попытками. Отчёт виден сразу после завершения — публикации
          результатов администратором не требуется.
        </p>
      </Section>

      <Section title="Иерархия">
        <p>Сервис оперирует четырёх-уровневой моделью:</p>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Проект (Requirements)</b> — описание ТЗ + извлечённые темы +
            банк вопросов на матрицу «тема × уровень». Загружает админ.
          </li>
          <li>
            <b>Назначение (Assignment)</b> — выдача проекта конкретному
            пользователю с настройками (темы, уровень, режим, голос, модель).
            Создаёт админ.
          </li>
          <li>
            <b>Сессия (InterviewSession)</b> — конкретное прохождение интервью
            кандидатом по этому назначению. У одного назначения может быть
            много сессий: каждая «попытка» — отдельная сессия со своим
            прогрессом.
          </li>
          <li>
            <b>Отчёт (SessionSummary)</b> — итог сессии: счётчики ответов,
            оценка, финальный вердикт LLM, рекомендация.
          </li>
        </ol>
      </Section>

      <Section title="Роли">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Админ</b> — загружает ТЗ проекта, управляет пользователями,
            создаёт и редактирует назначения, видит дашборд команды и любые
            отчёты.
          </li>
          <li>
            <b>Пользователь</b> — проходит назначенные интервью, может
            перепроходить их, смотрит свою личную статистику и историю отчётов.
          </li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Самый первый admin назначается миграцией: первый зарегистрированный
          пользователь автоматически получает роль admin. Дальше роли раздаёт
          уже он сам через «Администрирование → Пользователи».
        </p>
      </Section>

      <Section title="Как админ настраивает кикоффы">
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Загрузить ТЗ</b> (раздел «Администрирование → Загрузить ТЗ»).
            Можно склеить несколько Markdown-файлов или вставить текст
            напрямую. ИИ извлечёт summary, темы (до 6) и сгенерирует банк
            вопросов на матрицу «тема × уровень».
          </li>
          <li>
            <b>Проверить проект</b> в разделе «Проекты» — отредактировать темы
            или догенерировать вопросы. Кнопка «Назначить» на карточке проекта
            ведёт сразу к форме создания назначения с предвыбранным проектом.
          </li>
          <li>
            <b>Создать назначение</b> в «Администрирование → Назначения»:
            выбрать пользователя, проект, темы, уровень (junior/middle/senior),
            режим (голосовой/текстовый), длительность, голос интервьюера,
            модель LLM-оценки.
          </li>
          <li>
            <b>Редактировать назначение</b> можно в любой момент по иконке
            «карандаш» рядом с записью. Изменения применятся к <b>следующим</b>{" "}
            новым попыткам — старые сессии хранят свою копию параметров.
          </li>
          <li>
            <b>Удалить назначение</b> можно только пока по нему не было ни
            одной попытки.
          </li>
        </ol>
      </Section>

      <Section title="Дашборд админа">
        <p>Главная страница для admin-роли (`/`). Содержит:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>KPI команды</b> — сессий завершено, средний score, ответов
            суммарно, активных сейчас.
          </li>
          <li>
            <b>Активная сессия в эфире</b> — карточка с переходом в админ-вид
            сессии, если кто-то проходит интервью прямо сейчас.
          </li>
          <li>
            <b>Score по темам</b> и <b>Слабые места — что подтянуть</b> —
            списки тем с прогресс-барами; помогают увидеть проблемные зоны
            команды.
          </li>
          <li>
            <b>Активность за 30 дней</b> — бар-чарт по дням с цветовой
            кодировкой среднего score (≥70% / 40–70% / &lt;40%).
          </li>
          <li>
            <b>Назначения</b> — последние созданные кикоффы с числом попыток.
            Клик ведёт в полный список.
          </li>
          <li>
            <b>Отчёты</b> — последние завершённые сессии с финальным вердиктом
            и score; клик открывает админский вид отчёта.
          </li>
          <li>
            <b>Проекты</b> — последние загруженные ТЗ.
          </li>
        </ul>
      </Section>

      <Section title="Как пользователь проходит интервью">
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            Открыть «Мои кикоффы» → нажать <b>«Старт интервью»</b> на нужном
            назначении. Кнопка одна и та же для первого и любого
            последующего прохождения.
          </li>
          <li>
            На странице интервью — split-screen:{" "}
            <b>слева голосовое Q&amp;A</b>, <b>справа задача лайв-кодинга</b> в
            Monaco-редакторе.
          </li>
          <li>
            <b>Голос</b>: ИИ-наставник сам зачитывает первый вопрос. Отвечайте
            естественно — система определяет, когда вы закончили говорить. На
            экране растёт живой транскрипт и индикатор уровня микрофона.
          </li>
          <li>
            <b>Не знаете ответ?</b> Скажите «не знаю с чего начать» — наставник
            подскажет направление, не раскрывая решения. Можно задавать ему
            уточняющие вопросы — он ответит, не подсказывая правильный ответ.
          </li>
          <li>
            <b>Перебить</b> можно начав говорить во время речи AI или кнопкой
            «Прервать».
          </li>
          <li>
            <b>Лайв-кодинг</b>: 3 задачи под выбранные темы. Кнопка «Запустить»
            проверяет решение в песочнице (Python и др.), кнопка «Отправить
            решение» — получает LLM-ревью с эталонным решением.
          </li>
          <li>
            По кнопке <b>«Завершить»</b> в верхнем правом углу или после
            прохождения всех вопросов сервис сразу формирует отчёт и
            показывает его — ждать публикации администратором не нужно.
          </li>
        </ol>
      </Section>

      <Section title="Повторное прохождение и список попыток">
        <p>
          Каждый клик «Старт интервью» создаёт <b>новую</b> сессию (если
          предыдущая уже завершена). Старая остаётся в истории — её можно
          открыть и сравнить.
        </p>
        <p>
          На карточке кикоффа в «Моих кикоффах» рядом с уровнем виден
          мини-индикатор «<code>▾ Попыток: N</code>». Клик по карточке
          раскрывает список всех попыток снизу:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>#N</code> — порядковый номер. <b>★</b> рядом с номером — у
            попытки с лучшим score.
          </li>
          <li>Дата старта и длительность.</li>
          <li>
            <b>Breakdown ответов</b> — <code>✓N ~M ✗K −L</code> (верно /
            частично / неверно / пропущено) с цветами.
          </li>
          <li>Финальный вердикт LLM.</li>
          <li>
            <b>Score</b> + <b>дельта</b> по сравнению с предыдущей попыткой:{" "}
            <code>↑ +15%</code> зелёным, <code>↓ −10%</code> красным.
          </li>
          <li>Кнопка «Открыть отчёт» по каждой завершённой попытке.</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Сортировка списка — <b>свежие сверху</b>; нумерация попыток
          хронологическая (#1 — самая первая).
        </p>
      </Section>

      <Section title="Статистика пользователя">
        <p>
          Раздел «Статистика» (`/me/stats`) показывает сводку по всем вашим
          завершённым попыткам в тренажёре.
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Попыток завершено</b> + лучший вердикт (личный максимум по всем
            кикоффам).
          </li>
          <li>
            <b>Лучший score</b> — личный рекорд.
          </li>
          <li>
            <b>Средний score</b> — текущий уровень.
          </li>
          <li>
            <b>Время в тренажёре</b> — суммарная длительность всех finished
            сессий.
          </li>
          <li>
            <b>Распределение вердиктов</b> — сколько раз получали «Готов» /
            «Почти» / «Нужна практика» / «Не готов».
          </li>
          <li>
            <b>История попыток</b> — список последних 10 завершённых сессий с
            быстрым переходом в отчёт.
          </li>
        </ul>
      </Section>

      <Section title="Что в отчёте">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Финальный вердикт</b> — большой бейдж в шапке отчёта:{" "}
            «Готов / Почти готов / Нужна практика / Не готов».
          </li>
          <li>
            <b>Рекомендация</b> от LLM на 1–2 предложения: что повторить и
            какой следующий шаг.
          </li>
          <li>
            <b>KPI</b>: Score, Покрытие (отвеченных / задано), Верно (с
            частично).
          </li>
          <li>
            <b>AI-резюме</b> сессии на 3–5 предложений (общий уровень, сильные
            стороны, что подтянуть).
          </li>
          <li>
            <b>По каждому вопросу</b>: ваш ответ, обоснование оценки, эталонный
            ответ, что было упущено.
          </li>
          <li>Результаты лайв-кодинга с эталонным решением.</li>
          <li>Стоимость сессии в USD (видна только админу).</li>
          <li>Кнопка «PDF» — отчёт в pdf для оффлайн-просмотра.</li>
        </ul>
      </Section>

      <Section title="Подсказки и горячие моменты">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            Если ответ короткий или выпали ключевые термины, ИИ может задать
            <b> follow-up</b> — уточняющий вопрос. Это часто вытягивает ответ
            из «частично» в «верно».
          </li>
          <li>
            <b>Текстовый режим</b> назначения — для вопросов, где голос
            неудобен (формулы, фрагменты кода). Все ответы вводятся текстом,
            без TTS/STT.
          </li>
          <li>
            <b>Время сессии</b> ограничено — таймер виден сверху. За 2 минуты
            до конца — предупреждение. По истечении неотвеченные вопросы
            помечаются «пропущено».
          </li>
          <li>
            При обрыве связи фронт автоматически переподключается. Сессию
            можно продолжить, нажав «Продолжить» в «Моих кикоффах».
          </li>
          <li>
            Если OpenAI недоступен (регион/ключ/квота), в UI появится плашка
            с понятным сообщением и подсказкой что чинить (VPN, прокси через{" "}
            <code>OPENAI_BASE_URL</code>, замена ключа).
          </li>
        </ul>
      </Section>
    </div>
  );
}

function TechnicalDocs() {
  return (
    <div>
      <Section title="Стек">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Backend</b>: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic,
            PostgreSQL 16, JWT, <code>websockets&gt;=13</code>.
          </li>
          <li>
            <b>LLM/Voice</b>: OpenAI Realtime API (
            <code>gpt-4o-realtime-preview</code>) — голосовой канал;{" "}
            <code>gpt-4o-mini</code> — оценка по смыслу и финальный вердикт;{" "}
            <code>whisper-1</code> встроен в Realtime для транскрипции.
          </li>
          <li>
            <b>Frontend</b>: React 18 + Vite + TypeScript, Tailwind, Monaco
            Editor, TanStack Query, React Router. Микрофон —{" "}
            <code>AudioWorkletNode</code> (PCM16 24 kHz).
          </li>
          <li>
            <b>Инфра</b>: Docker Compose (db + backend + frontend), Alembic
            миграции автоматически при старте.
          </li>
        </ul>
      </Section>

      <Section title="Модель данных и иерархия">
        <pre
          className="mono"
          style={{
            fontSize: 11,
            background: "var(--bg-1)",
            padding: 12,
            borderRadius: 6,
            margin: 0,
            overflow: "auto",
            color: "var(--ink-2)",
          }}
        >
{`User ──┬─→ Requirements (Проект)
       │       ├─→ QuestionBank (банк вопросов)
       │       └─→ Assignment ──→ InterviewSession (1:n) ──→ SessionSummary
       │                          │                          (вердикт + agg)
       │                          └─→ SessionQuestion[] (voice + coding)
       │                          └─→ LLMUsage (расход)
       └─→ InterviewSession (legacy: admin тестирует через POST /api/sessions)`}
        </pre>
        <p style={{ marginTop: 10 }}>
          Связь <code>Assignment.sessions</code> — 1-ко-многим (история
          попыток). При повторном «Старт интервью» создаётся новая
          <code> InterviewSession</code>; старые остаются в БД и видны и
          кандидату (в раскрытии карточки), и админу (в админских назначениях).
        </p>
      </Section>

      <Section title="Архитектура: четыре слоя MVP">
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Загрузка → банк вопросов</b> (
            <code>POST /api/requirements</code>) — один LLM-вызов в{" "}
            <code>llm/extract.py</code> возвращает{" "}
            <code>summary + topics + банк</code> на матрицу «тема × уровень».
            Результат — в <code>requirements.topics</code> (jsonb) и таблицу{" "}
            <code>question_bank</code>.
          </li>
          <li>
            <b>Создание назначения</b> (<code>POST /api/admin/assignments</code>) —
            админ выбирает user_id, проект, темы, уровень, режим. Затем{" "}
            <code>PATCH /api/admin/assignments/&#123;id&#125;</code> позволяет
            менять настройки в любой момент (правки применяются к следующим
            попыткам).
          </li>
          <li>
            <b>Старт сессии</b> (<code>POST /api/me/assignments/&#123;id&#125;/start</code>)
            — фильтр банка по выбранным темам и уровню, отбор 10 голосовых
            вопросов с равномерным распределением + 3 кодинг-задач. Если
            предыдущая попытка завершена — создаётся новая сессия (старые
            остаются в истории). Если есть незавершённая — возвращается она
            (продолжить).
          </li>
          <li>
            <b>Интервью</b>: голос — WebSocket{" "}
            <code>/ws/interview/&#123;id&#125;?ticket=...</code>; кодинг — REST
            (<code>POST /api/sessions/&#123;id&#125;/coding/review/&#123;item_id&#125;</code>).
            Голос и кодинг на одной странице (split-screen).
          </li>
          <li>
            <b>Завершение</b> (
            <code>POST /api/sessions/&#123;id&#125;/finish</code>) собирает
            агрегаты + overall + <b>final_verdict</b> + final_recommendation
            через <code>llm/evaluate.py: make_overall_summary</code>, переводит
            сессию в <code>finished</code>. Отчёт читается через{" "}
            <code>GET /api/sessions/&#123;id&#125;/report</code> — сразу,
            без публикации админом.
          </li>
        </ol>
      </Section>

      <Section title="Голосовой канал — Realtime (по умолчанию)">
        <p>
          Бэкенд — двунаправленный мост между фронтом и{" "}
          <code>wss://api.openai.com/v1/realtime</code>. Сообщения (
          <code>routers/interview_ws.py: _run_realtime</code>):
        </p>
        <p style={{ marginBottom: 6 }}>
          <b>Клиент → сервер</b>:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>hello</code> — стартовая точка, инициирует первый вопрос.
          </li>
          <li>
            <code>audio</code> — PCM16 24 kHz чанк (~50 мс) от{" "}
            <code>AudioWorkletNode</code>.
          </li>
          <li>
            <code>interrupt</code> — barge-in: остановить активный response.
          </li>
          <li>
            <code>finish</code> — завершить досрочно.
          </li>
        </ul>
        <p style={{ margin: "10px 0 6px" }}>
          <b>Сервер → клиент</b>:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>question</code> — meta (id, idx, тема, текст, is_follow_up).
          </li>
          <li>
            <code>tts_chunk</code> — PCM16 24 kHz, играется встык.
          </li>
          <li>
            <code>tts_done</code>, <code>vad</code>{" "}
            (<code>state: speech | idle</code>),{" "}
            <code>partial_transcript</code>, <code>speech_completed</code>.
          </li>
          <li>
            <code>transcript</code> — финальный ответ кандидата (
            <b>только</b> на <code>submit_answer</code>).
          </li>
          <li>
            <code>evaluation</code> — verdict от <code>gpt-4o-mini</code>.
          </li>
          <li>
            <code>done</code>, <code>time_warning</code>, <code>error</code>.
          </li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Realtime ведёт диалог; модель вызывает tool{" "}
          <code>submit_answer(question_id, transcript)</code> по завершении
          ответа. Сервер запускает <code>evaluate_voice_answer</code> через{" "}
          <code>asyncio.to_thread</code> — оценка не блокирует голосовой
          поток, модель уже зачитывает следующий вопрос.
        </p>
      </Section>

      <Section title="Обработка ошибок OpenAI">
        <p>
          Глобальный exception-handler в <code>app/main.py</code> ловит любую{" "}
          <code>OpenAIError</code> и возвращает <code>502</code> с
          человеко-читаемым русским detail (см.{" "}
          <code>app/llm/client.py: format_openai_error</code>):
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>403 unsupported_country_region_territory</code> →{" "}
            «OpenAI недоступен в вашем регионе. Используйте VPN или настройте
            прокси через <code>OPENAI_BASE_URL</code>».
          </li>
          <li>
            <code>401</code> → «Неверный <code>OPENAI_API_KEY</code>».
          </li>
          <li>
            <code>429</code> → «Rate-limit, попробуйте через минуту».
          </li>
          <li>
            <code>APIConnectionError</code> / <code>APITimeoutError</code> →
            «Не удалось связаться с OpenAI API».
          </li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Для голосового интервью (WebSocket) ошибка преобразуется в WS-сообщение{" "}
          <code>&#123;type: "error", code: "openai_unavailable", message: "..."&#125;</code>{" "}
          и фронт показывает её в плашке на странице интервью.
        </p>
      </Section>

      <Section title="Legacy / text-режим">
        <p>
          Используется для текстовых сессий (<code>session.mode === "text"</code>) и
          как fallback при <code>VOICE_REALTIME_ENABLED=False</code>. Сообщения:{" "}
          <code>hello / answer (audio_b64) / answer_text / skip / next /
          replay / finish</code>{" "}
          ↔{" "}
          <code>question / transcript / evaluation / awaiting_next / done /
          error</code>
          . Реализация — <code>_run_legacy</code> в том же файле.
        </p>
      </Section>

      <Section title="Переменные окружения">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--bg-line)" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Переменная</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Назначение</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["OPENAI_API_KEY", "Обязательно. Ключ с доступом к Realtime API."],
              ["OPENAI_CHAT_MODEL", "По умолчанию gpt-4o-mini (evaluate / extract / summary)."],
              ["OPENAI_REALTIME_MODEL", "По умолчанию gpt-4o-realtime-preview-2024-12-17."],
              ["OPENAI_TTS_VOICE", "alloy / ash / ballad / coral / echo / sage / shimmer / verse / marin / cedar."],
              ["OPENAI_BASE_URL", "Опционально. URL прокси/реверс-прокси для обхода блокировок региона."],
              ["VOICE_REALTIME_ENABLED", "True (default) — Realtime; False — старый Whisper-1 + TTS-1 пайплайн."],
              ["POSTGRES_*", "Креды БД."],
              ["JWT_SECRET", "Подпись JWT (заменить на проде)."],
              ["BACKEND_CORS_ORIGINS", "Разрешённые источники для фронта."],
              ["VITE_API_BASE_URL", "URL бэкенда для фронта (build-time)."],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: "1px solid var(--bg-line)" }}>
                <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
                  <code>{k}</code>
                </td>
                <td style={{ padding: "6px 8px", color: "var(--ink-2)" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Где хранятся промпты">
        <p>
          Текстовые системные промпты вынесены в{" "}
          <code>backend/app/llm/prompt_templates/*.md</code> — обычные
          markdown-файлы. JSON-схемы и tool-описания (включая{" "}
          <code>SUBMIT_ANSWER_TOOL</code>) — в{" "}
          <code>backend/app/llm/prompt_schemas.py</code>. Публичный API —{" "}
          <code>app/llm/prompts.py</code>.
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>extract.md</code> — извлечение summary + тем + банка
            вопросов из ТЗ.
          </li>
          <li>
            <code>topic_questions.md</code> — догенерация недостающих вопросов
            по «тема × уровень».
          </li>
          <li>
            <code>coding_task.md</code>, <code>coding_tasks.md</code> —
            генерация одной/нескольких лайв-кодинг задач.
          </li>
          <li>
            <code>voice_eval.md</code> — оценка голосового ответа
            (gpt-4o-mini).
          </li>
          <li>
            <code>code_review.md</code> — ревью решения по задаче.
          </li>
          <li>
            <code>realtime_interviewer.md</code> — системный промпт
            ИИ-наставника в Realtime API.
          </li>
          <li>
            <code>summary.md</code> — итоговое резюме сессии +{" "}
            <b>final_verdict</b> + <b>final_recommendation</b> (обновлён в
            миграции <code>0010</code>).
          </li>
        </ul>
      </Section>

      <Section title="Стоимость и тарифы Realtime">
        <p>
          Стоимость Realtime токенов (<code>gpt-4o-realtime-preview</code>):
          текст $5/M input · $20/M output, аудио $100/M input · $200/M output.
          Кешированный input — ×0.5. Тарифы — в{" "}
          <code>cost_tracker.REALTIME_PRICING_PER_M_TOKENS</code>; запись —{" "}
          <code>record_realtime_usage</code> на каждый <code>response.done</code>.
        </p>
        <p>
          Ориентир — ~$0.06–0.30 за минуту разговора. <code>total_cost_usd</code> в
          отчёте суммирует все <code>LLMUsage</code>: <code>kind="realtime"</code>{" "}
          + <code>voice_eval</code> (gpt-4o-mini) +{" "}
          <code>extract</code> / <code>generate</code> / <code>summary</code> /{" "}
          <code>code_review</code> + старые <code>stt</code> / <code>tts</code> для
          legacy-сессий.
        </p>
      </Section>

      <Section title="Ключевые миграции БД">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>0001_initial</code> — базовые таблицы.
          </li>
          <li>
            <code>0007_roles_assignments</code> — роли (admin/user) и таблица{" "}
            <code>assignments</code>; первый юзер автоматически получает admin.
          </li>
          <li>
            <code>0009_assignment_voice_model</code> — per-assignment поля
            голоса и LLM-модели (прокидываются в сессию при старте).
          </li>
          <li>
            <code>0010_summary_final_verdict</code> — поля{" "}
            <code>final_verdict</code> и <code>final_recommendation</code> в{" "}
            <code>session_summary</code> для итогового вердикта LLM.
          </li>
        </ul>
      </Section>

      <Section title="Структура репозитория">
        <pre
          className="mono"
          style={{
            fontSize: 11,
            background: "var(--bg-1)",
            padding: 12,
            borderRadius: 6,
            margin: 0,
            overflow: "auto",
            color: "var(--ink-2)",
          }}
        >
{`backend/
├── app/
│   ├── main.py                  FastAPI + CORS + OpenAIError handler
│   ├── config.py                pydantic-settings (env)
│   ├── models.py                ORM (sessions, requirements, llm_usage, ...)
│   ├── schemas.py               Pydantic (ALLOWED_VOICES = realtime list)
│   ├── auth.py                  JWT + ws-ticket
│   ├── routers/
│   │   ├── auth.py              register / login / me
│   │   ├── requirements.py      upload .md + LLM extract
│   │   ├── sessions.py          create / get / finish / coding-review
│   │   ├── interview_ws.py      WS: _run_realtime + _run_legacy
│   │   ├── analytics.py         /api/analytics/overview
│   │   ├── admin.py             users CRUD, assignments CRUD (POST/PATCH/DELETE)
│   │   └── me.py                /api/me/assignments + /start
│   └── llm/
│       ├── client.py            OpenAI клиент + format_openai_error
│       ├── prompts.py           публичный API промптов
│       ├── prompt_schemas.py    JSON-схемы + SUBMIT_ANSWER_TOOL
│       ├── prompt_templates/    *.md — системные промпты
│       ├── extract.py           summary + topics + банк
│       ├── generate.py          кодинг-задачи
│       ├── evaluate.py          voice eval / code review / OverallSummary
│       ├── voice.py             Whisper STT + TTS (legacy)
│       ├── realtime.py          RealtimeBridge → wss
│       └── cost_tracker.py      учёт стоимости
└── alembic/versions/            миграции (0001..0010)

frontend/src/
├── api/                         axios + типы (FinalVerdict + helpers)
├── auth/                        AuthProvider + JWT
├── components/                  Layout, Icon, ThemeToggle, ErrorBoundary, UI
├── pages/
│   ├── Dashboard.tsx            admin: KPI + аналитика + назначения + отчёты
│   ├── Projects.tsx             admin: список проектов
│   ├── Upload.tsx               admin: загрузка ТЗ
│   ├── RequirementsDetail.tsx   admin: проект + темы + банк вопросов
│   ├── AdminUsers.tsx           admin: пользователи (CRUD + edit form)
│   ├── AdminAssignments.tsx     admin: назначения (CRUD + раскрытие сессий)
│   ├── AdminSessionReview.tsx   admin: отчёт сессии
│   ├── MyAssignments.tsx        user: «Мои кикоффы» + раскрытие попыток
│   ├── MyStats.tsx              user: «Статистика» (KPI + распределение + история)
│   ├── Interview.tsx            split-screen: голос + кодинг
│   ├── Report.tsx               отчёт сессии (для user; admin → редирект на admin-вид)
│   └── Docs.tsx                 эта страница
└── features/
    ├── voice/                   useVoiceSession (realtime + legacy),
    │                            VoiceInteract, VoiceLog, MicLevelMeter,
    │                            LiveTranscript, pcmWorklet.js
    └── coding/                  CodingEditor + CodingResults + PasteBadge`}
        </pre>
      </Section>

      <Section title="Где смотреть подробности">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>CLAUDE.md</code> — архитектурные ориентиры и неочевидные
            конвенции.
          </li>
          <li>
            <code>README.md</code> — запуск, env, сценарий использования.
          </li>
          <li>
            <code>doc/improvements.md</code> — бэклог багов/улучшений с
            приоритетами.
          </li>
          <li>
            <code>doc/ТЗ Сервис подготовки специалистов к кик-оффам.md</code> —
            исходное ТЗ.
          </li>
        </ul>
      </Section>
    </div>
  );
}
