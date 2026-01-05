# Macho-Bbq / bbq-miniapp

面向堂食场景的扫码点单系统（pnpm workspace Monorepo），包含后端服务、后台管理、小程序端与本地打印代理。

## Tech Stack
- apps/server: NestJS + Prisma + MySQL + JWT + WebSocket
- apps/admin: Vue3 + Vite + Element Plus
- apps/mp: uni-app（Vue3）+ TypeScript
- apps/print-agent: Node.js（Windows 打印代理）

## Repo Structure
```
apps/
  admin/         后台管理前端
  mp/            小程序端（uni-app）
  server/        NestJS API + Prisma
  print-agent/   Windows 打印代理
  server/uploads/  上传静态资源目录
  server/prisma/   Prisma schema/seed
```
说明：
- 根目录使用 `pnpm-workspace.yaml` 组织工作区。
- 未在仓库扫描中发现 docker/nginx/deploy 配置或文档。

## 功能模块清单
### Admin（后台）
- 登录、无权限页（/login、/403）
- 订单管理（会话聚合列表、详情弹窗、结账、换桌、批量删除）
- 桌台管理（桌台状态面板、桌台 CRUD、桌贴二维码）
- 商品管理（类目/商品 CRUD、图片上传与预览）
- 运营/反馈
- 系统管理（门店、员工、角色、打印）
- WebSocket 实时刷新（订单/会话）

### MP（小程序）
- 首页（门店信息展示）
- 点单页（菜单/购物车/下单、WS + 轮询同步）
- 订单（会话订单列表与详情）
- 扫码开桌（扫码解析 + 开桌会话）
- 我的（微信登录、门店信息、反馈/门店/扫码入口）
- 门店信息、意见反馈、就餐须知

### Server（后端）
- 管理端：auth、store、table、category、product、upload、order/session、staff、role/menus、feedback、print
- 小程序端：store、menu、table、cart、order、feedback
- MP 登录：/mp/auth/login
- 通用：JWT 鉴权、菜单/角色权限、WebSocket、打印任务

### Print-agent（打印代理）
- 轮询 `/admin/print/agent/pull` 拉取打印任务
- Windows 打印机输出并上报 `/admin/print/agent/report`

## 接口与 WS 概览
### Admin APIs（/admin/...）
- 登录：`POST /admin/login`
- 订单/会话：`/admin/order/list`、`/admin/order/detail`、`/admin/order/:id`、`/admin/order/:id/settle`、
  `/admin/session/:id/settle`、`/admin/session/:id/move-table`、`/admin/session/:id/print/bill|receipt`、`/admin/session/batch-delete`
- 桌台：`/admin/table`、`/admin/table/dashboard`、`/admin/table/:id/qrcode`
- 类目/商品：`/admin/category`、`/admin/product`
- 上传：`/admin/upload/image`
- 门店：`/admin/store`
- 员工/角色/菜单：`/admin/staff/*`、`/admin/role/*`、`/admin/menus`
- 反馈：`/admin/feedback/list`、`/admin/feedback/:id`
- 打印：`/admin/print/printers`、`/admin/print/jobs`、`/admin/print/jobs/:id/retry`
- 打印代理：`/admin/print/agent/pull|report`
- 鉴权方式：JWT Bearer（部分接口 `OWNER` 角色限制）

### MP/Store APIs
- 门店与菜单：`/store/:storeId/info`、`/menu?storeId=...`
- 桌台与会话：`/table/resolve`、`/table/session/start`、`/table/session/check`
- 购物车：`/cart`、`/cart/item/setQty`、`/cart/clear`
- 订单：`/order/create`、`/order/list`、`/order/:id`
- 反馈：`/feedback/create`
- 小程序登录：`/mp/auth/login`
- 鉴权方式：MP JWT（Authorization Bearer）

### WebSocket
- 管理端：`/admin/ws` 或 `/ws/admin`，token 放在 query `token=...` 或 Authorization header
- 小程序端：`/mp/ws`，query 需包含 `storeId/tableId/sessionId`
- 事件：订单创建、会话结账/换桌、购物车快照/更新等

