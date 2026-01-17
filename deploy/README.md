# 部署说明

## 目录结构
- nginx/default.conf: Nginx 站点配置
- nginx/nginx.conf: Nginx 主配置
- env/.env.server.example: 后端环境变量示例
- env/.env.admin.example: 后台前端环境变量示例
- env/.env.print-agent.example: 打印代理环境变量示例
- data/html: 前端静态资源目录
- data/uploads: 上传文件持久化目录
- ssl: HTTPS 证书目录

## 首次部署
1. 进入仓库根目录
2. 准备环境变量
   - 复制示例文件并填写真实值
   - `cp deploy/env/.env.server.example deploy/env/.env.server`
   - 国内网络建议设置 `NODE_IMAGE` 为国内镜像源
3. 准备证书
   - 把证书放到 `deploy/ssl`
   - 需要 `fullchain.pem` 和 `privkey.pem`
4. 构建后台静态文件
   - `pnpm -C apps/admin install`
   - `pnpm -C apps/admin build`
   - `rm -rf deploy/data/html/*`
   - `cp -r apps/admin/dist/* deploy/data/html/`
5. 构建并启动服务
   - `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d --build`

## 二次部署
- `git pull`
- 如后端有变更：`docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d --build`

## 只更新前端
- `pnpm -C apps/admin build`
- `rm -rf deploy/data/html/*`
- `cp -r apps/admin/dist/* deploy/data/html/`
- `docker compose -f deploy/docker-compose.yml exec bbq-nginx nginx -s reload`

## 只更新后端
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml build bbq-server`
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml up -d bbq-server`

## 本地开发运行
- `cp deploy/env/.env.server.example deploy/env/.env.server`
- 国内网络可设置 `NODE_IMAGE` 后再执行
- `docker compose --env-file deploy/env/.env.server -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml up -d --build`

## 国内镜像建议
- 示例：`NODE_IMAGE=registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine`

## 常用排查命令
- `docker compose -f deploy/docker-compose.yml ps`
- `docker compose -f deploy/docker-compose.yml logs -f bbq-server`
- `docker compose -f deploy/docker-compose.yml logs -f bbq-nginx`
- `docker compose -f deploy/docker-compose.yml exec bbq-nginx nginx -t`
- `curl -i https://www.wjlbbq.online/api/store/store_demo/info`
