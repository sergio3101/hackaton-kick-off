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
          <b>Kick-off Prep</b> — сервис тренировочных интервью для подготовки
          специалистов к кик-оффу проекта. По описанию проекта (Markdown-артефактам)
          сервис проводит голосовое интервью с ИИ-наставником, лайв-кодинг, оценивает
          ответы по смыслу и формирует итоговый отчёт.
        </p>
        <p>
          Голосовая часть работает через OpenAI Realtime API: ИИ говорит потоково,
          сам определяет конец вашей реплики (без кнопок), показывает живой транскрипт,
          поддерживает наводящие подсказки, если кандидат застрял.
        </p>
      </Section>

      <Section title="Роли">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Админ</b> — загружает ТЗ проекта, управляет пользователями, назначает
            интервью, просматривает отчёты и аналитику.
          </li>
          <li>
            <b>Пользователь</b> — проходит назначенные интервью и получает отчёты.
          </li>
        </ul>
      </Section>

      <Section title="Как админ создаёт интервью">
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Загрузить ТЗ</b> (раздел «Администрирование → Загрузить ТЗ»). Можно
            склеить несколько Markdown-файлов или вставить текст напрямую.
            ИИ извлечёт summary, темы (до 6) и сгенерирует банк вопросов на матрицу
            «тема × уровень» (junior / middle / senior).
          </li>
          <li>
            <b>Проверить проект</b> в разделе «Проекты» — можно отредактировать темы
            или догенерировать недостающие вопросы.
          </li>
          <li>
            <b>Создать назначение</b> в «Администрирование → Назначения»: выбрать
            пользователя, проект, темы, уровень, режим (голосовой / текстовый),
            длительность сессии, голос интервьюера и LLM-модель оценки.
          </li>
          <li>
            После назначения пользователь увидит кикофф в своём списке «Мои кикоффы».
          </li>
        </ol>
      </Section>

      <Section title="Как пользователь проходит интервью">
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            Открыть «Мои кикоффы» → нажать «Начать» на нужном назначении.
          </li>
          <li>
            На странице интервью разделение на две колонки:{" "}
            <b>слева — голосовое Q&amp;A</b>, <b>справа — задача лайв-кодинга</b>{" "}
            в Monaco-редакторе. Между ними переключаются вкладки сверху.
          </li>
          <li>
            <b>Голос</b>: после нажатия «Начать интервью» ИИ-наставник сам зачитывает
            первый вопрос. Просто отвечайте естественно — система определит, когда вы
            закончили говорить. На экране растёт живой транскрипт ваших слов и
            индикатор уровня микрофона.
          </li>
          <li>
            <b>Не знаете ответ?</b> Скажите «не знаю с чего начать» — наставник
            подскажет направление, не раскрывая решения. Можно задавать ему
            уточняющие вопросы («что именно имеется в виду?») — он ответит, не
            подсказывая правильный ответ.
          </li>
          <li>
            <b>Перебить можно</b>: начните говорить во время речи AI — он замолчит и
            начнёт слушать. Или нажмите кнопку «Прервать».
          </li>
          <li>
            <b>Оценка</b> ответа приходит на экран через 1–2 секунды после того, как
            модель уже начала следующий вопрос — не нужно ждать.
          </li>
          <li>
            <b>Лайв-кодинг</b>: 3 задачи под выбранные темы. Кнопкой «Запустить» можно
            проверить решение в песочнице (Python), кнопкой «Отправить решение» —
            получить LLM-ревью.
          </li>
          <li>
            По кнопке <b>«Завершить»</b> в верхнем правом углу или после прохождения
            всех вопросов сервис формирует отчёт.
          </li>
        </ol>
      </Section>

      <Section title="Что в отчёте">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            Агрегаты по сессии: количество верных / частично-верных / неверных /
            пропущенных ответов.
          </li>
          <li>Общий резюме (overall) от LLM на 3–5 предложений.</li>
          <li>
            По каждому вопросу: ваш ответ, эталонный ответ, что было упущено по
            сравнению с эталоном.
          </li>
          <li>Результаты лайв-кодинга с эталонным решением и комментариями.</li>
          <li>Стоимость сессии в USD (для админа).</li>
          <li>Кнопка «Скачать PDF» — отчёт в pdf для оффлайн-просмотра.</li>
        </ul>
      </Section>

      <Section title="Подсказки и горячие моменты">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            Если ответ короткий или выпали ключевые термины, ИИ может задать{" "}
            <b>follow-up</b> — уточняющий вопрос. Это нормально и часто вытягивает
            ответ из «частично» в «верно».
          </li>
          <li>
            <b>Текстовый режим</b> назначения — для вопросов, где голос неудобен
            (формулы, фрагменты кода). Все ответы вводятся текстом, без TTS/STT.
          </li>
          <li>
            <b>Время сессии</b> ограничено — таймер виден сверху. За 2 минуты до
            конца — предупреждение. По истечении неотвеченные вопросы помечаются
            «пропущено».
          </li>
          <li>
            При обрыве связи фронт автоматически переподключается. Сессию можно
            продолжить, нажав «Продолжить» в «Моих кикоффах».
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
            <b>Backend</b>: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, PostgreSQL 16,
            JWT, <code>websockets&gt;=13</code>.
          </li>
          <li>
            <b>LLM/Voice</b>: OpenAI Realtime API (<code>gpt-4o-realtime-preview</code>) —
            голосовой канал; <code>gpt-4o-mini</code> — оценка по смыслу;{" "}
            <code>whisper-1</code> встроен в Realtime для транскрипции.
          </li>
          <li>
            <b>Frontend</b>: React 18 + Vite + TypeScript, Tailwind, Monaco Editor,
            TanStack Query. Микрофон — <code>AudioWorkletNode</code> (PCM16 24 kHz).
          </li>
          <li>
            <b>Инфра</b>: Docker Compose (db + backend + frontend), Alembic-миграции
            при старте.
          </li>
        </ul>
      </Section>

      <Section title="Архитектура: четыре слоя MVP">
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <b>Загрузка → банк вопросов</b> (<code>POST /api/requirements</code>) —
            один LLM-вызов в <code>llm/extract.py</code> возвращает{" "}
            <code>summary + topics + банк вопросов</code> на матрицу «тема × уровень».
            Пишется в <code>requirements.topics</code> (jsonb) и таблицу{" "}
            <code>question_bank</code>.
          </li>
          <li>
            <b>Создание сессии</b> (<code>POST /api/sessions</code>) — фильтр банка
            по выбранным темам и уровню, отбор 10 голосовых вопросов с равномерным
            распределением по темам и 3 кодинг-задач. Материализуется в{" "}
            <code>session_questions</code>.
          </li>
          <li>
            <b>Интервью</b>: голос — WebSocket{" "}
            <code>/ws/interview/&#123;id&#125;?ticket=...</code>; кодинг — REST
            (<code>POST /api/sessions/&#123;id&#125;/coding/review</code>). Голос и
            кодинг работают параллельно на одной странице (split-screen).
          </li>
          <li>
            <b>Завершение</b> (<code>POST /api/sessions/&#123;id&#125;/finish</code>)
            собирает агрегаты + overall, переводит сессию в <code>finished</code>.
            Отчёт — <code>GET /api/sessions/&#123;id&#125;/report</code>.
          </li>
        </ol>
      </Section>

      <Section title="Голосовой канал — Realtime (по умолчанию)">
        <p>
          Бэкенд — двунаправленный мост между фронтом и{" "}
          <code>wss://api.openai.com/v1/realtime</code>. Live-сообщения
          (<code>routers/interview_ws.py: _run_realtime</code>):
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
            <code>finish</code> — завершить досрочно; бэк глушит мост и шлёт{" "}
            <code>done</code>.
          </li>
        </ul>
        <p style={{ margin: "10px 0 6px" }}>
          <b>Сервер → клиент</b>:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>question</code> — meta: id, idx, тема, текст, is_follow_up.
          </li>
          <li>
            <code>tts_chunk</code> — PCM16 24 kHz audio.delta (TTS), играется встык
            через очередь <code>AudioBufferSourceNode</code>.
          </li>
          <li>
            <code>tts_done</code>, <code>vad</code>{" "}
            (<code>state: speech | idle</code>),{" "}
            <code>partial_transcript</code>, <code>speech_completed</code>.
          </li>
          <li>
            <code>transcript</code> — финальный ответ кандидата (<b>только</b> на{" "}
            <code>submit_answer</code>; уточняющие реплики в лог не попадают).
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
          <code>submit_answer(question_id, transcript)</code> по завершении ответа
          кандидата. Сервер запускает <code>evaluate_voice_answer</code> через{" "}
          <code>asyncio.to_thread</code> — evaluation не блокирует голосовой поток,
          модель уже зачитывает следующий вопрос, пока gpt-4o-mini считает оценку.
        </p>
      </Section>

      <Section title="Legacy / text-режим">
        <p>
          Используется для текстовых сессий (<code>session.mode === "text"</code>) и
          как fallback при <code>VOICE_REALTIME_ENABLED=False</code>. Сообщения:{" "}
          <code>hello / answer (audio_b64) / answer_text / skip / next / replay /
          finish</code> ↔{" "}
          <code>question / transcript / evaluation / awaiting_next / done / error</code>
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
              ["OPENAI_CHAT_MODEL", "По умолчанию gpt-4o-mini (evaluate/extract/summary)."],
              [
                "OPENAI_REALTIME_MODEL",
                "По умолчанию gpt-4o-realtime-preview-2024-12-17.",
              ],
              [
                "OPENAI_TTS_VOICE",
                "alloy / ash / ballad / coral / echo / sage / shimmer / verse / marin / cedar.",
              ],
              [
                "VOICE_REALTIME_ENABLED",
                "True (default) — Realtime; False — старый Whisper-1 + TTS-1 пайплайн.",
              ],
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
          <code>backend/app/llm/prompt_templates/*.md</code> — обычные markdown-файлы,
          правятся в любом редакторе и читаются как документы (с подсветкой и
          нормальным diff). JSON-схемы для строгой валидации ответов LLM и
          tool-описание <code>SUBMIT_ANSWER_TOOL</code> для Realtime — в{" "}
          <code>backend/app/llm/prompt_schemas.py</code>. Публичный API —{" "}
          <code>app/llm/prompts.py</code>: тонкий fasade с{" "}
          <code>lru_cache</code> на чтение <code>.md</code> и re-export схем.
        </p>
        <p style={{ marginBottom: 6 }}>
          <b>Шаблоны</b>:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>extract.md</code> — извлечение summary + тем + банка вопросов из ТЗ
            (плейсхолдеры <code>{"{n}"}</code>, <code>{"{total_for_4}"}</code>).
          </li>
          <li>
            <code>topic_questions.md</code> — догенерация недостающих вопросов по
            паре «тема × уровень».
          </li>
          <li>
            <code>coding_task.md</code>, <code>coding_tasks.md</code> — генерация
            одной/нескольких лайв-кодинг задач.
          </li>
          <li>
            <code>voice_eval.md</code> — оценка голосового ответа (gpt-4o-mini).
          </li>
          <li>
            <code>code_review.md</code> — ревью решения по задаче.
          </li>
          <li>
            <code>realtime_interviewer.md</code> — системный промпт ИИ-наставника в
            Realtime API. Плейсхолдеры <code>{"{project_summary}"}</code> и{" "}
            <code>{"{questions_block}"}</code> подставляются в{" "}
            <code>realtime.build_session_config</code>.
          </li>
          <li>
            <code>summary.md</code> — overall-резюме сессии.
          </li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Чтобы поправить тон/правила интервьюера, поведение в наводящих или формат
          оценки — достаточно отредактировать соответствующий <code>.md</code> и
          перезапустить backend. Код трогать не нужно.
        </p>
      </Section>

      <Section title="Стоимость и тарифы Realtime">
        <p>
          Стоимость Realtime токенов (<code>gpt-4o-realtime-preview</code>, 2026-Q1):
          текст $5/M input · $20/M output, аудио $100/M input · $200/M output.
          Кешированный input — ×0.5. Тарифы — в{" "}
          <code>cost_tracker.REALTIME_PRICING_PER_M_TOKENS</code>; запись —{" "}
          <code>record_realtime_usage</code> на каждый <code>response.done</code>.
        </p>
        <p>
          Ориентир — ~$0.06–0.30 за минуту разговора. <code>total_cost_usd</code> в
          отчёте суммирует все <code>LLMUsage</code>: <code>kind="realtime"</code>{" "}
          (основной кусок) + <code>voice_eval</code> (gpt-4o-mini) +{" "}
          <code>extract</code> / <code>generate</code> / <code>summary</code> /{" "}
          <code>code_review</code> + старые <code>stt</code> / <code>tts</code> для
          legacy-сессий.
        </p>
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
│   ├── main.py                  FastAPI + CORS + роуты
│   ├── config.py                pydantic-settings (env)
│   ├── models.py                ORM (sessions, requirements, llm_usage, ...)
│   ├── schemas.py               Pydantic (ALLOWED_VOICES = realtime list)
│   ├── auth.py                  JWT + ws-ticket
│   ├── routers/
│   │   ├── requirements.py      upload .md + LLM extract
│   │   ├── sessions.py          create / get / finish / coding-review
│   │   ├── interview_ws.py      WS: _run_realtime + _run_legacy
│   │   ├── analytics.py
│   │   ├── admin.py
│   │   └── reports.py           PDF
│   └── llm/
│       ├── client.py            OpenAI клиент
│       ├── prompts.py           публичный API промптов (тонкий fasade)
│       ├── prompt_schemas.py    JSON-схемы + SUBMIT_ANSWER_TOOL
│       ├── prompt_templates/    *.md — системные промпты (правятся как тексты)
│       │   ├── extract.md
│       │   ├── topic_questions.md
│       │   ├── coding_task.md
│       │   ├── coding_tasks.md
│       │   ├── voice_eval.md
│       │   ├── code_review.md
│       │   ├── realtime_interviewer.md
│       │   └── summary.md
│       ├── extract.py           summary + topics + банк
│       ├── generate.py          кодинг-задачи
│       ├── evaluate.py          voice eval / code review / overall
│       ├── voice.py             Whisper STT + TTS (legacy)
│       ├── realtime.py          RealtimeBridge → wss://api.openai.com/v1/realtime
│       └── cost_tracker.py      учёт стоимости (chat/tts/stt/realtime)
└── alembic/                     миграции

frontend/src/
├── api/                         axios + типы (TTS_VOICES = realtime list)
├── auth/                        AuthProvider + JWT
├── components/                  Layout, Icon, ThemeToggle, ErrorBoundary, UI
├── pages/                       Dashboard, Projects, Upload, Sessions,
│                                Interview, Report, Analytics, AdminUsers,
│                                AdminAssignments, AdminSessionReview,
│                                MyAssignments, Docs
└── features/
    ├── voice/                   useVoiceSession (realtime + legacy),
    │                            VoiceInteract, VoiceLog, MicLevelMeter,
    │                            LiveTranscript, pcmWorklet.js
    └── coding/                  CodingEditor + CodingResults`}
        </pre>
      </Section>

      <Section title="Где смотреть подробности">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <code>CLAUDE.md</code> — архитектурные ориентиры и неочевидные конвенции.
          </li>
          <li>
            <code>README.md</code> — запуск, env, сценарий использования.
          </li>
          <li>
            <code>doc/improvements.md</code> — бэклог багов/улучшений с приоритетами.
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
