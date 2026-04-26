-- Очистка БД перед демо.
-- Сохраняет: users, alembic_version.
-- Чистит всё остальное и сбрасывает sequences для красивых ID.
--
-- Запуск:
--   docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < backend/scripts/reset_demo.sql
-- или через обёртку:
--   bash backend/scripts/reset_demo.sh

BEGIN;

TRUNCATE TABLE
    llm_usage,
    session_summary,
    session_questions,
    sessions,
    assignments,
    question_bank,
    requirements
RESTART IDENTITY CASCADE;

COMMIT;

\echo 'Demo reset complete. Preserved: users, alembic_version.'

SELECT 'users'         AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'requirements',     COUNT(*) FROM requirements
UNION ALL SELECT 'question_bank',    COUNT(*) FROM question_bank
UNION ALL SELECT 'sessions',         COUNT(*) FROM sessions
UNION ALL SELECT 'session_questions', COUNT(*) FROM session_questions
UNION ALL SELECT 'session_summary',  COUNT(*) FROM session_summary
UNION ALL SELECT 'assignments',      COUNT(*) FROM assignments
UNION ALL SELECT 'llm_usage',        COUNT(*) FROM llm_usage
UNION ALL SELECT 'alembic_version',  COUNT(*) FROM alembic_version;
