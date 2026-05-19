#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="my-utils"
CONTAINER_NAME="my-utils"
HOST_PORT="13082"

cd "${WORKSPACE}"

docker build -t "${IMAGE_NAME}:latest" .

docker stop "${CONTAINER_NAME}" || true
docker rm "${CONTAINER_NAME}" || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  "${IMAGE_NAME}:latest"
