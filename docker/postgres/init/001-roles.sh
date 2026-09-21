#!/usr/bin/env bash
set -Eeuo pipefail

: "${POSTGRES_RUNTIME_USER:?POSTGRES_RUNTIME_USER es obligatorio}"
: "${POSTGRES_RUNTIME_PASSWORD:?POSTGRES_RUNTIME_PASSWORD es obligatorio}"

psql -v ON_ERROR_STOP=1 \
  -v runtime_user="$POSTGRES_RUNTIME_USER" \
  -v runtime_password="$POSTGRES_RUNTIME_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOINHERIT',
  :'runtime_user',
  :'runtime_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'runtime_user'
)\gexec

SELECT format('ALTER ROLE %I NOSUPERUSER NOBYPASSRLS NOINHERIT', :'runtime_user')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'runtime_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_user')\gexec
SQL
