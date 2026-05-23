#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="my-utils"
CONTAINER_NAME="my-utils"
HOST_PORT="13082"

# How the USER'S BROWSER reaches the API (not the Jenkins server).
# Option A — nginx proxies /api on the same host as the UI: leave empty.
# Option B — separate public API host: e.g. https://utils-api.rus-crafting.ru
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"

if [[ "${VITE_API_BASE_URL}" == *"127.0.0.1"* || "${VITE_API_BASE_URL}" == *"localhost"* ]]; then
  echo "ERROR: VITE_API_BASE_URL must not use 127.0.0.1/localhost (browser cannot reach server localhost)."
  echo "Leave empty when nginx proxies /api on https://utils.alexeyav.ru"
  exit 1
fi

if [[ "${DEPLOY_MODE:-}" == "split" && -z "${VITE_API_BASE_URL}" ]]; then
  echo "ERROR: DEPLOY_MODE=split requires VITE_API_BASE_URL (public API URL for the browser)."
  exit 1
fi

echo "VITE_API_BASE_URL=${VITE_API_BASE_URL:-<empty — same-origin /api via nginx>}"
echo "VITE_GRAFANA_URL=${VITE_GRAFANA_URL:-<empty — same-origin /grafana via nginx>}"

cd "${WORKSPACE}"

docker build \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --build-arg "VITE_GRAFANA_URL=${VITE_GRAFANA_URL:-}" \
  --build-arg "VITE_GRAFANA_PATH=${VITE_GRAFANA_PATH:-}" \
  -t "${IMAGE_NAME}:latest" .

docker stop "${CONTAINER_NAME}" || true
docker rm "${CONTAINER_NAME}" || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  "${IMAGE_NAME}:latest"