## 上传与静态资源策略
- 服务端将 `uploads` 目录挂载为静态 `/uploads`。
- 上传接口 `/admin/upload/image` 返回相对路径 `/uploads/<uuid>.<ext>`。
- 商品图片在服务端入库时会归一化为相对路径（以 `/uploads/...` 为主）。
- 前端通过 `PUBLIC_BASE_URL` 拼接完整图片地址：
  - Admin：`resolvePublicUrl()`（`apps/admin/src/common/url.ts`）
  - MP：`normalizeImageUrl()`（`apps/mp/src/utils/url.ts`）

## 环境变量与配置说明
### apps/server
- `.env.example`：`NODE_ENV`、`PORT`、`DATABASE_URL`、`JWT_SECRET`、`TABLE_SIGN_SECRET`、`WX_APPID`、`WX_SECRET`
- `UPLOAD_PUBLIC_URL` 仅在 `.env.example` 中出现，代码扫描未发现使用（未确认）。
- CORS：开发环境放开；生产环境允许本地 5173/5174 白名单。
- 后端路由无 `/api` 前缀，前端可通过代理 `/api` 重写去除。

### apps/admin
- `.env.development/.env.production`：`VITE_API_BASE_URL`、`VITE_API_PROXY_TARGET`、`VITE_WS_URL`、`VITE_PUBLIC_BASE_URL`
- Dev 代理：`/api` → `VITE_API_PROXY_TARGET`，并移除 `/api` 前缀。
- 请求携带 JWT：axios 拦截器自动添加 `Authorization: Bearer`。

### apps/mp
- `.env.development/.env.production`：`VITE_API_BASE_URL`、`VITE_PUBLIC_BASE_URL`、`VITE_WS_BASE_URL`、
  `VITE_DEFAULT_STORE_ID`、`VITE_DEFAULT_TABLE_ID`、`VITE_STORE_PHONE`
- 请求 baseURL 来自 `config/env.ts`，WebSocket 基于 `WS_BASE_URL`。

### apps/print-agent
- `.env.example`：`SERVER_BASE_URL`、`PRINTER_ID`、`AGENT_KEY`、`WINDOWS_PRINTER_NAME`、`POLL_INTERVAL_MS` 等。

### 部署相关
- 未在仓库扫描中发现 docker/nginx/deploy 配置或文档（未确认）。

## 快速启动指引
> 仅列出仓库内 `package.json` 已存在脚本

安装依赖：
```bash
pnpm install
```

Server（NestJS）：
```bash
cp apps/server/.env.example apps/server/.env
pnpm -C apps/server prisma:generate
pnpm -C apps/server db:push
pnpm -C apps/server seed
pnpm -C apps/server start:dev
```

Admin（后台）：
```bash
cp apps/admin/.env.example apps/admin/.env.development
pnpm -C apps/admin dev
```

MP（小程序）：
```bash
cp apps/mp/.env.example apps/mp/.env.development
pnpm -C apps/mp dev:h5
pnpm -C apps/mp dev:mp-weixin
```

Print-agent（可选，Windows）：
```bash
cp apps/print-agent/.env.example apps/print-agent/.env
pnpm -C apps/print-agent start
```

根目录快捷：
```bash
pnpm dev
```
说明：仅启动后台 admin（脚本为 `pnpm -C apps/admin dev`）。

本地默认种子数据（如需）：
- storeId：`store_demo`
- tableId：`table_demo_a1`
- admin 登录：`admin` / `admin123`

## 已实现能力清单 / 待办
### 已实现
- 后台菜单权限（roleId + menuKeys）与路由拦截
- 订单/会话聚合、结账、换桌、批量删除
- 桌台管理与二维码生成（桌贴签名）
- 购物车与订单创建流程（小程序端）
- WS 实时更新（后台订单/桌台状态、小程序购物车）
- 打印任务与 Windows 打印代理
- 图片上传与相对路径存储、前端 PUBLIC_BASE_URL 统一拼接
- 反馈收集与后台查看

### 待办/未确认
- 部署相关配置（docker-compose/nginx/生产部署文档）未在仓库扫描中发现
- `UPLOAD_PUBLIC_URL` 配置存在但代码未使用（未确认）
- 生产环境域名/证书配置流程未在仓库扫描中发现
