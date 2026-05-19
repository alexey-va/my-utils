#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="my-utils"
CONTAINER_NAME="my-utils"
HOST_PORT="13082"

# How the USER'S BROWSER reaches the API (not the Jenkins server).
# Option A — nginx proxies /api on the same host as the UI: leave empty.
# Option B — separate public API host: e.g. https://utils-api.rus-crafting.ru
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"

if [[ "${DEPLOY_MODE:-}" == "split" && -z "${VITE_API_BASE_URL}" ]]; then
  echo "ERROR: DEPLOY_MODE=split requires VITE_API_BASE_URL (public API URL for the browser)."
  exit 1
fi

echo "VITE_API_BASE_URL=${VITE_API_BASE_URL:-<empty — same-origin /api via nginx>}"

cd "${WORKSPACE}"

docker build \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  -t "${IMAGE_NAME}:latest" .

docker stop "${CONTAINER_NAME}" || true
docker rm "${CONTAINER_NAME}" || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  "${IMAGE_NAME}:latest"
