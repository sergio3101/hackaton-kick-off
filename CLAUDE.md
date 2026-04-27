# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Веб-сервис тренировочных интервью для подготовки специалистов к кик-оффам (хакатон-проект **P2**, ТЗ — `doc/ТЗ Сервис подготовки специалистов к кик-оффам.md`). MVP: голосовое Q&A + лайв-кодинг + LLM-оценка по смыслу + итоговый вердикт готовности + отчёт.

Это **тренажёр**, не одноразовый экзамен: одно и то же назначение можно перепроходить сколько угодно раз, история попыток сохраняется. Публикации результатов администратором НЕТ — кандидат видит отчёт сразу после finish.

Активный бэклог багов и улучшений — `doc/improvements.md` (приоритеты P0/P1/P2, статусы `[ ]/[~]/[x]/[-]`). Сверяться с ним перед началом работы и переносить закрытые пункты в раздел «Готово».

## Стек и команды

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, Postgres 16, `websockets>=13`. Точка входа `backend/app/main.py`.
- **LLM/Voice**: OpenAI — `gpt-4o-realtime-preview` для голосового канала (audio in/out, server-VAD, barge-in), `gpt-4o-mini` для evaluation и финального вердикта, `whisper-1` встроен в Realtime для транскрипции. Старые `whisper-1`/`tts-1` остались только в legacy-режиме (text-сессии и fallback). Клиенты в `backend/app/llm/` (`realtime.py`, `evaluate.py`, `voice.py`).
- **Frontend**: React 18 + Vite + TS + Tailwind + Monaco. Точка входа `frontend/src/main.tsx`. Микрофон через `AudioWorkletNode` (PCM16 24 kHz) — `frontend/src/features/voice/pcmWorklet.js`.
- **Запуск всего**: `docker compose up --build` (предварительно `cp .env.example .env` и подставить `OPENAI_API_KEY` с доступом к Realtime API).
- **Локальный dev** (только БД в Docker): `docker compose up -d db`, затем `uvicorn app.main:app --reload` в `backend/` и `npm run dev` в `frontend/`.
- **Миграции**: `alembic upgrade head` (выполняется автоматически в backend-контейнере при старте). Текущая HEAD — `0010_summary_final_verdict`.
- **Feature flag**: `VOICE_REALTIME_ENABLED=False` в `.env` возвращает старый пайплайн (Whisper-batch + TTS-batch + manual push-to-talk). По умолчанию `True`.

## Иерархия данных

```
User ──┬─→ Requirements (Проект)
       │       ├─→ QuestionBank (банк «тема × уровень»)
       │       └─→ Assignment ──→ InterviewSession (1:n) ──→ SessionSummary
       │                          └─→ SessionQuestion[] (voice + coding)
       │                          └─→ LLMUsage (расход)
```

**Критическое:** связь `Assignment.sessions` — 1-ко-многим (после миграции на тренажёрный режим). Каждое прохождение = новая `InterviewSession`. Менять обратно на 1-к-1 нельзя — сломает повторные попытки. На фронте `AssignmentDetailOut.sessions: list[]` отдаёт все попытки в порядке `created_at` ASC; срез последней доступен как `last_session_id` / `session` (back-compat alias).

## Архитектурные ориентиры

Сценарий MVP проходит через четыре связанных слоя — менять один без понимания соседей опасно:

1. **Загрузка → банк вопросов** (`POST /api/requirements`). Один LLM-вызов в `llm/extract.py` возвращает `summary + topics + банк вопросов на матрицу тема × уровень` (схема в `llm/prompt_schemas.py: EXTRACT_JSON_SCHEMA`). Темы и вопросы пишутся в `requirements.topics` (jsonb) и таблицу `question_bank`.
2. **Создание / редактирование назначения** (`POST/PATCH/DELETE /api/admin/assignments[/{id}]`). Админ выбирает user_id, проект, темы, уровень, режим, голос, модель LLM. PATCH доступен в любой момент (даже с попытками); правки применяются к **следующим** новым попыткам — старые `InterviewSession` хранят свою копию параметров. DELETE — только пока сессий нет.
3. **Старт сессии** (`POST /api/me/assignments/{id}/start`). Если есть незавершённая попытка (`draft`/`active`) — возвращается она. Иначе — создаётся новая `InterviewSession`, отбираются 10 голосовых вопросов с равномерным распределением + 3 кодинг-задачи (`llm/generate.py`). Всё материализуется в `session_questions` (`type=voice|coding`).
4. **Интервью**:
   - **Голос (Realtime, по умолчанию)** — WebSocket `/ws/interview/{session_id}?ticket=...` диспатчится в `_run_realtime` (`routers/interview_ws.py`). Бэкенд — двунаправленный мост между фронтом и `wss://api.openai.com/v1/realtime` (`llm/realtime.py: RealtimeBridge`). Клиент шлёт `hello / audio (PCM16 b64) / interrupt / finish`. Сервер форвардит `question (meta) / tts_chunk / tts_done / vad / partial_transcript / speech_completed / transcript / evaluation / time_warning / done / error`. Server-VAD сам коммитит реплику кандидата → модель вызывает tool **`submit_answer`** с `{question_id, transcript}` → сервер запускает `evaluate_voice_answer` (gpt-4o-mini) через `asyncio.to_thread` параллельно с тем, как Realtime уже зачитывает следующий вопрос.
   - **Голос (legacy / text)** — `_run_legacy` в том же файле. Используется для текстовых сессий (`session.mode == "text"`) и при `VOICE_REALTIME_ENABLED=False`.
   - **Кодинг** — REST `POST /api/sessions/{id}/coding/review/{item_id}` (`llm/evaluate.py: review_code`). Голос и кодинг работают параллельно на одной странице (`pages/Interview.tsx` со split-screen).
