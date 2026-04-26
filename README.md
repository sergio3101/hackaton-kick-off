# Kick-off Prep — сервис тренировочных интервью

Веб-сервис, который по описанию проекта (Markdown-артефактам) проводит тренировочное
голосовое интервью и лайв-кодинг, а в конце выдаёт объективный отчёт. Сделан под
хакатон по ТЗ из `doc/ТЗ Сервис подготовки специалистов к кик-оффам.md`.

## Стек

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, PostgreSQL 16, JWT, `websockets>=13`.
- **LLM/Voice**: OpenAI Realtime API (`gpt-4o-realtime-preview`) для голосового канала с server-VAD, потоковым TTS и barge-in; `gpt-4o-mini` для оценки ответов; `whisper-1` встроен в Realtime для транскрипции (а также используется в legacy-режиме для текстовых сессий).
- **Frontend**: React 18 + Vite + TypeScript, Tailwind, Monaco Editor, TanStack Query. Микрофон через `AudioWorklet` (PCM16 24 kHz).
- **Инфра**: Docker Compose (db + backend + frontend).

## Запуск (Docker, рекомендуемо)

1. Установить Docker Desktop.
2. Скопировать пример окружения и подставить ключ OpenAI:
   ```bash
   cp .env.example .env
   # отредактировать .env, поставить OPENAI_API_KEY=sk-...
   ```
3. Поднять стек:
   ```bash
   docker compose up --build
   ```
4. Открыть http://localhost:5173. Backend будет на http://localhost:8000 (Swagger UI: `/docs`).

При первом запуске backend автоматически прогонит миграции (`alembic upgrade head`).

## Локальная разработка (без Docker для backend/frontend)

Только Postgres в Docker, backend и frontend — нативно.

```bash
# 1. Postgres
docker compose up -d db

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate    # на Windows: .venv\Scripts\activate
pip install -e .
export $(cat ../.env | xargs)                         # или подгрузить иначе
export POSTGRES_HOST=localhost
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd ../frontend
npm install
npm run dev
```

## Сценарий использования

1. Зарегистрироваться → войти.
2. **Загрузить .md артефакты** проекта (один или несколько) или вставить текст напрямую.
3. Дождаться, пока LLM сделает summary, извлечёт темы и сгенерирует банк вопросов на матрицу `тема × уровень`.
4. На странице нового интервью выбрать одну или несколько тем и уровень (junior / middle / senior).
5. На странице интервью — split-screen:
   - **слева** голосовое Q&A в Realtime-режиме: ИИ-наставник задаёт вопрос голосом потоково, кандидат отвечает естественно (server-VAD сам ловит конец реплики, можно перебивать TTS — barge-in), на экране растёт живой транскрипт + индикатор уровня микрофона. Если кандидат застрял — модель даёт наводящие подсказки без раскрытия ответа; уточняющие вопросы кандидата к модели не засчитываются как ответ. Финальная оценка приходит на gpt-4o-mini параллельно со следующим вопросом.
   - **справа** Monaco-редактор с задачей по лайв-кодингу под выбранный стек/уровень. По кнопке «отправить решение» получаем LLM-ревью.
6. По завершении (кнопкой или после всех вопросов) формируется отчёт с агрегатами и обоснованием по каждому вопросу. В шапке отчёта — `total_cost_usd`, который включает Realtime-токены (text/audio in/out, кешированные х0.5).
7. Все сессии видны в `История` и доступны для повторного просмотра отчёта.

## Структура

