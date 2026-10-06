#!/usr/bin/env bash
# Builds and starts the app + Postgres, then waits until the app reports healthy.
set -euo pipefail
cd "$(dirname "$0")"

docker compose up -d --build

PORT="${PORT:-3000}"
echo "Waiting for http://localhost:$PORT ..."
for _ in $(seq 1 60); do
  if curl -fs "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    echo "Ready: http://localhost:$PORT"
    exit 0
  fi
  sleep 2
done

echo "App did not become healthy. Recent logs:"
docker compose logs --tail=50 app
exit 1
