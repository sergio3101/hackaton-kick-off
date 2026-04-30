# Функциональные тесты — ручной прогон

Чек-лист для регресс-прогона перед демо/мерджом. LLM не вызываем (жёсткий бан). Тестируем на текущей demo-БД с откатом через snapshot.

Артефакты: `qa/screenshots/<case>.png`, `qa/snapshots/pre-*.dump`. Папка `qa/` — в `.gitignore`.

Учётки:
- `user@mail.ru` / `UseR_3101` (admin)
- `user1@mail.ru` / `User1_3101` (user)

Хосты: фронт `http://localhost:5173`, бэк `http://localhost:8000`, БД `localhost:5432`.

Статус кейса: `[ ]` не пройден, `[x]` ок, `[!]` найден баг (с описанием), `[-]` пропущен.

---

## 0. Подготовка окружения

- [ ] **0.1** `docker compose ps` — все три сервиса (`db`, `backend`, `frontend`) `Up` и `healthy`.
- [ ] **0.2** Smoke `curl -sf http://localhost:8000/health` → 200.
- [ ] **0.3** Получить admin-токен в переменную (для curl-блоков):
  ```bash
  ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"user@mail.ru","password":"UseR_3101"}' | jq -r .access_token)
  USER_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"user1@mail.ru","password":"User1_3101"}' | jq -r .access_token)
  echo "admin=${#ADMIN_TOKEN} user=${#USER_TOKEN}"   # длины должны быть > 50
  ```

## 0.5. Преамбула: snapshot БД

- [ ] **0.5.1** Снять дамп:
  ```bash
  docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
    > qa/snapshots/pre-$(date +%Y%m%d-%H%M%S).dump
  ls -lh qa/snapshots/   # размер > 0
  ```
- [ ] **0.5.2** Зафиксировать имя последнего дампа в переменную: `SNAP=$(ls -t qa/snapshots/pre-*.dump | head -1)`.

---

## Группа A. Auth + JWT

### A-1. Логин валидными кредами
**Шаги:** Playwright: `/login` → ввести `user1@mail.ru` / `User1_3101` → клик «Войти». Параллельно проверить ту же связку curl'ом.
**Ожидание:** UI редирект `/me/assignments`; `localStorage.kickoff.token` непустой; `POST /api/auth/login` 200, тело содержит `access_token` (JWT — 3 части через точку).
**Откат:** не требуется.

### A-2. Логин с неверным паролем
**Шаги:** `curl -X POST .../api/auth/login -d '{"email":"user1@mail.ru","password":"wrong"}'`.
**Ожидание:** 401, тело без следов реального хеша/пользователя.

### A-3. Логин несуществующим email
**Шаги:** тот же curl с `email=nope@x.y`.
**Ожидание:** 401, текст ошибки идентичен A-2 (без user enumeration).

### A-4. Пустые поля в форме
**Шаги:** UI: `/login`, кликнуть «Войти» с пустыми полями.
**Ожидание:** запроса нет (HTML `required` блокирует), либо сетевая ошибка отсутствует — фиксируем `Network` пустой.

### A-5. Регистрация существующим email
**Шаги:** `curl -X POST .../api/auth/register -d '{"email":"user1@mail.ru","password":"any","full_name":"x"}'`.
**Ожидание:** 409.
**Откат:** не требуется (запись не создаётся).

### A-6. Слишком короткий пароль
**Шаги:** `curl ... -d '{"email":"tmp@test.local","password":"123","full_name":"x"}'`.
**Ожидание:** 422 (Pydantic length>=6).
**Откат:** если 201 — `DELETE FROM users WHERE email='tmp@test.local'`.

### A-7. /me без/с токеном
**Шаги:** `curl .../api/auth/me` без header → 401. С `Authorization: Bearer $USER_TOKEN` → 200.
**Ожидание:** 200-ответ содержит `email`, `role`, `is_active=true`.

### A-8. Истёкший JWT
**Шаги:** в DevTools `localStorage.setItem('kickoff.token', '<jwt с exp в прошлом>')`, перезагрузить любой защищённый экран.
**Ожидание:** axios 401 → interceptor чистит токен → редирект `/login`.

