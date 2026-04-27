# Kick-off Prep — тренажёр интервью

Веб-сервис, который по описанию проекта (Markdown-артефактам) проводит
тренировочное голосовое интервью и лайв-кодинг, оценивает ответы по смыслу
и в конце выдаёт итоговый вердикт готовности (Готов / Почти готов / Нужна
практика / Не готов) с рекомендацией. Сделан под хакатон по ТЗ из
`doc/ТЗ Сервис подготовки специалистов к кик-оффам.md`.

Это тренажёр, не одноразовый экзамен: одно и то же назначение можно
перепроходить сколько угодно раз и отслеживать прогресс по дельте между
попытками.

## Стек

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2 + Alembic, PostgreSQL 16, JWT, `websockets>=13`.
- **LLM/Voice**: OpenAI Realtime API (`gpt-4o-realtime-preview`) для голосового канала с server-VAD, потоковым TTS и barge-in; `gpt-4o-mini` для оценки ответов и финального вердикта; `whisper-1` встроен в Realtime для транскрипции.
- **Frontend**: React 18 + Vite + TypeScript, Tailwind, Monaco Editor, TanStack Query, React Router. Микрофон через `AudioWorklet` (PCM16 24 kHz).
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

## Иерархия данных

```
User ──┬─→ Requirements (Проект)
       │       ├─→ QuestionBank (банк вопросов «тема × уровень»)
       │       └─→ Assignment ──→ InterviewSession (1:n) ──→ SessionSummary
       │                          └─→ SessionQuestion[] (voice + coding)
       │                          └─→ LLMUsage (расход)
```

Связь `Assignment → InterviewSession` — 1-ко-многим: каждое прохождение
кикоффа создаёт новую сессию, старые остаются в истории.

## Сценарий использования

### Админ
1. Зарегистрироваться (первый юзер автоматически получает роль `admin`).
2. **Загрузить .md артефакты** проекта или вставить текст напрямую → LLM сделает summary, извлечёт темы и сгенерирует банк вопросов.
3. Создать пользователей (`/admin/users`) и назначения (`/admin/assignments`): выбрать пользователя, проект, темы, уровень, режим (голос/текст), голос интервьюера, LLM-модель.
4. **Редактировать назначение** можно в любой момент — изменения применятся к следующим попыткам (старые сессии хранят свою копию параметров).
5. **Удалить назначение** можно только пока по нему не было ни одной попытки.
6. На дашборде смотреть KPI команды, аналитику (Score по темам, Слабые места, Активность за 30 дней), список последних назначений и отчётов.

### Пользователь
1. Войти → открыть «Мои кикоффы» → нажать **«Старт интервью»**.
2. На странице интервью — split-screen:
   - **слева** голосовое Q&A в Realtime-режиме: ИИ-наставник задаёт вопрос голосом потоково, кандидат отвечает естественно (server-VAD сам ловит конец реплики, можно перебивать TTS — barge-in), на экране растёт живой транскрипт + индикатор уровня микрофона. Если кандидат застрял — модель даёт наводящие подсказки без раскрытия ответа.
   - **справа** Monaco-редактор с задачей по лайв-кодингу. По кнопке «Запустить» решение выполняется в песочнице, по «Отправить решение» — получаем LLM-ревью.
3. По завершении (кнопкой или после всех вопросов) сразу формируется отчёт с **финальным вердиктом** (Готов / Почти / Нужна практика / Не готов), рекомендацией от LLM и подробной разбивкой по каждому вопросу.
4. На карточке кикоффа в «Моих кикоффах» можно раскрыть **список всех попыток**: дата, длительность, breakdown ответов (✓ верно / ~ частично / ✗ неверно / − пропущено), вердикт, score + дельта vs предыдущая попытка, бейдж ★ у лучшей попытки.
5. **Повторное прохождение**: «Старт интервью» создаёт новую сессию (если предыдущая завершена); старые остаются в истории. Кнопка одна и та же для первого и любого последующего прохождения.
6. Раздел **«Статистика»** (`/me/stats`) показывает личный прогресс: попыток завершено, лучший / средний score, время в тренажёре, распределение вердиктов, история последних 10 попыток.

