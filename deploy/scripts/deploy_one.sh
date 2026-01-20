#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
CONFIG_FILE="$SCRIPT_DIR/../.deployrc"
LAST_TAG_FILE="$SCRIPT_DIR/../.last_tag"

if [ -f "$CONFIG_FILE" ]; then
  set -a
  . "$CONFIG_FILE"
  set +a
fi

CCR_REGISTRY=${CCR_REGISTRY:-ccr.ccs.tencentyun.com}
CCR_NAMESPACE=${CCR_NAMESPACE:-macho_bbq}
CCR_SERVER_REPO=${CCR_SERVER_REPO:-bbq-server}
NODE_IMAGE=${NODE_IMAGE:-ccr.ccs.tencentyun.com/macho_bbq/node:18-bullseye-slim}
SERVER_SSH=${SERVER_SSH:-}
SERVER_APP_DIR=${SERVER_APP_DIR:-}
DOMAIN=${DOMAIN:-}
HEALTHCHECK_PATHS=${HEALTHCHECK_PATHS:-"/"}
HEALTHCHECK_CODES=${HEALTHCHECK_CODES:-"200 301 302 304"}
HEALTHCHECK_RETRY=${HEALTHCHECK_RETRY:-30}
HEALTHCHECK_INTERVAL=${HEALTHCHECK_INTERVAL:-2}

if [ -z "$SERVER_SSH" ] || [ -z "$SERVER_APP_DIR" ] || [ -z "$DOMAIN" ]; then
  echo "缺少配置：SERVER_SSH / SERVER_APP_DIR / DOMAIN"
  exit 1
fi

for cmd in git docker pnpm rsync ssh curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "缺少依赖：$cmd"
    exit 1
  fi
done

if ! ssh "$SERVER_SSH" "docker compose version" >/dev/null 2>&1; then
  echo "服务器未安装 docker compose 或无法连接"
  exit 1
fi

TAG=${TAG:-auto}
if [ "$TAG" = "auto" ]; then
  GIT_HASH=$(git -C "$ROOT_DIR" rev-parse --short HEAD)
  TS=$(date +%Y%m%d%H%M%S)
  TAG="${GIT_HASH}-${TS}"
fi

echo "$TAG" > "$LAST_TAG_FILE"

IMAGE="$CCR_REGISTRY/$CCR_NAMESPACE/$CCR_SERVER_REPO:$TAG"

echo "TAG=$TAG"
echo "IMAGE=$IMAGE"
echo "SERVER_SSH=$SERVER_SSH"
echo "SERVER_APP_DIR=$SERVER_APP_DIR"
echo "DOMAIN=$DOMAIN"
echo "NODE_IMAGE=$NODE_IMAGE"
echo "HEALTHCHECK_PATHS=$HEALTHCHECK_PATHS"

echo "==> 本地构建前端"
pnpm -C "$ROOT_DIR/apps/admin" install
pnpm -C "$ROOT_DIR/apps/admin" build

echo "==> 同步前端到服务器"
ssh "$SERVER_SSH" "mkdir -p '$SERVER_APP_DIR/deploy/data/html'"
rsync -az --delete "$ROOT_DIR/apps/admin/dist/" "$SERVER_SSH:$SERVER_APP_DIR/deploy/data/html/"

echo "==> 构建并推送后端镜像"
if [ -n "${CCR_USERNAME:-}" ]; then
  if [ -n "${CCR_PASSWORD:-}" ]; then
    echo "$CCR_PASSWORD" | docker login "$CCR_REGISTRY" --username "$CCR_USERNAME" --password-stdin || {
      echo "docker login 失败，请检查账号/密码"
      exit 1
    }
  else
    docker login "$CCR_REGISTRY" --username "$CCR_USERNAME" || {
      echo "docker login 失败，请检查账号/密码"
      exit 1
    }
  fi
else
  echo "未设置 CCR_USERNAME，假设已登录"
fi

BUILD_ARGS=(--build-arg "NODE_IMAGE=$NODE_IMAGE")
if [ -n "${PNPM_REGISTRY:-}" ]; then
  BUILD_ARGS+=(--build-arg "PNPM_REGISTRY=$PNPM_REGISTRY")
fi
if [ -n "${PRISMA_ENGINES_MIRROR:-}" ]; then
  BUILD_ARGS+=(--build-arg "PRISMA_ENGINES_MIRROR=$PRISMA_ENGINES_MIRROR")
fi

docker build -f "$ROOT_DIR/deploy/Dockerfile.server" -t "$IMAGE" "${BUILD_ARGS[@]}" "$ROOT_DIR"
docker push "$IMAGE"

echo "==> 服务器拉取并启动"
ssh "$SERVER_SSH" "set -e; cd '$SERVER_APP_DIR'; export TAG='$TAG'; \
  docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml pull bbq-server; \
  docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d bbq-server bbq-nginx; \
  docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml ps"

is_allowed_code() {
  local code="$1"
  for c in $HEALTHCHECK_CODES; do
    if [ "$c" = "$code" ]; then
      return 0
    fi
  done
  return 1
}

is_api_path() {
  case "$1" in
    /api/*|/store/*|/menu*|/cart*|/order*|/feedback*|/mp/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

check_path() {
  local path="$1"
  local url="${DOMAIN}${path}"
  local attempt=1
  while [ "$attempt" -le "$HEALTHCHECK_RETRY" ]; do
    local resp
    resp=$(curl -sS -o /dev/null -w "%{http_code} %{content_type}" "$url" || true)
    local code="${resp%% *}"
    local ctype="${resp#* }"
    if is_allowed_code "$code"; then
      if is_api_path "$path" && [[ "$ctype" == text/html* ]]; then
        echo "健康检查失败：$url 返回 text/html"
      else
        echo "健康检查通过：$url $code $ctype"
        return 0
      fi
    fi
    attempt=$((attempt + 1))
    sleep "$HEALTHCHECK_INTERVAL"
  done
  return 1
}

echo "==> 健康检查"
IFS=' ' read -r -a paths <<< "$HEALTHCHECK_PATHS"
for p in "${paths[@]}"; do
  if [[ "$p" != /* ]]; then
    p="/$p"
  fi
  if ! check_path "$p"; then
    echo "健康检查失败：$DOMAIN$p"
    echo "==> 拉取日志定位"
    ssh "$SERVER_SSH" "cd '$SERVER_APP_DIR'; \
      docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml ps; \
      docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml logs --tail=200 bbq-server; \
      docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml logs --tail=200 bbq-nginx"
    exit 1
  fi
done

echo "部署成功 TAG=$TAG"
echo "已完成健康检查"
echo "如需进一步确认：打开 $DOMAIN"