5. **Завершение** (`POST /api/sessions/{id}/finish`) собирает `session_summary` (агрегаты counters + overall + **final_verdict** + **final_recommendation**) через `llm/evaluate.py: make_overall_summary` (возвращает dataclass `OverallSummary`). Переводит сессию в `finished`. Отчёт читается **сразу** через `GET /api/sessions/{id}/report` — публикации админом нет.

`total_cost_usd` суммирует все `LLMUsage`-записи: `kind="realtime"` (per-response audio/text токены, см. `cost_tracker.record_realtime_usage`) + `kind="voice_eval"` (gpt-4o-mini) + `extract`/`generate`/`summary`/`code_review` + старые `stt`/`tts` для legacy.

Промпты разнесены: текстовые системные промпты — в `backend/app/llm/prompt_templates/*.md` (правятся как обычные документы), JSON-схемы и tool-описания (включая `SUBMIT_ANSWER_TOOL`) — в `backend/app/llm/prompt_schemas.py`. Публичный API — `backend/app/llm/prompts.py`: тонкий fasade, который читает `.md` и переэкспортирует схемы. Менять схемы и парсеры в `extract.py / generate.py / evaluate.py` нужно синхронно.

## Ключевые миграции

- `0001_initial` — базовые таблицы.
- `0007_roles_assignments` — роли admin/user, таблица `assignments`. Первый user получает admin автоматически.
- `0009_assignment_voice_model` — per-assignment поля `voice` и `llm_model` (копируются в `InterviewSession` при старте).
- `0010_summary_final_verdict` — `final_verdict: String(32)` и `final_recommendation: Text` в `session_summary` для итогового вердикта LLM.

## Конвенции, не очевидные из кода

