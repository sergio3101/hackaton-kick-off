# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Веб-сервис тренировочных интервью для подготовки специалистов к кик-оффам (хакатон-проект **P2**, ТЗ — `doc/ТЗ Сервис подготовки специалистов к кик-оффам.md`). MVP: голосовое Q&A + лайв-кодинг + LLM-оценка по смыслу + отчёт.

Активный бэклог багов и улучшений — `doc/improvements.md` (приоритеты P0/P1/P2, статусы `[ ]/[~]/[x]/[-]`). Сверяться с ним перед началом работы и переносить закрытые пункты в раздел «Готово».

## Стек и команды

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, Postgres 16, `websockets>=13`. Точка входа `backend/app/main.py`.
- **LLM/Voice**: OpenAI — `gpt-4o-realtime-preview` для голосового канала (audio in/out, server-VAD, barge-in), `gpt-4o-mini` для evaluation, `whisper-1` встроен в Realtime для транскрипции. Старые `whisper-1`/`tts-1` остались только в legacy-режиме (text-сессии и fallback). Клиенты в `backend/app/llm/` (`realtime.py`, `evaluate.py`, `voice.py`).
- **Frontend**: React 18 + Vite + TS + Tailwind + Monaco. Точка входа `frontend/src/main.tsx`. Микрофон через `AudioWorkletNode` (PCM16 24 kHz) — `frontend/src/features/voice/pcmWorklet.js`.
- **Запуск всего**: `docker compose up --build` (предварительно `cp .env.example .env` и подставить `OPENAI_API_KEY` с доступом к Realtime API).
- **Локальный dev** (только БД в Docker): `docker compose up -d db`, затем `uvicorn app.main:app --reload` в `backend/` и `npm run dev` в `frontend/`.
- **Миграции**: `alembic upgrade head` (выполняется автоматически в backend-контейнере при старте).
- **Feature flag**: `VOICE_REALTIME_ENABLED=False` в `.env` возвращает старый пайплайн (Whisper-batch + TTS-batch + manual push-to-talk). По умолчанию `True`.

## Архитектурные ориентиры

Полный сценарий MVP проходит через четыре связанных слоя — менять один без понимания соседей опасно:

1. **Загрузка → банк вопросов** (`POST /api/requirements`). Один LLM-вызов в `llm/extract.py` возвращает `summary + topics + бан вопросов на матрицу тема × уровень` (схема в `llm/prompts.py: EXTRACT_JSON_SCHEMA`). Темы и вопросы пишутся в `requirements.topics` (jsonb) и таблицу `question_bank`.
2. **Создание сессии** (`POST /api/sessions`). Фильтр банка по выбранным темам + уровню → берём 10 вопросов (`VOICE_QUESTIONS_PER_SESSION` в `routers/sessions.py`) с равномерным распределением по темам, плюс одна кодинг-задача из `llm/generate.py`. Всё материализуется в `session_questions` (`type=voice|coding`).
3. **Интервью**:
   - **Голос (Realtime, по умолчанию)** — WebSocket `/ws/interview/{session_id}?ticket=...` диспатчится в `_run_realtime` (`routers/interview_ws.py`). Бэкенд — двунаправленный мост между фронтом и `wss://api.openai.com/v1/realtime` (`llm/realtime.py: RealtimeBridge`). Клиент шлёт `hello / audio (PCM16 b64) / interrupt / finish`. Сервер форвардит `question (meta) / tts_chunk / tts_done / vad / partial_transcript / speech_completed / transcript / evaluation / time_warning / done / error`. Server-VAD сам коммитит реплику кандидата → модель вызывает tool **`submit_answer`** с `{question_id, transcript}` → сервер запускает `evaluate_voice_answer` (gpt-4o-mini) через `asyncio.to_thread` параллельно с тем, как Realtime уже зачитывает следующий вопрос. Промпт интервьюера + tool-схема — `llm/prompts.py: REALTIME_INTERVIEWER_SYSTEM` и `SUBMIT_ANSWER_TOOL`.
   - **Голос (legacy / text)** — `_run_legacy` в том же файле. Используется для текстовых сессий (`session.mode == "text"`) и при `VOICE_REALTIME_ENABLED=False`. Старые сообщения `answer (audio_b64) / answer_text / skip / next / replay / finish` ↔ `question / transcript / evaluation / awaiting_next / done / error`.
   - **Кодинг** — REST `POST /api/sessions/{id}/coding/review` (`llm/evaluate.py: review_code`). Голос и кодинг работают параллельно на одной странице (`pages/Interview.tsx` со split-screen).
