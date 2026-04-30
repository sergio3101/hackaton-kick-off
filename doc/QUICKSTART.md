# Quickstart — запуск проекта

Пошаговая инструкция «с нуля до первого голосового интервью» за ~5 минут.

## TL;DR

```bash
cp .env.example .env
# отредактировать .env: OPENAI_API_KEY=sk-...
docker compose up --build
```

Открыть `http://localhost:5173` → зарегистрировать первого пользователя (он автоматически станет админом).

---

## Требования

- **Docker Desktop** с Docker Compose v2 (Windows / macOS / Linux).
- **Ключ OpenAI** с доступом к Realtime API. Если у ключа нет Realtime — раздел [Realtime API недоступен](#realtime-api-недоступен-у-ключа) ниже.
- Свободные порты на хосте: `5173` (фронт), `8000` (бэк, Swagger UI), `5432` (Postgres).

---

## Запуск через Docker Compose (рекомендуемо)

1. **Подготовить окружение:**
   ```bash
   cp .env.example .env
   ```
   Открыть `.env` и поставить ваш ключ:
   ```ini
   OPENAI_API_KEY=sk-...
   ```
   Остальные переменные имеют рабочие дефолты — менять не нужно.

2. **Поднять стек:**
   ```bash
   docker compose up --build
   ```
   Первый запуск с `--build` (соберёт образы), последующие — просто `docker compose up`.

   При старте backend автоматически прогоняет миграции (`alembic upgrade head`); вручную ничего запускать не нужно.

3. **Проверить:**
   - Backend: <http://localhost:8000/docs> (Swagger UI).
   - Frontend: <http://localhost:5173>.

4. **Остановить:**
   ```bash
   docker compose down       # сохранить данные БД (volume `db_data`)
   docker compose down -v    # удалить и БД тоже (полный сброс)
   ```

---

## Первый вход и проверка флоу

1. Открыть <http://localhost:5173> и зарегистрироваться. **Первый зарегистрированный пользователь автоматически получает роль `admin`** — все последующие создаются как обычные `user`.

2. Под админом загрузить пример ТЗ:
   - Перейти на `/projects` → «Загрузить новый».
   - Вставить содержимое одного из примеров: `doc/example-requirements.md`, `doc/example-requirements-fleetops.md` или `doc/example-requirements-mediconnect.md`.
   - LLM сделает summary, извлечёт темы и сгенерирует банк вопросов (≤30 сек).

3. Создать второго пользователя на `/admin/users` — обычный `user`.

4. Создать назначение на `/admin/assignments`:
   - Выбрать второго пользователя, проект из шага 2, темы, уровень.
   - Режим — **voice**, голос из списка Realtime (`alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`).

5. Залогиниться вторым пользователем (другой браузер или окно инкогнито) → «Мои кикоффы» → **«Старт интервью»**. Должны загореться индикаторы микрофона и пойти первая голосовая реплика модели.

---

## Локальный dev (без Docker для backend/frontend)

Для hot-reload фронта и удобной отладки бэка — Postgres в Docker, остальное нативно.

```bash
# 1. Только Postgres в Docker
docker compose up -d db

# 2. Backend (в отдельном терминале)
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e .
export $(cat ../.env | xargs)      # подгрузить переменные из .env
export POSTGRES_HOST=localhost     # переопределить host (в Docker это `db`)
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend (ещё один терминал)
cd frontend
npm install
npm run dev
```

> **Важно:** контейнер `frontend` в `docker-compose.yml` — это production-build через Nginx (без hot-reload). Для разработки фронта всегда используйте локальный `npm run dev`.

> Backend в Docker уже запускается с `--reload` и bind-mount'ом `./backend:/app`, так что hot-reload Python-кода работает в обоих сценариях. Менять `pyproject.toml` — нужен `docker compose up --build backend`.

---

## Переменные окружения (минимум)

Полный список с дефолтами — в `.env.example` и [README.md](../README.md#переменные-окружения-см-envexample). Здесь только ключевые:

| Переменная | Обязательна | Назначение |
|---|---|---|
| `OPENAI_API_KEY` | **да** | Ключ OpenAI с доступом к Realtime API |
| `OPENAI_REALTIME_MODEL` | нет | По умолчанию `gpt-4o-realtime-preview-2024-12-17` |
| `OPENAI_TTS_VOICE` | нет | Голос интервьюера (см. список выше); по умолчанию `alloy` |
| `VOICE_REALTIME_ENABLED` | нет | `True` (по умолчанию) — Realtime API; `False` — старый Whisper/TTS-1 fallback |
| `JWT_SECRET` | нет | Подпись JWT; обязательно сменить на проде |
| `BACKEND_CORS_ORIGINS` | нет | Допустимые origin'ы фронта |
| `VITE_API_BASE_URL` | нет | URL бэка для фронта (**build-time** — после правки нужен `docker compose up --build frontend`) |

---

## Типичные проблемы

### Порты заняты

```bash
docker compose down
# проверить, кто держит порт
lsof -i :8000          # macOS / Linux
netstat -ano | findstr :8000   # Windows
```

### OpenAI 403 `unsupported_country_region_territory`

Регион не поддерживается. Решения:
- Поднять VPN.
- Использовать прокси: добавить в `.env` строку `OPENAI_BASE_URL=https://your-proxy/v1`.

### OpenAI 401

Ключ невалидный или отозван. Обновить `OPENAI_API_KEY` в `.env` и перезапустить backend:
```bash
docker compose restart backend
```

### Realtime API недоступен у ключа

В `.env` выставить:
```ini
VOICE_REALTIME_ENABLED=False
```
Бэк уйдёт на legacy-пайплайн (Whisper-1 + TTS-1, push-to-talk), голосовые сессии останутся работоспособными, но без VAD/barge-in. Перезапустить backend.

### Backend падает на миграции

```bash
docker compose logs backend
```
Если БД в неконсистентном состоянии и данные не нужны — полный сброс:
```bash
docker compose down -v
docker compose up --build
```
**Внимание:** `-v` удаляет volume `db_data` со всеми пользователями, проектами и сессиями.

### Фронт не видит API (CORS / 404)

- Проверить `VITE_API_BASE_URL` в `.env`. Это **build-time** переменная — после правки нужен `docker compose up --build frontend`.
- Проверить `BACKEND_CORS_ORIGINS` — должен содержать origin фронта (`http://localhost:5173` для Docker-варианта).

---

## Полезные команды

```bash
docker compose logs -f backend         # хвост логов backend
docker compose logs -f                 # все сервисы сразу
docker compose restart backend         # перезапустить только backend
docker compose exec db psql -U kickoff # SQL-консоль в БД
docker compose ps                      # статус сервисов
```

---

## Что дальше

- Архитектура и сценарии — [README.md](../README.md).
- Технические нюансы (модели, миграции, конвенции) — [CLAUDE.md](../CLAUDE.md) в корне.
- Бэклог багов и улучшений — [improvements.md](improvements.md).
- Исходное ТЗ — [ТЗ Сервис подготовки специалистов к кик-оффам.md](ТЗ%20Сервис%20подготовки%20специалистов%20к%20кик-оффам.md).