## Структура

```
HACKATON/
├── backend/
│   ├── app/
│   │   ├── main.py             FastAPI + CORS + OpenAIError handler
│   │   ├── config.py           pydantic-settings (env)
│   │   ├── db.py               SQLAlchemy engine + Base
│   │   ├── models.py           ORM модели
│   │   ├── schemas.py          Pydantic схемы
│   │   ├── auth.py             JWT + bcrypt + dependency
│   │   ├── routers/
│   │   │   ├── auth.py         register / login / me
│   │   │   ├── requirements.py upload .md + LLM extract
│   │   │   ├── sessions.py     create / get / finish / coding-review
│   │   │   ├── interview_ws.py WebSocket голосового интервью (Realtime + legacy)
│   │   │   ├── analytics.py    /api/analytics/overview
│   │   │   ├── admin.py        users CRUD, assignments CRUD (POST/PATCH/DELETE)
│   │   │   └── me.py           /api/me/assignments + /start
│   │   ├── reports/pdf.py      рендеринг PDF (WeasyPrint)
│   │   └── llm/
│   │       ├── client.py       OpenAI клиент + format_openai_error
│   │       ├── prompts.py      публичный API промптов
│   │       ├── prompt_schemas.py JSON-схемы + SUBMIT_ANSWER_TOOL
│   │       ├── prompt_templates/ *.md — системные промпты
│   │       ├── extract.py      summary + topics + банк вопросов
│   │       ├── generate.py     генерация кодинг-задач
│   │       ├── evaluate.py     оценка ответа / ревью кода / OverallSummary
│   │       ├── realtime.py     RealtimeBridge → wss://api.openai.com/v1/realtime
│   │       ├── cost_tracker.py учёт стоимости (chat/tts/stt/realtime)
│   │       └── voice.py        Whisper STT + TTS (legacy + transcribe для text-mode)
│   └── alembic/                миграции (0001..0010)
└── frontend/
    └── src/
        ├── api/                axios клиент + типы (FinalVerdict + helpers)
        ├── auth/               AuthProvider + JWT
        ├── components/Layout
        ├── pages/
        │   ├── Dashboard.tsx          admin: KPI + аналитика + назначения + отчёты
        │   ├── Projects.tsx           admin: список проектов
        │   ├── Upload.tsx             admin: загрузка ТЗ
        │   ├── RequirementsDetail.tsx admin: проект + темы + банк
        │   ├── AdminUsers.tsx         admin: пользователи (CRUD)
        │   ├── AdminAssignments.tsx   admin: назначения (CRUD + раскрытие сессий)
        │   ├── AdminSessionReview.tsx admin: отчёт сессии
        │   ├── MyAssignments.tsx      user: «Мои кикоффы» + раскрытие попыток
        │   ├── MyStats.tsx            user: «Статистика»
        │   ├── Interview.tsx          split-screen: голос + кодинг
        │   ├── Report.tsx             отчёт сессии (admin → редирект на admin-вид)
        │   └── Docs.tsx               документация
        └── features/
            ├── voice/                 useVoiceSession (realtime + legacy)
            └── coding/                CodingEditor + CodingResults + PasteBadge
```

## Переменные окружения (см. `.env.example`)

| Переменная | Назначение |
|---|---|
| `OPENAI_API_KEY` | Обязательно. Ключ OpenAI с доступом к Realtime API |
| `OPENAI_CHAT_MODEL` | По умолчанию `gpt-4o-mini` (используется для evaluate/extract/summary/code review) |
| `OPENAI_REALTIME_MODEL` | По умолчанию `gpt-4o-realtime-preview-2024-12-17` |
| `OPENAI_TTS_VOICE` | Дефолтный голос; список валидных — Realtime API: `alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar` |
| `OPENAI_BASE_URL` | Опционально. URL прокси/реверс-прокси для OpenAI (помогает при региональной блокировке) |
| `VOICE_REALTIME_ENABLED` | По умолчанию `True`. `False` → старый push-to-talk пайплайн (Whisper-1 + TTS-1) |
| `POSTGRES_*` | Креды БД |
| `JWT_SECRET` | Подпись JWT (заменить на проде) |
| `BACKEND_CORS_ORIGINS` | Разрешённые источники для фронта |
| `VITE_API_BASE_URL` | URL бэкенда для фронта (build-time) |

