# bbq-miniapp

面向堂食场景的扫码点单系统（Monorepo），包含后端服务、后台管理、小程序端以及可选的本地打印代理。

## 目录
- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [系统架构与数据流](#系统架构与数据流)
- [快速开始](#快速开始)
- [开发调试](#开发调试)
- [目录结构](#目录结构)
- [环境变量说明](#环境变量说明)
- [常见问题](#常见问题)
- [Roadmap](#roadmap)
- [贡献指南](#贡献指南)
- [License](#license)

## 项目简介
bbq-miniapp 是一套堂食扫码点单系统，包含：
- apps/server：NestJS + Prisma + MySQL 后端
- apps/admin：Vue3 + Vite + Element Plus 后台管理
- apps/mp：uni-app（mp-weixin + H5）小程序端
- apps/print-agent：Windows 本地 USB 80mm 小票机打印代理（可选）

## 核心功能
- 桌台扫码开桌与会话隔离
- 共享购物车（同桌多端同步）
- 订单创建、结账、状态同步
- 后台订单按会话聚合、分次明细展示
- 桌台状态面板与快速查看
- 员工权限（店长/员工）
- 意见反馈
- 打印任务：后厨单 / 预结账清单 / 结账凭证
- WebSocket 实时刷新（后台 + 小程序）

## 系统架构与数据流
1) 后台生成桌台二维码 → 小程序扫码进入
2) 小程序扫码后在 scan 页选择人数 → 创建/加入桌台会话 session
3) 点单/加菜 → 共享购物车写入服务端 cart_item
4) 下单 → 服务端校验会话与商品状态 → 创建订单并清空购物车
5) 后台订单按 session 聚合展示 → 结账关闭会话
6) WebSocket 推送：后台订单列表实时刷新，小程序会话失效提示重扫
7) 可选打印：下单自动后厨单，结账/清单手动或自动打印

## 快速开始
从 0 启动最短路径：
```bash
pnpm install
cp apps/server/.env.example apps/server/.env
pnpm -C apps/server db:push
pnpm -C apps/server seed
pnpm -C apps/server start:dev
cp apps/admin/.env.example apps/admin/.env
pnpm -C apps/admin dev
cp apps/mp/.env.example apps/mp/.env
pnpm -C apps/mp dev:h5
```

本地联调端口：
- server: 3000
- admin: 5174
- mp-h5: 5173

## 开发调试

### Server（apps/server）
```bash
cp apps/server/.env.example apps/server/.env
pnpm -C apps/server db:push
pnpm -C apps/server seed
pnpm -C apps/server start:dev
```

默认种子数据：
- storeId=store_demo
- tableId=table_demo_a1
- admin 账号：admin@example.com / admin123

### Admin（apps/admin）
```bash
cp apps/admin/.env.example apps/admin/.env
pnpm -C apps/admin dev
```

### Mini Program（apps/mp）
```bash
cp apps/mp/.env.example apps/mp/.env
pnpm -C apps/mp dev:h5
```
mp-weixin：可使用 HBuilderX 或微信开发者工具运行 `apps/mp`。

真机/小程序联调注意：
- `apps/mp/.env` 的 `VITE_API_BASE_URL` 必须是局域网 IP（不能用 localhost）。

### Print Agent（可选，Windows）
```bash
cp apps/print-agent/.env.example apps/print-agent/.env
pnpm -C apps/print-agent start
```

## 目录结构
```
apps/
  server/         NestJS API + Prisma + MySQL
  admin/          后台管理 Web
  mp/             小程序端（uni-app）
  print-agent/    Windows 本地打印代理
```

## 环境变量说明

### apps/server/.env
- DATABASE_URL：MySQL 连接串
- JWT_SECRET：后台 JWT 密钥
- TABLE_SIGN_SECRET：桌台二维码签名密钥
- UPLOAD_PUBLIC_URL：上传资源对外访问地址
- WX_APPID / WX_SECRET：微信小程序登录（可选）

### apps/admin/.env
- VITE_API_BASE_URL：默认 `/api`
- VITE_API_PROXY_TARGET：后端地址，例如 `http://localhost:3000`
- VITE_WS_URL：后台 WebSocket 地址

### apps/mp/.env
- VITE_API_BASE_URL：后端地址（真机需局域网 IP）
- VITE_DEFAULT_STORE_ID：开发默认门店
- VITE_DEFAULT_TABLE_ID：开发默认桌台
- VITE_STORE_PHONE：联系商家兜底电话

### apps/print-agent/.env
- SERVER_BASE_URL：后端地址
- PRINTER_ID：打印机 ID（后台创建）
- AGENT_KEY：打印代理密钥（后台创建）
- WINDOWS_PRINTER_NAME：Windows 打印机名称
- POLL_INTERVAL_MS：拉取间隔

## 常见问题
1) 小程序真机请求还是走 localhost  
请把 `apps/mp/.env` 的 `VITE_API_BASE_URL` 改为局域网 IP，并重启开发服务。

2) db:push 提示认证失败  
检查 `DATABASE_URL` 用户名密码与 MySQL 实例一致。

3) 后台订单列表不实时刷新  
确认 `VITE_WS_URL` 正确，后端 ws 路径支持 `/admin/ws` 或 `/ws/admin`。

4) 打印任务不出纸  
确认 Windows 打印机名称、printerId/agentKey 配置正确，且 print-agent 正在运行。

## Roadmap
- 订单与桌台更多统计视图
- 设备与打印策略扩展
- 更细粒度权限与审计
- 线上环境部署文档

## 贡献指南
欢迎贡献与反馈：
1) Fork 仓库并创建功能分支
2) 保持最小改动与清晰提交信息
3) 提交 PR 前本地自测

## License
当前为 UNLICENSED。如需开源许可证请补充。
