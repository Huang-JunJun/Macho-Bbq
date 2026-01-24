#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/deploy/env/.env.server}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/deploy/docker-compose.yml}"

COMPOSE=(docker compose)
if [[ "${USE_SUDO:-}" == "1" ]]; then
  COMPOSE=(sudo -E docker compose)
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "未找到环境文件: ${ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "未找到 compose 文件: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ "${FORCE_RESET:-}" != "1" ]]; then
  echo "警告：该操作会清空生产数据库的全部数据。"
  read -r -p "请输入 RESET 继续: " confirm
  if [[ "${confirm}" != "RESET" ]]; then
    echo "已取消"
    exit 1
  fi
fi

cd "${ROOT_DIR}"

echo "启动 mysql 与 server 容器..."
"${COMPOSE[@]}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d mysql bbq-server

echo "清库并重建结构..."
reset_ok=0
for i in {1..10}; do
  if "${COMPOSE[@]}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T bbq-server \
    sh -lc 'cd /app/apps/server && pnpm prisma db push --force-reset --accept-data-loss'; then
    reset_ok=1
    break
  fi
  echo "db push 失败，${i}/10，3 秒后重试..."
  sleep 3
done

if [[ "${reset_ok}" != "1" ]]; then
  echo "db push 多次失败，请检查 mysql 是否正常运行。" >&2
  exit 1
fi

echo "写入种子数据..."
"${COMPOSE[@]}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T bbq-server \
  sh -lc 'cd /app/apps/server && pnpm seed'

echo "完成。当前容器状态："
"${COMPOSE[@]}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