### A-9. JWT с несуществующим sub
**Шаги:** подменить `sub` в payload на 99999, пересчитать подпись (или использовать заведомо чужой), `curl .../api/auth/me` с этим токеном.
**Ожидание:** 401.

---

## Группа B. Ролевые гарды

### B-1. user → admin-страницы
**Шаги:** под user токеном открыть `/admin/users`, `/admin/assignments`, `/projects`, `/upload`, `/analytics`.
**Ожидание:** клиент-редирект на `/me/assignments`. Параллельно `curl -H "Authorization: Bearer $USER_TOKEN" .../api/admin/users` → 403.

### B-2. admin → /sessions/:id/interview
**Шаги:** под admin открыть `http://localhost:5173/sessions/8/interview`.
**Ожидание:** редирект `/admin/sessions/8` (UserOnlyInterview гард).

### B-3. /me/assignments без токена
**Шаги:** `curl .../api/me/assignments` без header.
**Ожидание:** 401.

### B-4. user читает чужую сессию
**Шаги:** `curl -H "Bearer $USER_TOKEN" .../api/sessions/4` (сессия #4 принадлежит другому или admin).
**Ожидание:** 404 (изоляция).

### B-5. user читает чужой report
**Шаги:** найти опубликованную сессию другого user'а в admin-списке; `curl -H "Bearer $USER_TOKEN" .../api/sessions/<id>/report`.
**Ожидание:** 403 или 404 — зафиксировать конкретный код в чек-листе.

### B-6. user удаляет admin-assignment
**Шаги:** `curl -X DELETE -H "Bearer $USER_TOKEN" .../api/admin/assignments/1`.
**Ожидание:** 403.

### B-7. Админ деактивирует себя
**Шаги:** определить self-id: `curl -H "Bearer $ADMIN_TOKEN" .../api/auth/me | jq .id`. Затем `curl -X PATCH -H "Bearer $ADMIN_TOKEN" .../api/admin/users/<self> -d '{"is_active":false}'`.
**Ожидание:** 400.

### B-8. Админ снимает с себя role=admin
**Шаги:** PATCH с `{"role":"user"}`.
**Ожидание:** 400.

### B-9. Админ удаляет себя
**Шаги:** `DELETE /api/admin/users/<self>`.
**Ожидание:** 400.

---

## Группа C. Requirements REST (без LLM)

### C-1. Видимость списка для user
**Шаги:** `curl -H "Bearer $USER_TOKEN" .../api/requirements` vs admin.
**Ожидание:** user видит только связанные с его сессиями/назначениями; admin видит все.

### C-2. user читает чужой ТЗ
**Шаги:** `curl -H "Bearer $USER_TOKEN" .../api/requirements/999`.
**Ожидание:** 404.

### C-3. POST без body
**Шаги:** `curl -X POST -H "Bearer $ADMIN_TOKEN" -F "questions_per_pair=5" .../api/requirements`.
**Ожидание:** 400 (нет ни `files`, ни `raw_text`). LLM не вызывается.

### C-4. Лимит 200_000 символов
**Шаги:** `python -c "print('a'*200001)" > big.txt; curl -X POST -H "Bearer $ADMIN_TOKEN" -F "raw_text=$(cat big.txt)" .../api/requirements`.
**Ожидание:** 413 (или 400 — зафиксировать). LLM не вызывается.
**Откат:** `rm big.txt`.

### C-5. POST под user
**Шаги:** `curl -X POST -H "Bearer $USER_TOKEN" -F "raw_text=hi" .../api/requirements`.
**Ожидание:** 403.

### C-6. PATCH title > 255
**Шаги:** `curl -X PATCH -H "Bearer $ADMIN_TOKEN" .../api/requirements/1 -d '{"title":"'"$(python -c 'print("x"*256)')"'"}'`.
**Ожидание:** 422.

### C-7. DELETE используемый ТЗ
**Шаги:** `curl -X DELETE -H "Bearer $ADMIN_TOKEN" .../api/requirements/1` (на ТЗ #1 ссылаются сессии #1–#8).
**Ожидание:** зафиксировать поведение — каскад (204) или 409. После теста: если удалилось, восстановить из snapshot.
**Откат:** `pg_restore --clean --if-exists -d ... < $SNAP` ОБЯЗАТЕЛЬНО, если 204.

### C-8. regenerate под user
**Шаги:** `curl -X POST -H "Bearer $USER_TOKEN" .../api/requirements/1/regenerate -d '{"selected_topics":["FastAPI"]}'`.
**Ожидание:** 403. LLM не вызывается.

### C-9. regenerate с пустым topics
**Шаги:** `curl -X POST -H "Bearer $ADMIN_TOKEN" .../api/requirements/1/regenerate -d '{"selected_topics":[]}'`.
**Ожидание:** 400. LLM не вызывается.

---

## Группа D. Sessions REST (без LLM)

Существующие сессии: #1, #2, #3 (finished+published), #4–#7 (finished), #8 (active, time-up).

### D-1. Видимость списка
**Шаги:** `curl -H "Bearer $USER_TOKEN" .../api/sessions` vs admin.
**Ожидание:** admin видит все 8, user1 — только свои + опубликованные.

### D-2. start чужой сессии
**Шаги:** `curl -X POST -H "Bearer $USER_TOKEN" .../api/sessions/<not_owned>/start`.
**Ожидание:** 404.

### D-3. start идемпотентен
**Шаги:** `curl -X POST .../api/sessions/8/start` под владельцем дважды.
**Ожидание:** оба 200, статус остаётся `active`.

### D-4. start finished
**Шаги:** на сессии #1 (finished).
**Ожидание:** 400.

### D-5. finish не владельца
**Шаги:** `curl -X POST -H "Bearer $USER_TOKEN" .../api/sessions/<admin_session>/finish`.
**Ожидание:** 404.

### D-6. report чужой неопубликованной
**Шаги:** найти finished+неопубликованную чужую (если есть); `curl ...report` под user.
**Ожидание:** 403.

### D-7. report чужой опубликованной
**Шаги:** под user1 запросить отчёт opublik сессии другого user'а.
**Ожидание:** зафиксировать (вероятно 403 — отчёт привязан к user'у).

### D-8. report.pdf
**Шаги:** `curl -H "Bearer $USER_TOKEN" -o /tmp/r.pdf .../api/sessions/1/report.pdf; file /tmp/r.pdf`.
**Ожидание:** Content-Type=application/pdf, размер >1KB, magic-байты `%PDF-`.

### D-9. cost_usd только админу
**Шаги:** сравнить `curl .../api/sessions/1` (user) vs `curl .../api/admin/sessions/1`.
**Ожидание:** в admin-ответе есть `cost_usd`, в user-ответе — нет.

---

## Группа E. WebSocket — handshake-only

Дёргаем через `browser_evaluate` или из bash через `python -m websockets`. ОТПРАВЛЯТЬ только `unknown_kind` или закрывать сразу.

### E-1. Невалидный токен
**Шаги:**
```js
const ws = new WebSocket('ws://localhost:8000/ws/interview/8?token=invalid');
ws.onclose = e => console.log('close', e.code, e.reason);
```
**Ожидание:** close с кодом 1008 (или 1006 при ранней ошибке).

### E-2. Без `?token=`
**Шаги:** WebSocket на тот же путь без query.
**Ожидание:** 1008.

### E-3. Чужая сессия
**Шаги:** под user1-токеном на сессию admin'а (#3).
**Ожидание:** 1008.

### E-4. Своя сессия — handshake
**Шаги:** под user1 на #8. Сразу `ws.close()` после `onopen`.
**Ожидание:** `onopen` сработал, БД не изменилась (`SELECT COUNT(*) FROM session_questions WHERE answered_at IS NOT NULL` — без изменений до/после).

### E-5. Мусорный фрейм
**Шаги:** после open: `ws.send(JSON.stringify({type:"unknown_kind"}))`.
**Ожидание:** либо игнор, либо `{"type":"error","recoverable":true,...}`. Зафиксировать.

### E-6. Резкий close
**Шаги:** open → close сразу.
**Ожидание:** сервер не падает, `docker compose logs backend --since 30s` без traceback'ов; повторное подключение возможно.

(`hello`, `answer`, `next`, `replay`, `skip`, `finish` — в скоп НЕ входят: каждый из них на сервере вызывает OpenAI.)

---

## Группа F. Coding sandbox — `/coding/run`

Используем сессию #8 (admin sessions/8 → coding-задачи). Найти `item_id` через `GET /api/sessions/8`.

### F-1. Простой happy
**Шаги:** UI «Лайв-кодинг #1», вставить `print(2+2)`, нажать «Запустить».
**Ожидание:** `exit_code=0`, `stdout="4\n"`, `timed_out=false`, `duration_ms < 500`.
**Откат:** код в БД не пишется (только run, не review).

### F-2. Падение
**Шаги:** код `raise SystemExit(1)`.
**Ожидание:** `exit_code=1`, в `stderr` упоминание SystemExit.

### F-3. TLE
**Шаги:** `while True: pass`.
**Ожидание:** `timed_out=true`, `duration_ms ≈ TIMEOUT` (см. `backend/app/sandbox/runner.py`), `exit_code != 0`.
**Скриншот:** `qa/screenshots/F-3.png`.

### F-4. Большой stdout
**Шаги:** `for i in range(10**6): print(i)`.
**Ожидание:** `truncated=true`, размер `stdout` ограничен.

### F-5. Неподдерживаемый язык
**Шаги:** `curl -X POST .../coding/run/<item> -d '{"lang":"cobol","code":"x"}'`.
**Ожидание:** 400.

### F-6. Пустой код
**Шаги:** body `{"lang":"python","code":""}`.
**Ожидание:** 400.

### F-7. Чужой item_id
**Шаги:** `curl .../api/sessions/8/coding/run/<item_из_другой_сессии>`.
**Ожидание:** 404.

### F-8. /coding/review негативы
**Шаги:** `curl -X POST .../api/sessions/8/coding/review/<bad_id>` без токена → 401; с токеном на чужой item → 404. **HAPPY НЕ ЗАПУСКАТЬ** (это LLM).

---

## Группа G. Admin — users / assignments / publish

### G-1. Создать temp user
**Шаги:**
```bash
curl -X POST -H "Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  .../api/admin/users \
  -d '{"email":"tmp@test.local","password":"TmpPass1!","full_name":"Temp","role":"user"}'
TMP_ID=$(curl -s -H "Bearer $ADMIN_TOKEN" .../api/admin/users | jq '.[]|select(.email=="tmp@test.local").id')
```
**Ожидание:** 201, `TMP_ID` непустой.
**Откат:** см. G-4 / постусловие.

### G-2. Дубль email
**Шаги:** повторить G-1.
**Ожидание:** 409.

### G-3. PATCH role
**Шаги:** `curl -X PATCH .../api/admin/users/$TMP_ID -d '{"role":"admin"}'`.
**Ожидание:** 200, проверить `GET .../$TMP_ID` → role=admin.

### G-4. DELETE temp
**Шаги:** `curl -X DELETE .../api/admin/users/$TMP_ID`.
**Ожидание:** 204; повторное GET → 404.

### G-5. assignment на несуществующего user
**Шаги:** `curl -X POST .../api/admin/assignments -d '{"user_id":99999,...}'`.
**Ожидание:** 404 (или 400 — зафиксировать).

### G-6. assignment с топиком вне bank
**Шаги:** body с `topics:["NotExisting"]` и валидным user_id+req_id.
**Ожидание:** 400.

### G-7. DELETE assignment в started/completed
**Шаги:** найти assignment в статусе `started` (например #1 → сессия #8 active).
**Ожидание:** `curl -X DELETE .../api/admin/assignments/<id>` → 400.

### G-8. publish active
**Шаги:** `curl -X POST .../api/admin/sessions/8/publish` (#8 active).
**Ожидание:** 400 (must be finished).

### G-9. publish + status assignment
**Шаги:** найти finished+неопубликованную; `POST .../publish`. После — `GET .../api/admin/assignments` и проверить связку.
**Ожидание:** 200, `Assignment.status=published`.
**Откат:** см. G-10.

### G-10. unpublish — откат assignment.status
**Шаги:** `DELETE .../api/admin/sessions/<id>/publish`.
**Ожидание:** 200, assignment.status вернулся к `completed`.

### G-11. publish/unpublish/publish цикл
**Шаги:** дважды повторить G-9 + G-10 + G-9.
**Ожидание:** state детерминирован, нет дубликатов в session_summary, `published_at` обновляется.
**Откат:** оставить в опубликованном состоянии (как в snapshot) или unpublish.

---

## Группа H. Analytics + Reports

### H-1. /analytics под user
**Шаги:** `curl -H "Bearer $USER_TOKEN" .../api/analytics/overview`.
**Ожидание:** 403.

### H-2. /analytics под admin
**Шаги:** `curl -H "Bearer $ADMIN_TOKEN" .../api/analytics/overview | jq 'keys'`.
**Ожидание:** 200, ключи включают `avg_score`, `sessions_completed`, `answers_total`, `levels`, `topics_score`, `weak_topics`, `activity_30d`.

### H-3. /analytics?user_id=2
**Шаги:** `curl ".../api/analytics/overview?user_id=2"`.
**Ожидание:** агрегаты только по user1, числа меньше или равны H-2.

### H-4. Report UI рендер
**Шаги:** UI: `/sessions/1/report` под user1; кликнуть «Голос», «Кодинг».
**Ожидание:** AI-резюме виден, во вкладке «Голос» 9 вопросов с вердиктами, «Кодинг» 3 пункта.
**Скриншот:** `qa/screenshots/H-4.png`.

### H-5. PDF magic
**Шаги:** см. D-8.
**Ожидание:** первые 5 байт `%PDF-`.

### H-6. Score по темам vs Слабые места
**Шаги:** UI `/analytics`, сравнить два блока.
**Ожидание:** «Слабые места» содержит только темы со score < порога (см. backend); если идентичны Score по темам — это **известный баг** из smoke, отметить `[!]` со ссылкой на `doc/improvements.md`.

---

## Группа I. UX-инварианты

### I-1. ThemeToggle persistence
**Шаги:** UI: на `/me/assignments` нажать ThemeToggle, F5, проверить.
**Ожидание:** `data-theme` соответствует значению из `localStorage.kickoff.theme` после перезагрузки.

### I-2. Logout сохраняет theme
**Шаги:** установить `dark`, logout.
**Ожидание:** `localStorage.kickoff.token === null`, `localStorage.kickoff.theme === "dark"`.

### I-3. Sidebar для user
**Шаги:** UI под user1, посмотреть список NavLink.
**Ожидание:** только «Мои кикоффы», «Мои отчёты». Нет «Проекты», «Пользователи», «Назначения», «Загрузить ТЗ», «Аналитика».

### I-4. Sidebar для admin
**Шаги:** UI под admin.
**Ожидание:** все 7 пунктов: Дашборд / История сессий / Аналитика / Проекты / Пользователи / Назначения / Загрузить ТЗ.

### I-5. axios 401-interceptor
**Шаги:** в DevTools `localStorage.removeItem('kickoff.token')`, не перезагружая страницу — кликнуть любой NavLink, который дёргает API.
**Ожидание:** запрос → 401 → interceptor → редирект `/login`.

### I-6. Dashboard breadcrumb
**Шаги:** под admin открыть `/`.
**Ожидание:** в topbar есть полная навигационная цепь (не пустая). Если пусто — отметить `[!]` (известный баг smoke).

---

## Группа J. Счётчик и прогресс на /interview

Цель — отловить рассинхрон между «номером вопроса» / «количеством завершённых» и тем, что реально ожидает пользователь. Все кейсы — голосовая панель `VoiceInteract` (счётчик `X/Y` слева сверху и фразы фаз).

Источник правды — серверный `msg.idx` (0-based позиция voice item в сессии) и итоговый `verdict` в `session_questions`.

### J-1. Skip + skip + answer → counter
**Шаги:** под user стартануть сессию. На Q1 нажать «Пропустить»; на Q2 нажать «Пропустить»; на Q3 ответить (text mode для скорости).
**Ожидание:** на Q4 счётчик показывает `4/10` (= idx+1). Сейчас баг: показывает `2/10` (учитывает только ответы).
**Фиксируем:** скрин `qa/screenshots/J-1.png`.

### J-2. Чистая последовательность ответов
**Шаги:** ответить на 3 подряд.
**Ожидание:** counter растёт `1/10 → 2/10 → 3/10 → 4/10` без пропусков.

### J-3. Follow-up
**Шаги:** ответить так, чтобы LLM сгенерила follow-up. Нажать «К следующему» → следующий вопрос — это follow-up к Q1.
**Ожидание:** counter НЕ меняется (тот же item_id). После ответа на follow-up и `next` → переход на Q2 → counter `2/10`.

### J-4. Replay
**Шаги:** во время listening нажать кнопку refresh (replay).
**Ожидание:** counter не меняется; question приходит снова, idx тот же.

### J-5. Hydrate / resume
**Шаги:** в середине сессии (после нескольких ответов) нажать back/refresh. Вернуться через `Продолжить` из MyAssignments. Сессия должна возобновиться.
**Ожидание:** counter показывает «номер первого неотвеченного» (idx+1), а не `1/10` от начала.

### J-6. WS reconnect mid-session
**Шаги:** в DevTools → Network → throttle → Offline на 5 сек после question. Restore → reconnect.
**Ожидание:** на reconnect приходит тот же question с тем же idx; counter стабилен. TTS не дублируется (проверка `lastPlayedKeyRef`).

### J-7. Time-up
**Шаги:** дождаться истечения SessionTimer.
**Ожидание:** phaseLabel `ВРЕМЯ ВЫШЛО · X/Y`. X = число фактически отвеченных (с verdict ≠ skipped). Если answered=2, skipped=3, time_up — `X = 2`. Зафиксировать: соответствует ли это ожиданию пользователя? Если нет — баг текста (показывать «отвечено 2 из 5 спрошенных, всего 10»).

### J-8. Все вопросы skipped → done
**Шаги:** на каждом вопросе — Skip.
**Ожидание:** после последнего → `done` (reason=completed). counter застывает на `10/10`. После — переход в Report.

### J-9. textMode `submitTextAnswer`
**Шаги:** то же что J-1/J-2, но через переключатель «Текстом / кодом» и `Отправить текстом`.
**Ожидание:** counter растёт корректно (текстовые ответы тоже шлют `transcript`).

### J-10. Race: skip → новый question vs не-приехавший transcript
**Шаги:** на listening быстро нажать Skip перед тем как сервер отдал что-то.
**Ожидание:** counter не «прыгает назад» (с 3/10 на 2/10). Текущее значение должно идти от `current.idx`, а не от `log.length`.

### J-11. Tab «Голосовое» badge `v.log.length`
**Шаги:** ответить на Q1 + получить follow-up + ответить на follow-up.
**Ожидание:** badge у вкладки = 2 (две записи в логе: основной ответ + follow-up reply). Не путать с counter — это счётчик «реплик», не «вопросов».

### J-12. Tab «Лайв-кодинг» badge `correct/total`
**Шаги:** в /coding/review одной задачи получить verdict=correct → badge `1/3`. Перерешать ту же задачу с verdict=incorrect.
**Ожидание:** badge пересчитывается → `0/3`. Если остаётся `1/3` — баг кеша.

### J-13. Counter до старта сессии (`!started`)
**Шаги:** перед нажатием «Начать» — посмотреть на VoiceStartStub.
**Ожидание:** числа берутся из `data.items` totalVoice; counter `0/10` либо отсутствует.

### J-14. Counter в `error` (non-recoverable)
**Шаги:** оборвать WS навсегда (например, kill backend на 30 сек).
**Ожидание:** счётчик замирает на последнем значении, не сбрасывается.

### J-15. SessionTimer vs серверный time-up
**Шаги:** клиентский SessionTimer достиг 0 раньше, чем серверный `_is_time_up` (часы расходятся / network lag). `frozen=true` на клиенте, но WS ещё открыт.
**Ожидание:** counter не двигается, кнопки заблокированы, но WS-сообщения корректно обрабатываются (если придёт `done time_up` — phaseLabel обновится).

### J-16. Continuous mode
**Шаги:** открыть `/sessions/:id/interview?continuous=1` (только voice mode).
**Ожидание:** автозапись стартует в `listening`, counter ведёт себя как в J-2.

## Группа K. Завершение voice / coding / сессии

Цель — отловить путаницу между тремя терминальными состояниями на странице интервью:
- `done(completed)` — все голосовые вопросы пройдены, **время ещё есть**.
- `done(time_up)` или клиентский `setTimeUp` — время сессии вышло.
- `data.status === "finished"` — сессия завершена сервером (через `POST /finish` или admin).

Эти состояния визуально и функционально должны отличаться: после `done(completed)` пользователь должен иметь возможность доделать кодинг-задачи и/или дождаться таймера.

### K-1. done(completed) — info-баннер
**Шаги:** voice mode, ответить/пропустить все voice-вопросы.
**Ожидание:** в голосовой панели **синий info-баннер** «✓ Все голосовые вопросы пройдены. Перейдите во вкладку «Лайв-кодинг» или дождитесь окончания таймера и нажмите «Завершить».» Не красный «время истекло».

### K-2. done(completed) — таймер продолжает идти
**Шаги:** после K-1 — наблюдать SessionTimer.
**Ожидание:** число «осталось HH:MM» уменьшается каждую секунду. Цвет accent (или warn при ≤ 2 мин), не danger.

### K-3. done(completed) — кодинг доступен
**Шаги:** после K-1 переключиться на вкладку «Лайв-кодинг».
**Ожидание:** Monaco-редактор активен (не серый), кнопки «Запустить» / «Отправить» работают. `frozen={false}` для CodingEditor.

### K-4. done(completed) — кнопка «Завершить» работает
**Шаги:** после K-1 нажать «Завершить» в шапке.
**Ожидание:** confirm-диалог → POST /finish → редирект на Report (admin) или MyAssignments (user). Не зависает.

### K-5. done(completed) → потом time_up
**Шаги:** после K-1 не нажимать «Завершить», дождаться истечения SessionTimer (или симулировать через `setTimeUp(true)` в DevTools).
**Ожидание:** баннер меняется с info на danger «время истекло». CodingEditor блокируется (frozen → readonly + dim). SessionTimer останавливается на 00:00.

### K-6. time_up до окончания voice
**Шаги:** запустить интервью, ответить на 1-2 вопроса, дождаться истечения таймера (или вручную сбросить duration в БД на 1 минуту через psql и подождать).
**Ожидание:** WS получает `done(time_up)` → красный баннер сразу. Все остальные voice-вопросы помечены skipped в БД. Кодинг блокируется. Кнопка «Завершить» активна.

### K-7. time_up во время решения coding
**Шаги:** voice уже пройден (K-1). Открыта вкладка кодинг, идёт работа. Истекает таймер.
**Ожидание:** редактор сразу блокируется (нельзя печатать), Run/Submit недоступны. Баннер красный (через voice-таб).

### K-8. data.status === "finished" (внешнее завершение)
**Шаги:** в одной вкладке открыть `/sessions/:id/interview`, в другой — `POST /finish` через curl (или admin клик).
**Ожидание:** при следующем `useQuery refetch` (например, при reconnect) `frozen` срабатывает по `data.status === "finished"`: всё блокируется, баннер красный.

### K-9. Skip всех 10 → done(completed)
**Шаги:** на каждом вопросе нажать «Пропустить».
**Ожидание:** после 10-го skip → `done` reason=completed (не time_up). Info-баннер. counter `10/10`.

### K-10. 9 ответов + skip 10-го → done(completed)
**Шаги:** ответить на 9, последний пропустить.
**Ожидание:** аналогично K-9. У 10-го `verdict=skipped`, у остальных свои verdict.

### K-11. Кнопки голосовой панели в done(completed)
**Шаги:** после K-1 — посмотреть mic / Отправить / Очистить / Текстом / refresh / skip / next.
**Ожидание:** весь блок «Mic controls» **скрыт** (он внутри `{!frozen && v.phase !== "done" && !forceTextMode && (...)}`). Остаются только заголовок и баннер.

### K-12. micHelp в done(completed)
**Шаги:** после K-1.
**Ожидание:** микропомощь под кнопкой не показывается (блок скрыт). В phaseLabel написано «СЕССИЯ ЗАВЕРШЕНА» (не «ВРЕМЯ ВЫШЛО · X/Y»).

### K-13. phaseLabel в time_up
**Шаги:** довести до time_up.
**Ожидание:** label `ВРЕМЯ ВЫШЛО · {completed}/{totalVoice}`. completed = ответы с verdict (не skipped).

### K-14. Перезагрузка страницы после done(completed)
**Шаги:** после K-1 — F5.
**Ожидание:** при mount `useVoiceSession` сначала `idle`, потом `connect()` → WS hello → сервер ответит `done(completed)` (т.к. все voice items с verdict). UI снова показывает info-баннер, кодинг доступен.

### K-15. Перезагрузка страницы после time_up
**Шаги:** довести до time_up, F5.
**Ожидание:** WS hello → `done(time_up)` (т.к. `_is_time_up(sess)`). Красный баннер, всё заблокировано.

### K-16. Reconnect WS в done(completed)
**Шаги:** после K-1 — оборвать сеть и вернуть.
**Ожидание:** клиент НЕ переподключается (intentionalCloseRef после done). Баннер info остаётся, состояние не «прыгает».

### K-17. Tab-индикаторы в done(completed)
**Шаги:** после K-1 — посмотреть на табы.
**Ожидание:** «Голосовое интервью» badge = `v.log.length` (без зелёной точки `dot--live`). «Лайв-кодинг» badge `correctSolved/total`, кликабельна.

### K-18. continuous-режим в done(completed)
**Шаги:** `?continuous=1`, дойти до K-1.
**Ожидание:** автозапись не стартует (phase=done). Микрофон не активен. Info-баннер.

### K-19. text-mode (`mode=text`) в done(completed)
**Шаги:** на сессии с `mode="text"` ответить на все.
**Ожидание:** info-баннер тот же. Textarea скрыта (`v.phase === "done"` исключает её рендер).

### K-20. Видимая кнопка «Завершить» при frozen=true
**Шаги:** в любом из терминальных состояний.
**Ожидание:** кнопка «Завершить» в шапке остаётся активной (не блокируется через frozen). Это единственный путь сформировать отчёт при time_up.

## Постусловие: восстановление БД

- [ ] **Z-1** Удалить остатки temp-user (на случай если G-4 упал):
  ```bash
  docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "DELETE FROM users WHERE email='tmp@test.local';"
  ```
- [ ] **Z-2** Восстановить дамп:
  ```bash
  docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --clean --if-exists < $SNAP
  ```
- [ ] **Z-3** Сверить количество строк до/после:
  ```bash
  docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "SELECT 'users',COUNT(*) FROM users UNION ALL SELECT 'sessions',COUNT(*) FROM sessions UNION ALL SELECT 'requirements',COUNT(*) FROM requirements;"
  ```
  Ожидание: совпадает с пред-снимочным состоянием.
- [ ] **Z-4** `git status` затрагивает только `.gitignore` (или не затрагивает ничего, если строка `qa/` уже была).

---

## Журнал прогона

Заполняется по ходу. Формат: `<дата> · <ветка> · <итог>`.

- 2026-04-26 · dark_theme · подготовлен skeleton (smoke предшественник: `ux-run/`).
- 2026-04-26 · dark_theme · полный прогон: 70 ✓, 9 [!]/[~], 3 [-]. См. `qa/runs/run-2026-04-26.md`. Найдены P0 (C-9 нарушает бан LLM, regenerate с пустым topics) и P1 (D-4, F-5, F-6, H-6, I-5, I-6).
