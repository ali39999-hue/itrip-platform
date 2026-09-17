#!/bin/sh
set -e

echo "============================================================"
echo " 🚀 Firuzo Platform Container Runtime Initializing"
echo " Node Version: $(node -v) | Target: ${NODE_ENV:-development}"
echo " Port: ${PORT:-3000} | Host: ${HOSTNAME:-0.0.0.0}"
echo "============================================================"

# Database connection & migration check
if [ -n "$DATABASE_URL" ] && [ "$SKIP_DB_MIGRATION" != "true" ]; then
  echo "==> Verifying database availability and applying pending Prisma migrations..."

  MAX_RETRIES=15
  RETRY_COUNT=0
  MIGRATION_SUCCESS=false

  until [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
    if npx prisma migrate deploy; then
      MIGRATION_SUCCESS=true
      echo "✓ Database schema is up-to-date."
      break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⚠️ Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES). Waiting 3 seconds..."
    sleep 3
  done

  if [ "$MIGRATION_SUCCESS" = "true" ]; then
    echo "==> Running idempotent production database bootstrap (roles, admin, seed, DDL self-healing)..."
    if node scripts/db-bootstrap.mjs; then
      echo "✓ Production database bootstrap completed."
    else
      echo "⚠️ Database bootstrap warning (proceeding with container launch)."
    fi
  else
    echo "⚠️ Database migration did not succeed within retry window."
    echo "⚠️ Proceeding with startup; runtime resilience fallbacks active."
  fi
else
  echo "ℹ DATABASE_URL not set or SKIP_DB_MIGRATION=true. Skipping automated migration."
fi

# If command arguments are passed (e.g. worker, seed, or custom command), execute them
if [ $# -gt 0 ]; then
  echo "==> Executing command: $@"
  exec "$@"
fi

# Default execution: check for standalone server.js first, fall back to npm start
if [ -f "/app/.next/standalone/server.js" ]; then
  echo "==> Starting Firuzo standalone optimized server on port ${PORT:-3000}..."
  exec node /app/.next/standalone/server.js
else
  echo "==> Starting Firuzo Next.js production web server on port ${PORT:-3000}..."
  exec npm start
fi
