# bbq-miniapp

## Server

```bash
pnpm -C apps/server install
cp apps/server/.env.example apps/server/.env
pnpm -C apps/server prisma:generate
pnpm -C apps/server db:push
pnpm -C apps/server seed
pnpm -C apps/server start:dev
```

## Admin Web

```bash
pnpm -C apps/admin install
cp apps/admin/.env.example apps/admin/.env
pnpm -C apps/admin dev
```

- 默认端口：`http://localhost:5174/`

## Mini Program (uni-app)

```bash
pnpm -C apps/mp install
cp apps/mp/.env.example apps/mp/.env
```

- 使用 HBuilderX 打开 `apps/mp` 运行到微信小程序或 H5
- `apps/mp/.env` 里配置 `VITE_API_BASE_URL` 指向后端（例如 `http://localhost:3000`）
- 若 HBuilderX 编译报 `@rollup/rollup-darwin-x64`/`@esbuild/darwin-x64` 找不到，先退出 HBuilderX 后执行 `pnpm install --force` 再重试
- H5 运行默认端口通常为 `http://localhost:5173/`