4. **Завершение** (`POST /api/sessions/{id}/finish`) собирает `session_summary` (агрегаты + overall через `llm/evaluate.py: make_overall_summary`) и переводит сессию в `finished`. Отчёт читается через `GET /api/sessions/{id}/report`. `total_cost_usd` суммирует все `LLMUsage`-записи: `kind="realtime"` (per-response audio/text токены, см. `cost_tracker.record_realtime_usage`) + `kind="voice_eval"` (gpt-4o-mini) + старые `stt`/`tts` для legacy.

Промпты разнесены: текстовые системные промпты — в `backend/app/llm/prompt_templates/*.md` (правятся как обычные документы), JSON-схемы и tool-описания (включая `SUBMIT_ANSWER_TOOL`) — в `backend/app/llm/prompt_schemas.py`. Публичный API — `backend/app/llm/prompts.py`: тонкий fasade, который читает `.md` и переэкспортирует схемы. Менять схемы и парсеры в `extract.py / generate.py / evaluate.py` нужно синхронно.

## Конвенции, не очевидные из кода

- Темы из `requirements.topics` хранятся как `[{name, description}]`; в `question_bank.topic` идёт строка-имя — связь по имени, не по id. Если ИИ неконсистентно назовёт темы между этапами — банк не наполнится.
- WS использует короткоживущий ws-ticket из query-параметра `?ticket=...` (браузерный WebSocket не поддерживает кастомные заголовки). Fallback на `?token=...` оставлен. Аутентификация — `auth.decode_ws_ticket` / `auth.decode_token`.
- На фронте JWT лежит в `localStorage["kickoff.token"]`, axios interceptor добавляет его в `Authorization`. При 401 интерцептор чистит токен.
- Голосовая страница построена на хуке `useVoiceSession(sessionId, { mode })`. В `mode="voice"` микрофон стримит PCM16 24 kHz через `AudioWorkletNode` (`pcmWorklet.js`), TTS-чанки от Realtime склеиваются в очередь `AudioBufferSourceNode` встык. В `mode="text"` — legacy-протокол, MediaRecorder/textarea. Хук возвращает обогащённый state: `partialTranscript`, `micLevel`, `vadState`, метод `interrupt()`.
- В Realtime `transcript` (запись в лог) приходит ТОЛЬКО на `submit_answer`, не на каждое `input_audio_transcription.completed`. Уточняющие вопросы кандидата к модели и реплики-маркеры в лог не попадают — модель сама решает, что считать ответом, и кладёт его в `submit_answer.transcript` (промпт жёстко требует «только речь кандидата, без своих подсказок»).
- Голоса: список Realtime API ≠ TTS-1. Доступны `alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar` (см. `schemas.ALLOWED_VOICES` и `realtime.REALTIME_VOICES`). Если в БД остался старый `onyx`/`fable`/`nova` — `realtime.resolve_realtime_voice` упадёт на дефолтный `alloy`.
- Лимит размера склейки `.md` — 200_000 символов (см. `routers/requirements.py`); при превышении 413.

## Что важно при правках

- Любое изменение моделей в `app/models.py` требует новой Alembic-миграции в `backend/alembic/versions/`. Текущая стартовая — `0001_initial.py`.
- При добавлении новой LLM-задачи: добавить системный промпт + JSON-схему в `prompts.py`, отдельный модуль в `llm/`, использовать `response_format={"type": "json_schema", ...}` для строгой валидации.
- Realtime: при изменении set-of-events читай оба обработчика — `_run_realtime` в `routers/interview_ws.py` (server-to-client форвардинг + tool-call) и `useVoiceSession.ts` (`ws.onmessage`). Любая новая фишка диалога — это либо новый event-type, либо новый tool. Pricing для Realtime — в `cost_tracker.REALTIME_PRICING_PER_M_TOKENS` (text/audio in/out, кеш ×0.5); записывается на каждый `response.done` через `record_realtime_usage`.
- Stylistically: на фронте используем Tailwind utility-классы напрямую без UI-библиотеки. Monaco грузим только на странице интервью.