- Темы из `requirements.topics` хранятся как `[{name, description}]`; в `question_bank.topic` идёт строка-имя — связь по имени, не по id. Если ИИ неконсистентно назовёт темы между этапами — банк не наполнится.
- WS использует короткоживущий ws-ticket из query-параметра `?ticket=...` (браузерный WebSocket не поддерживает кастомные заголовки). Fallback на `?token=...` оставлен. Аутентификация — `auth.decode_ws_ticket` / `auth.decode_token`.
- На фронте JWT лежит в `localStorage["kickoff.token"]`, axios interceptor добавляет его в `Authorization`. При 401 интерцептор чистит токен.
- Голосовая страница построена на хуке `useVoiceSession(sessionId, { mode })`. В `mode="voice"` микрофон стримит PCM16 24 kHz через `AudioWorkletNode` (`pcmWorklet.js`), TTS-чанки от Realtime склеиваются в очередь `AudioBufferSourceNode` встык. В `mode="text"` — legacy-протокол, MediaRecorder/textarea. Хук возвращает обогащённый state: `partialTranscript`, `micLevel`, `vadState`, метод `interrupt()`.
- В Realtime `transcript` (запись в лог) приходит ТОЛЬКО на `submit_answer`, не на каждое `input_audio_transcription.completed`. Уточняющие вопросы кандидата к модели и реплики-маркеры в лог не попадают — модель сама решает, что считать ответом, и кладёт его в `submit_answer.transcript` (промпт жёстко требует «только речь кандидата, без своих подсказок»).
- Голоса: список Realtime API ≠ TTS-1. Доступны `alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar` (см. `schemas.ALLOWED_VOICES` и `realtime.REALTIME_VOICES`). Если в БД остался старый `onyx`/`fable`/`nova` — `realtime.resolve_realtime_voice` упадёт на дефолтный `alloy`.
- Лимит размера склейки `.md` — 200_000 символов (см. `routers/requirements.py`); при превышении 413.
- `AssignmentStatus.published` остаётся в Python-enum для legacy-записей, но новые переходы туда удалены (механика публикации администратором удалена). `InterviewSession.published_at` — deprecated, всегда `None` для новых записей; колонка осталась без миграции.
- `Report.tsx` под админом делает редирект на `/admin/sessions/:id` (симметрично `UserOnlyInterview`) — у админа единая точка для отчётов в админ-витрине.
- Глобальный exception-handler в `app/main.py` для `OpenAIError` → 502 с русским detail из `format_openai_error` (`app/llm/client.py`). Покрывает 403 региона, 401 ключа, 429 rate-limit, сетевые ошибки. Для Realtime WS — преобразуется в `{type:"error", code:"openai_unavailable"}`.
- Self-protection в `/admin/users`: бэк блокирует снятие admin-роли с себя, деактивацию и удаление себя (через 400). Фронт зеркалит ограничения — для self кнопка delete скрыта, поля role / is_active в форме редактирования `disabled`.
- Кнопки «Назначить» в дашборде, на карточке проекта и на детальной странице проекта ведут на `/admin/assignments?new=1[&requirements_id=N]`. `AdminAssignments.tsx` ловит query, разворачивает форму и предзаполняет проект, после чего чистит URL.
- **Голосовая конкурентность (демо ≤10 сессий)**: пул БД явно `pool_size=20, max_overflow=10` (`db.py`); `expire_on_commit=False` оставлен из-за shared `db: Session` между корутинами `client_to_bridge` / `bridge_to_client`. Evaluate-поток (`asyncio.to_thread(_run_evaluation_sync, ...)`) **не делит** эту `Session` — открывает свою `SessionLocal()` и закрывает в `finally`. После успешного evaluate в основном loop делаем `db.expire(shared_item)`, чтобы `_next_unanswered(sess)` увидел свежий `verdict`. Параллелизм evaluate ограничен `_EVAL_SEMAPHORE = asyncio.Semaphore(8)` (защита от burst-rate-limit OpenAI). Тонкая обёртка `_run_realtime` инкрементит/декрементит модульный `_active_realtime_sessions` и логирует пик; вся бизнес-логика — в `_run_realtime_impl`. Для прода (>30 сессий) понадобится multi-worker uvicorn + sticky routing + Redis для in-memory state — намеренно отложено.

## Что важно при правках

- Любое изменение моделей в `app/models.py` требует новой Alembic-миграции в `backend/alembic/versions/`. HEAD сейчас — `0010`.
- При добавлении новой LLM-задачи: добавить системный промпт в `prompt_templates/*.md`, JSON-схему в `prompt_schemas.py`, отдельный модуль в `llm/`, использовать `response_format={"type": "json_schema", ...}` для строгой валидации.
- Realtime: при изменении set-of-events читай оба обработчика — `_run_realtime_impl` в `routers/interview_ws.py` (тело; `_run_realtime` — тонкая обёртка для счётчика активных сессий) и `useVoiceSession.ts` (`ws.onmessage`). Любая новая фишка диалога — это либо новый event-type, либо новый tool. Pricing для Realtime — в `cost_tracker.REALTIME_PRICING_PER_M_TOKENS` (text/audio in/out, кеш ×0.5); записывается на каждый `response.done` через `record_realtime_usage`.
- При работе с БД из evaluate-потока — **открывай свою `SessionLocal()`** (как в текущем `_run_evaluation_sync`), не пиши в shared `db` из event-loop. После коммита из потока — `db.expire(item)` на shared db, иначе `_next_unanswered(sess)` вернёт stale `verdict`. Не убирай и не урезай `_EVAL_SEMAPHORE` без замены — он закрывает burst-rate-limit OpenAI на пиках демо.
- При добавлении нового атрибута в `AssignmentSessionInfo` (срез сессии для списков попыток) — обнови оба сборщика: `_session_info` в `routers/me.py` и `_session_info_admin` в `routers/admin.py`. Они отличаются только тем, что админский тянет `total_cost_usd` из `cost_by_session`-агрегата.
- Stylistically: на фронте используем Tailwind utility-классы напрямую без UI-библиотеки. Monaco грузим только на странице интервью. Кнопки/иконки/цвета — через CSS-переменные (`--accent`, `--ink-*`, `--bg-*`); набор иконок ограничен `IconName` в `components/Icon.tsx` (для шевронов используем unicode `▾`/`▴`).
- При смене статуса/UX-флоу страницы — синхронно обнови `frontend/src/pages/Docs.tsx` (общий и технический разделы), `README.md` и этот файл.
