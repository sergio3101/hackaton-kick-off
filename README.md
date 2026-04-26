# Kick-off Prep — сервис тренировочных интервью

Веб-сервис, который по описанию проекта (Markdown-артефактам) проводит тренировочное
голосовое интервью и лайв-кодинг, а в конце выдаёт объективный отчёт. Сделан под
хакатон по ТЗ из `doc/ТЗ Сервис подготовки специалистов к кик-оффам.md`.

## Стек

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, PostgreSQL 16, JWT.
- **LLM/Voice**: OpenAI (`gpt-4o-mini` для chat, `whisper-1` для STT, `tts-1` для TTS).
- **Frontend**: React 18 + Vite + TypeScript, Tailwind, Monaco Editor, TanStack Query.
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
   - **слева** голосовое Q&A: ИИ задаёт вопрос голосом, кандидат отвечает в режиме push-to-talk; ответ распознаётся, оценивается LLM, при `partial` может последовать один follow-up;
   - **справа** Monaco-редактор с задачей по лайв-кодингу под выбранный стек/уровень. По кнопке «отправить решение» получаем LLM-ревью.
6. По завершении (кнопкой или после всех вопросов) формируется отчёт с агрегатами и обоснованием по каждому вопросу.
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
│   │   │   └── interview_ws.py WebSocket голосового интервью
│   │   └── llm/
│   │       ├── client.py       OpenAI клиент
│   │       ├── prompts.py      системные промпты + JSON-схемы
│   │       ├── extract.py      summary + topics + банк вопросов
│   │       ├── generate.py     генерация одной кодинг-задачи
│   │       ├── evaluate.py     оценка ответа / ревью кода / overall
│   │       └── voice.py        Whisper STT + TTS
│   └── alembic/                миграции (0001_initial)
└── frontend/
    └── src/
        ├── api/                axios клиент + типы
        ├── auth/               AuthProvider + JWT
        ├── components/Layout
        ├── pages/              Login, Register, Dashboard, Upload,
        │                       NewSession, Interview, Report, History
        └── features/
            ├── voice/          useVoiceSession + VoicePanel
            └── coding/         CodingPanel (Monaco)
```

## Переменные окружения (см. `.env.example`)

| Переменная | Назначение |
|---|---|
| `OPENAI_API_KEY` | Обязательно. Ключ OpenAI |
| `OPENAI_CHAT_MODEL` | По умолчанию `gpt-4o-mini` |
| `OPENAI_STT_MODEL` | По умолчанию `whisper-1` |
| `OPENAI_TTS_MODEL` | По умолчанию `tts-1` |
| `OPENAI_TTS_VOICE` | По умолчанию `alloy` |
| `POSTGRES_*` | Креды БД |
| `JWT_SECRET` | Подпись JWT (заменить на проде) |
| `BACKEND_CORS_ORIGINS` | Разрешённые источники для фронта |
| `VITE_API_BASE_URL` | URL бэкенда для фронта (build-time) |

## Известные ограничения MVP

- Загрузка только `.md` (PDF/DOCX не поддерживаются).
- Голос работает в режиме push-to-talk (без VAD/прерываний).
- Лайв-кодинг — только LLM-ревью без запуска кода и юнит-тестов.
- Реалтайм-API OpenAI не используется; STT и TTS — отдельные REST-вызовы.