`OPENAI_STT_MODEL` (`whisper-1`), `OPENAI_TTS_MODEL` (`tts-1`), `JWT_ALGORITHM` (`HS256`), `JWT_EXPIRE_MINUTES` (`1440`) имеют разумные дефолты в `app/config.py` — задавайте только если нужно переопределить.

## Администрирование

Под ролью `admin` доступны:

- **`/` (Dashboard)** — KPI команды (сессий завершено, средний score, ответов суммарно, активных сейчас), активная сессия в эфире, аналитика (Score по темам, Слабые места, Активность за 30 дней), последние назначения и отчёты, список проектов.
- **`/projects` — Проекты.** Список загруженных ТЗ. На карточке кнопка «Назначить» сразу открывает форму назначения с предвыбранным проектом.
- **`/admin/users` — Пользователи.** Создание, редактирование (форма-аккордеон с email/ФИО/паролем/ролью/активностью), удаление. Bекенд блокирует попытку снять с себя роль admin, деактивировать или удалить самого себя; UI зеркалит эти ограничения (для self кнопки скрыты/disabled).
- **`/admin/assignments` — Назначения.** Создание, редактирование (PATCH) и удаление (только пустых) назначений. Клик по строке раскрывает список всех попыток с длительностью, breakdown, вердиктом, score + дельтой и стоимостью. Параметры `?new=1` и `?requirements_id=N` в URL автоматически открывают форму с предвыбранным проектом — используется в кнопках «Назначить» с дашборда, страницы проектов и страницы деталей проекта.
- **`/admin/sessions/:id` — Отчёт по любой сессии.** Финальный вердикт, рекомендация, KPI, табы «Голос»/«Кодинг»/«Резюме», PDF-выгрузка.

Самый первый admin назначается миграцией `0007_roles_assignments.py`: первый пользователь по `id ASC` автоматически получает `role='admin'`. Дальше остальные роли раздаёт уже он сам через `/admin/users`.

## Обработка ошибок OpenAI

Глобальный exception-handler в `app/main.py` ловит любую `OpenAIError` и
возвращает HTTP 502 с человеко-читаемым русским detail (см.
`app/llm/client.py: format_openai_error`):

- `403 unsupported_country_region_territory` → подсказка про VPN или `OPENAI_BASE_URL`.
- `401` → подсказка обновить `OPENAI_API_KEY`.
- `429` → rate-limit, попробовать через минуту.
- `APIConnectionError` / `APITimeoutError` → проверить сеть и `OPENAI_BASE_URL`.

Для голосового интервью (WebSocket) ошибка преобразуется в WS-сообщение
`{type: "error", code: "openai_unavailable", message: "..."}` и фронт
показывает её плашкой на странице интервью.

## Известные ограничения MVP

- Загрузка только `.md` (PDF/DOCX не поддерживаются).
- Лайв-кодинг — только LLM-ревью + sandbox-запуск (без юнит-тестов).
- Стоимость Realtime ощутима: ориентир ~$0.06–0.30 за минуту в зависимости от соотношения говорения модели и кандидата (см. таблицу тарифов в `cost_tracker.REALTIME_PRICING_PER_M_TOKENS`). На демо ок, для прода — закрыть feature flag и подключить ограничение по часам.
- Если ключ не имеет доступа к Realtime API — отключить `VOICE_REALTIME_ENABLED` в `.env`, бэкенд автоматически уйдёт на старый Whisper/TTS-1 пайплайн.
- **Конкурентность голосовых сессий рассчитана на демо (5–10 одновременно)**: один uvicorn-worker, in-memory state per WS, пул БД 20+10, `_EVAL_SEMAPHORE=8`, evaluate-поток на собственной `SessionLocal()`. Для нагрузки 30+ потребуется multi-worker uvicorn + sticky routing для WS + Redis для распределённого состояния — вне объёма MVP. Отдельно проверьте лимит concurrent realtime sessions у вашего OpenAI-ключа.