```
HACKATON/
├── backend/
│   ├── app/
│   │   ├── main.py             FastAPI + CORS + роуты
│   │   ├── config.py           pydantic-settings (env)
│   │   ├── db.py               SQLAlchemy engine + Base
│   │   ├── models.py           ORM модели
│   │   ├── schemas.py          Pydantic схемы
│   │   ├── auth.py             JWT + bcrypt + dependency
│   │   ├── routers/
│   │   │   ├── auth.py         register/login/me
│   │   │   ├── requirements.py upload .md + LLM extract
│   │   │   ├── sessions.py     create/get/finish/coding-review
│   │   │   └── interview_ws.py WebSocket голосового интервью (Realtime + legacy)
│   │   └── llm/
│   │       ├── client.py       OpenAI клиент
│   │       ├── prompts.py      системные промпты + JSON-схемы
│   │       ├── extract.py      summary + topics + банк вопросов
│   │       ├── generate.py     генерация одной кодинг-задачи
│   │       ├── evaluate.py     оценка ответа / ревью кода / overall
│   │       ├── realtime.py     RealtimeBridge → wss://api.openai.com/v1/realtime
│   │       ├── cost_tracker.py учёт стоимости (chat/tts/stt/realtime)
│   │       └── voice.py        Whisper STT + TTS (legacy + transcribe для text-mode)
│   └── alembic/                миграции (0001_initial)
└── frontend/
    └── src/
        ├── api/                axios клиент + типы
        ├── auth/               AuthProvider + JWT
        ├── components/Layout
        ├── pages/              Login, Register, Dashboard, Upload,
        │                       NewSession, Interview, Report, History
        └── features/
            ├── voice/          useVoiceSession (Realtime + legacy),
            │                   VoiceInteract, VoiceLog, MicLevelMeter,
            │                   LiveTranscript, pcmWorklet.js (PCM16 24 kHz)
            └── coding/         CodingEditor + CodingResults (Monaco)
```

## Переменные окружения (см. `.env.example`)

| Переменная | Назначение |
|---|---|
| `OPENAI_API_KEY` | Обязательно. Ключ OpenAI с доступом к Realtime API |
| `OPENAI_CHAT_MODEL` | По умолчанию `gpt-4o-mini` (используется для evaluate/extract/summary) |
| `OPENAI_REALTIME_MODEL` | По умолчанию `gpt-4o-realtime-preview-2024-12-17` |
| `OPENAI_TTS_VOICE` | Дефолтный голос; список валидных — Realtime API: `alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar` |
| `VOICE_REALTIME_ENABLED` | По умолчанию `True`. `False` → старый push-to-talk пайплайн (Whisper-1 + TTS-1) |
| `POSTGRES_*` | Креды БД |
| `JWT_SECRET` | Подпись JWT (заменить на проде) |
| `BACKEND_CORS_ORIGINS` | Разрешённые источники для фронта |
| `VITE_API_BASE_URL` | URL бэкенда для фронта (build-time) |

`OPENAI_STT_MODEL` (`whisper-1`), `OPENAI_TTS_MODEL` (`tts-1`), `JWT_ALGORITHM` (`HS256`), `JWT_EXPIRE_MINUTES` (`1440`) имеют разумные дефолты в `app/config.py` — задавайте только если нужно переопределить.

## Администрирование

Под ролью `admin` доступны страницы `/admin/*`:

- **`/admin/users` — Пользователи.** Создание, удаление, inline-смена роли (`user`/`admin`) и активности через чекбокс. Кнопка «карандаш» в строке раскрывает аккордеон-форму для смены `email`, `ФИО` и пароля. Поле «Новый пароль» можно оставить пустым — оно не отправится в PATCH. Бэкенд проверяет уникальность email (409 при коллизии) и блокирует попытку снять с себя роль admin, деактивировать или удалить самого себя.
- **`/admin/assignments` — Назначения.** Выбор пользователя, проекта (`Requirements`), тем, уровня, режима (`voice`/`text`), голоса (Realtime API) и LLM-модели для сессии.
- **`/admin/sessions/:id` — Отчёт по любой сессии** + публикация/снятие публикации.

Самый первый admin назначается миграцией `0007_roles_assignments.py`: первый пользователь по `id ASC` автоматически получает `role='admin'`. Дальше остальные роли раздаёт уже он сам через `/admin/users`.

## Известные ограничения MVP

- Загрузка только `.md` (PDF/DOCX не поддерживаются).
- Лайв-кодинг — только LLM-ревью без запуска кода и юнит-тестов.
- Стоимость Realtime ощутима: ориентир ~$0.06–0.30 за минуту в зависимости от соотношения говорения модели и кандидата (см. таблицу тарифов в `cost_tracker.REALTIME_PRICING_PER_M_TOKENS`). На демо ок, для прода — закрыть feature flag и подключить ограничение по часам.
- Если ключ не имеет доступа к Realtime API — отключить `VOICE_REALTIME_ENABLED` в `.env`, бэкенд автоматически уйдёт на старый Whisper/TTS-1 пайплайн.
