#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "============================================================"
echo "   Firuzo Platform - Docker Management Utility"
echo "============================================================"

action="${1:-menu}"

start_infra() {
  echo "[*] Starting Infrastructure containers (PostgreSQL 16 + Redis 7)..."
  docker compose -f docker-compose.infra.yml up -d
  echo "[✓] Infrastructure is ready!"
  echo "    - PostgreSQL: localhost:5432 (DB: itrip, User: postgres)"
  echo "    - Redis:      localhost:6379"
  echo "    - Adminer UI: http://localhost:8080"
  echo ""
  echo "You can now run 'npm run dev' on your host to connect."
}

start_dev() {
  echo "[*] Starting Full Development Stack with Hot Reload..."
  docker compose -f docker-compose.dev.yml up
}

start_prod() {
  echo "[*] Building and Starting Full Production Stack..."
  docker compose up -d --build
  echo "[✓] Production stack is running in background!"
  echo "    - App Web:    http://localhost:3000"
  echo "    - Health:     http://localhost:3000/api/health/live"
}

stop_all() {
  echo "[*] Stopping all Docker containers..."
  docker compose down 2>/dev/null || true
  docker compose -f docker-compose.dev.yml down 2>/dev/null || true
  docker compose -f docker-compose.infra.yml down 2>/dev/null || true
  echo "[✓] All containers stopped."
}

run_migrate() {
  echo "[*] Applying Prisma migrations inside container..."
  docker compose exec app npx prisma migrate deploy
}

run_seed() {
  echo "[*] Seeding database inside container..."
  docker compose exec app npm run prisma:seed
}

show_logs() {
  docker ps --filter "name=firuzo"
  echo ""
  docker compose logs -f
}

case "$action" in
  infra)
    start_infra
    ;;
  dev)
    start_dev
    ;;
  prod)
    start_prod
    ;;
  down)
    stop_all
    ;;
  migrate)
    run_migrate
    ;;
  seed)
    run_seed
    ;;
  logs)
    show_logs
    ;;
  menu|*)
    echo ""
    echo "Please select an option:"
    echo "  1) Infrastructure Only (PostgreSQL + Redis + Adminer) - 'Connect Mode'"
    echo "  2) Full Dev Stack (App + Worker + DB + Redis with Live Reload)"
    echo "  3) Full Production Stack (Optimized Containers)"
    echo "  4) Stop All Containers"
    echo "  5) Run Database Migrations"
    echo "  6) Seed Database"
    echo "  7) Show Logs"
    echo "  0) Exit"
    echo ""
    read -p "Enter choice [0-7]: " choice
    case "$choice" in
      1) start_infra ;;
      2) start_dev ;;
      3) start_prod ;;
      4) stop_all ;;
      5) run_migrate ;;
      6) run_seed ;;
      7) show_logs ;;
      *) exit 0 ;;
    esac
    ;;
esac
