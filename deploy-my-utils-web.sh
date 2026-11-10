#!/usr/bin/env bash
set -euo pipefail

container=myutils-web-vds
backup="${container}-rollback"
port=13082
image=my-utils-web-vds:latest
revision=${CI_COMMIT_SHA:?}
cd "${CI_WORKSPACE:?}"

if [[ "$(git rev-parse HEAD)" != "$revision" ]]; then
  echo "The checkout does not match the pipeline commit" >&2
  exit 1
fi

binding=$(docker inspect --type container --format '{{range (index .HostConfig.PortBindings "80/tcp")}}{{.HostIp}}:{{.HostPort}}{{"\n"}}{{end}}' "$container")
if [[ "$binding" != "127.0.0.1:$port" ]]; then
  echo "Unexpected port binding for $container" >&2
  exit 1
fi
if docker container inspect "$backup" >/dev/null 2>&1; then
  echo "A previous frontend container still exists as $backup" >&2
  exit 1
fi

wait_for_frontend() {
  local deadline=$((SECONDS + 120)) state=
  while (( SECONDS < deadline )); do
    state=$(docker inspect --type container --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.HostConfig.RestartPolicy.Name}}' "$container" 2>/dev/null || true)
    if [[ "$state" == "running healthy unless-stopped" ]] &&
      curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:$port/" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  echo "$container failed readiness (state, health, restart: $state)" >&2
  return 1
}

# API endpoints already start with /api, which nginx serves on this origin.
docker build \
  --build-arg "VITE_API_BASE_URL=" \
  --build-arg "VITE_GRAFANA_URL=${VITE_GRAFANA_URL:-}" \
  --build-arg "VITE_GRAFANA_PATH=${VITE_GRAFANA_PATH:-d/myutils-api-logs/my-utils-api-logs}" \
  --build-arg "VITE_TEMPORAL_URL=${VITE_TEMPORAL_URL:-}" \
  --build-arg "VITE_TEMPORAL_PATH=${VITE_TEMPORAL_PATH:-}" \
  --label "org.opencontainers.image.revision=$revision" \
  --tag "$image" .
image_id=$(docker image inspect --format '{{.Id}}' "$image")

candidate=
restore_frontend() {
  local status=$?
  trap - INT TERM
  echo "Frontend deployment failed, restoring $backup" >&2
  if [[ -n "$candidate" ]] && ! docker rm --force "$candidate" >/dev/null; then
    echo "Failed to remove the replacement frontend container" >&2
    return "$status"
  fi
  if docker rename "$backup" "$container" &&
    docker start "$container" >/dev/null &&
    wait_for_frontend; then
    echo "Previous frontend restored" >&2
  else
    echo "Automatic frontend rollback failed" >&2
  fi
  return "$status"
}

docker rename "$container" "$backup"
trap restore_frontend EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
candidate=$(docker create --name "$container" --restart unless-stopped --publish "127.0.0.1:$port:80" "$image_id")
docker stop "$backup" >/dev/null
docker start "$candidate" >/dev/null
wait_for_frontend
trap - EXIT INT TERM
docker rm "$backup" >/dev/null
echo "Frontend $revision deployed healthy with restart=unless-stopped"
