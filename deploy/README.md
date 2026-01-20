# 部署说明

## 目录结构
- default.conf: Nginx 站点配置
- nginx.conf: Nginx 主配置
- env/.env.server.example: 后端环境变量示例
- env/.env.admin.example: 后台前端环境变量示例
- env/.env.print-agent.example: 打印代理环境变量示例
- data/html: 前端静态资源目录
- data/uploads: 上传文件持久化目录
- ssl: HTTPS 证书目录

## 版本 TAG 策略
- 推荐使用 git 提交短哈希：`TAG=$(git rev-parse --short HEAD)`
- 或使用时间戳：`TAG=$(date +%Y%m%d%H%M%S)`

## 首次部署（服务器）
1. 进入仓库根目录
2. 准备环境变量
   - 复制示例文件并填写真实值
   - `cp deploy/env/.env.server.example deploy/env/.env.server`
3. 准备证书
   - 把证书放到 `deploy/ssl`
   - 需要 `fullchain.pem` 和 `privkey.pem`
4. 准备前端静态资源（从本地上传，见下方）
5. 启动服务（只 pull 镜像，不 build）
   - `export TAG=xxxxx`
   - `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml pull bbq-server`
   - `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d`

## 二次部署（服务器）
- `git pull`
- `export TAG=xxxxx`
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml pull bbq-server`
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d`

## 只更新前端（方案 A：本地构建后上传）
本地构建并上传到服务器 `deploy/data/html`，建议原子替换：
- 本地执行：
  - `pnpm -C apps/admin build`
  - `tar -C apps/admin/dist -czf /tmp/admin-dist.tgz .`
  - `scp /tmp/admin-dist.tgz ubuntu@<server>:/opt/bbq-miniapp/Macho-Bbq/deploy/data/html.tmp.tgz`
- 服务器执行：
  - `cd /opt/bbq-miniapp/Macho-Bbq`
  - `rm -rf deploy/data/html.tmp && mkdir -p deploy/data/html.tmp`
  - `tar -xzf deploy/data/html.tmp.tgz -C deploy/data/html.tmp`
  - `rm -f deploy/data/html.tmp.tgz`
  - `rm -rf deploy/data/html && mv deploy/data/html.tmp deploy/data/html`
  - `docker compose -f deploy/docker-compose.yml exec bbq-nginx nginx -s reload`

## 只更新后端（本地构建 + 服务器 pull）
### 本地构建并推送
- `export TAG=xxxxx`
- `docker login ccr.ccs.tencentyun.com`
- `docker build -f deploy/Dockerfile.server -t ccr.ccs.tencentyun.com/macho_bbq/bbq-server:${TAG} .`
- `docker push ccr.ccs.tencentyun.com/macho_bbq/bbq-server:${TAG}`
### 服务器拉取并重启
- `export TAG=xxxxx`
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml pull bbq-server`
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d bbq-server`

## 一键发布（本地执行）
1. 编辑 `deploy/.deployrc`（可提交）或用环境变量覆盖
2. 执行：
   - `TAG=auto ./deploy/scripts/deploy_one.sh`
3. 脚本会依次完成：
   - 前端 build 并同步到服务器
   - 后端镜像 build + push
   - 服务器 pull + up，并输出 `docker compose ps`
   - 健康检查（失败会自动拉取日志）

## 本地开发运行
- `cp deploy/env/.env.server.example deploy/env/.env.server`
- 默认使用 `NODE_IMAGE=ccr.ccs.tencentyun.com/macho_bbq/node:18-bullseye-slim`
- 如需切换镜像源，可手动设置 `NODE_IMAGE`
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml up -d --build`

## 国内镜像建议
- 优先使用腾讯 CCR：`NODE_IMAGE=ccr.ccs.tencentyun.com/macho_bbq/node:18-bullseye-slim`
- 或替换为其他国内镜像源：`NODE_IMAGE=registry.cn-hangzhou.aliyuncs.com/library/node:18-bullseye-slim`
- 如需使用 Docker Hub 镜像，可配置 registry mirror（示例）：
  - `/etc/docker/daemon.json`
  - `{ "registry-mirrors": ["https://mirror.ccs.tencentyun.com"] }`
  - `sudo systemctl restart docker`

## 常用排查命令
- `docker compose -f deploy/docker-compose.yml ps`
- `docker compose -f deploy/docker-compose.yml logs -f bbq-server`
- `docker compose -f deploy/docker-compose.yml logs -f bbq-nginx`
- `docker compose -f deploy/docker-compose.yml exec bbq-nginx nginx -t`
- `curl -i https://www.wjlbbq.online/api/store/store_demo/info`

## 服务器清理（可选）
当镜像拉取与前端上传流程稳定后，可只保留以下路径：
- deploy/env/.env.server
- deploy/ssl
- deploy/data/uploads
- deploy/data/html
