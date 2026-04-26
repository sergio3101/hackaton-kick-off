# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Веб-сервис тренировочных интервью для подготовки специалистов к кик-оффам (хакатон-проект **P2**, ТЗ — `doc/ТЗ Сервис подготовки специалистов к кик-оффам.md`). MVP: голосовое Q&A + лайв-кодинг + LLM-оценка по смыслу + отчёт.

Активный бэклог багов и улучшений — `doc/improvements.md` (приоритеты P0/P1/P2, статусы `[ ]/[~]/[x]/[-]`). Сверяться с ним перед началом работы и переносить закрытые пункты в раздел «Готово».

## Стек и команды

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, Postgres 16. Точка входа `backend/app/main.py`.
- **LLM/Voice**: OpenAI (`gpt-4o-mini`, `whisper-1`, `tts-1`) — клиент в `backend/app/llm/`.
- **Frontend**: React 18 + Vite + TS + Tailwind + Monaco. Точка входа `frontend/src/main.tsx`.
- **Запуск всего**: `docker compose up --build` (предварительно `cp .env.example .env` и подставить `OPENAI_API_KEY`).
- **Локальный dev** (только БД в Docker): `docker compose up -d db`, затем `uvicorn app.main:app --reload` в `backend/` и `npm run dev` в `frontend/`.
- **Миграции**: `alembic upgrade head` (выполняется автоматически в backend-контейнере при старте).

## Архитектурные ориентиры

Полный сценарий MVP проходит через четыре связанных слоя — менять один без понимания соседей опасно:

1. **Загрузка → банк вопросов** (`POST /api/requirements`). Один LLM-вызов в `llm/extract.py` возвращает `summary + topics + бан вопросов на матрицу тема × уровень` (схема в `llm/prompts.py: EXTRACT_JSON_SCHEMA`). Темы и вопросы пишутся в `requirements.topics` (jsonb) и таблицу `question_bank`.
2. **Создание сессии** (`POST /api/sessions`). Фильтр банка по выбранным темам + уровню → берём 10 вопросов (`VOICE_QUESTIONS_PER_SESSION` в `routers/sessions.py`) с равномерным распределением по темам, плюс одна кодинг-задача из `llm/generate.py`. Всё материализуется в `session_questions` (`type=voice|coding`).
3. **Интервью**:
   - **Голос** — WebSocket `/ws/interview/{session_id}?token=...` (`routers/interview_ws.py`). Клиент шлёт `hello / answer(audio_b64) / skip / next / finish`, сервер отвечает `question / transcript / evaluation / done / error`. Поток: TTS вопроса → webm-чанк ответа → STT → eval LLM → возможно follow-up. Оценка в `llm/evaluate.py: evaluate_voice_answer`.
   - **Кодинг** — REST `POST /api/sessions/{id}/coding/review` (`llm/evaluate.py: review_code`). Голос и кодинг работают параллельно на одной странице (`pages/Interview.tsx` со split-screen).
4. **Завершение** (`POST /api/sessions/{id}/finish`) собирает `session_summary` (агрегаты + overall через `llm/evaluate.py: make_overall_summary`) и переводит сессию в `finished`. Отчёт читается через `GET /api/sessions/{id}/report`.

JSON-схемы всех LLM-ответов определены в одном файле `backend/app/llm/prompts.py` — менять схемы и парсеры в `extract.py / generate.py / evaluate.py` нужно синхронно.

## Конвенции, не очевидные из кода

- Темы из `requirements.topics` хранятся как `[{name, description}]`; в `question_bank.topic` идёт строка-имя — связь по имени, не по id. Если ИИ неконсистентно назовёт темы между этапами — банк не наполнится.
- WS использует JWT из query-параметра `?token=...` (браузерный WebSocket не поддерживает кастомные заголовки). Аутентификация делается через `auth.decode_token`.
- На фронте JWT лежит в `localStorage["kickoff.token"]`, axios interceptor добавляет его в `Authorization`. При 401 интерцептор чистит токен.
- Голосовая страница построена на хуке `useVoiceSession` — он держит и WS, и MediaRecorder; при размонтировании останавливает поток микрофона. Перезапускать соединение можно вызовом `connect()` повторно.
- Лимит размера склейки `.md` — 200_000 символов (см. `routers/requirements.py`); при превышении 413.

## Что важно при правках

- Любое изменение моделей в `app/models.py` требует новой Alembic-миграции в `backend/alembic/versions/`. Текущая стартовая — `0001_initial.py`.
- При добавлении новой LLM-задачи: добавить системный промпт + JSON-схему в `prompts.py`, отдельный модуль в `llm/`, использовать `response_format={"type": "json_schema", ...}` для строгой валидации.
- Stylistically: на фронте используем Tailwind utility-классы напрямую без UI-библиотеки. Monaco грузим только на странице интервью.
