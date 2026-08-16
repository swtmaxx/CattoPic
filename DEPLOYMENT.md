# CattoPic 部署指南

[English](./docs/DEPLOYMENT_EN.md)

## 项目架构

```
┌──────────────────────────────────────────────┐
│              Cloudflare Worker               │
│                                              │
│  ┌────────────────┐       ┌───────────────┐  │
│  │ Static Next.js │       │ Hono API      │  │
│  │ Assets (out/)  │       │ /api/*        │  │
│  └────────────────┘       └───────┬───────┘  │
│                                   │          │
│          ┌──────────┬─────────────┼──────┐   │
│          │          │             │      │   │
│       ┌──▼───┐   ┌──▼──┐       ┌──▼──┐ ┌─▼──┐ │
│       │  R2  │   │ D1 │       │ KV  │ │Images│
│       └──────┘   └─────┘       └─────┘ └─────┘
└──────────────────────────────────────────────┘
```

| 组件 | 平台 | 用途 |
|------|------|------|
| Frontend + API | Cloudflare Worker | Next.js 静态资源与 Hono API |
| Storage | Cloudflare R2 | 图片文件存储 |
| Database | Cloudflare D1 | SQLite 数据库（元数据、标签、管理员账号） |
| Cache | Cloudflare KV | 缓存层 |
| Queue | Cloudflare Queues | 异步任务（文件删除） |

---

## 前置条件

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) 包管理器
- [Cloudflare 账户](https://dash.cloudflare.com/)

---

## 一、Cloudflare 资源配置

### 1.1 登录 Wrangler CLI

```bash
cd worker
pnpm install
pnpm wrangler login
```

### 1.2 创建 R2 Bucket

```bash
pnpm wrangler r2 bucket create cattopic-r2 --location=apac
```

> `--location=apac` 将存储桶部署在亚太区域以获得更低延迟

### 1.3 创建 D1 数据库

```bash
pnpm wrangler d1 create CattoPic-D1 --location=apac
```

输出示例：
```
✅ Successfully created DB 'CattoPic-D1' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "CattoPic-D1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 记录此 ID
```

### 1.4 创建 KV 命名空间

```bash
pnpm wrangler kv namespace create CACHE_KV
```

输出示例：
```
🌀 Creating namespace with title "cattopic-worker-CACHE_KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "CACHE_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 记录此 ID
```

### 1.5 创建 Queue

```bash
pnpm wrangler queues create cattopic-delete-queue
```

### 1.6 初始化数据库表结构

```bash
pnpm wrangler d1 execute CattoPic-D1 --remote --file=schema.sql
```

已有部署升级时无需手动执行迁移；Worker 会通过 D1 binding 自动补齐新增的删除任务表。

### 1.7 配置生产 Worker

生产部署使用仓库中的 `worker/wrangler.prod.toml`。如果使用自己的 Cloudflare 资源，请替换其中的 R2、D1、KV ID，以及 `R2_PUBLIC_URL` 和 `CORS_ORIGINS`。

```toml
name = 'cattopic-worker'
main = 'src/index.ts'
compatibility_date = '2025-12-10'
compatibility_flags = ['nodejs_compat']

[assets]
directory = '../out'
binding = 'ASSETS'
html_handling = 'auto-trailing-slash'

[vars]
ENVIRONMENT = 'production'
R2_PUBLIC_URL = 'https://your-r2-domain.com'  # 你的 R2 公开访问域名

[images]
binding = "IMAGES"

[[r2_buckets]]
binding = 'R2_BUCKET'
bucket_name = 'cattopic-r2'  # 你创建的 R2 bucket 名称

[[d1_databases]]
binding = 'DB'
database_name = 'CattoPic-D1'
database_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'  # 替换为你的 D1 database_id

[[kv_namespaces]]
binding = "CACHE_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 替换为你的 KV namespace id

# 当前 USE_QUEUE = 'false'，不需要配置 Queue。

[triggers]
crons = ['0 * * * *']  # 每小时清理过期图片

[dev]
port = 8787
local_protocol = 'http'
```

---

## 二、Cloudflare Worker 部署

### 2.1 构建并部署单 Worker

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -C worker install --frozen-lockfile
pnpm -C worker wrangler deploy --config wrangler.prod.toml
```

`pnpm build` 会生成 `out/`，Wrangler 会把它作为同一个 Worker 的静态 Assets 发布；`/api/*` 仍由 Hono 处理。

部署成功后输出示例：
```
Uploaded cattopic-worker
Deployed cattopic-worker triggers
  https://cattopic-worker.<your-subdomain>.workers.dev
```

### 2.2 初始化管理员账号（网页）

前端部署完成后，首次打开 `/admin/setup` 页面，在网页中创建管理员账号（用户名 + 密码，PBKDF2 哈希存储于 D1 `admin_users` 表）。之后通过 `/admin/login` 登录后台。

### 2.3 验证部署

```bash
# 检查会话/初始化状态（公开接口）
curl https://cattopic-worker.<your-subdomain>.workers.dev/api/auth/session

# 预期返回（未初始化）
{"success":true,"data":{"needsSetup":true,"authenticated":false}}
```

---

## 三、R2 公开访问配置（可选）

如果需要自定义域名访问 R2 存储的图片：

### 3.1 在 Cloudflare Dashboard 配置

1. 进入 R2 存储桶设置
2. 在 "Public access" 部分启用公开访问
3. 配置自定义域名（例如：`r2.yourdomain.com`）

### 3.2 更新 wrangler.toml

```toml
[vars]
R2_PUBLIC_URL = 'https://r2.yourdomain.com'
```

重新部署：

```bash
pnpm wrangler deploy
```

---

## 四、单 Worker 访问地址

部署成功后，Worker 地址同时提供前端和 API：

```text
https://cattopic-worker.<your-subdomain>.workers.dev/
https://cattopic-worker.<your-subdomain>.workers.dev/api/random
```

前端使用同源 `/api/*` 请求，因此生产环境不需要配置 `NEXT_PUBLIC_API_URL`。如果使用自定义域名，请将该域名填入 `CORS_ORIGINS` 后重新部署 Worker。

---

## 五、升级已有部署

已有部署应继续使用原来的 D1 数据库，不需要迁移或轮换数据。`schema.sql` 只用于新安装；升级时不要重新初始化数据库。新版改为用户名/密码登录（`admin_users` 表 + KV 会话），旧 `api_keys` 表保留但不再使用。

本版本新增 `deletion_jobs` 表用于可靠重试 R2 删除任务。该表由 Worker 在运行时通过 D1 binding 懒创建，因此 fork 用户和本地部署用户都不需要手动执行 D1 迁移命令。

### 5.1 Fork + GitHub Actions

1. 同步或合并上游代码。
2. 确认仓库配置了 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。
3. 推送到 `main`，或在 GitHub Actions 手动运行 `Deploy Worker`。
4. workflow 会安装前端和 Worker 依赖、构建 `out/`、执行 Worker 类型检查并部署单 Worker。
5. 不需要在 Actions 中执行 D1 SQL。

### 5.2 本地拉取 + 手动部署

```bash
git pull
npx --yes pnpm@10.24.0 install --frozen-lockfile
npx --yes pnpm@10.24.0 run build
npx --yes pnpm@10.24.0 -C worker install --frozen-lockfile
npx --yes pnpm@10.24.0 -C worker exec tsc --noEmit
npx --yes pnpm@10.24.0 -C worker exec wrangler deploy --config wrangler.prod.toml
```

后台登录使用 D1 `admin_users` 表（PBKDF2 哈希）校验，会话存于 KV，不要配置成 Worker Secret。

---

## 六、本地开发

### 6.1 启动 Worker（本地）

```bash
cd worker
pnpm dev
# 运行在 http://localhost:8787
```

### 6.2 启动前端（本地）

```bash
pnpm dev
# 运行在 http://localhost:3000
```

### 6.3 本地环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

本地开发时前端和 Worker 仍分别运行；生产环境由 Worker Assets 提供静态前端。生产构建不需要设置 `NEXT_PUBLIC_API_URL`，留空即可使用同源 API。

---

## 七、API 参考

### 认证方式

受保护的 API 依赖登录会话：先通过 `/api/auth/login` 登录（HttpOnly Cookie），浏览器请求会自动携带 Cookie。未登录访问受保护接口返回 401。

### API 端点

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/random` | ❌ | 随机获取图片（公开） |
| GET | `/r2/*` | ❌ | 访问图片文件 |
| GET | `/api/auth/session` | ❌ | 会话状态（公开） |
| POST | `/api/auth/setup` | ❌ | 初始化管理员（仅首次） |
| POST | `/api/auth/login` | ❌ | 登录 |
| POST | `/api/auth/logout` | ❌ | 登出 |
| POST | `/api/upload/single` | ✅ | 上传图片 |
| GET | `/api/images` | ✅ | 获取图片列表 |
| GET | `/api/images/:id` | ✅ | 获取图片详情 |
| PUT | `/api/images/:id` | ✅ | 更新图片信息 |
| DELETE | `/api/images/:id` | ✅ | 删除图片 |
| GET | `/api/tags` | ✅ | 获取标签列表 |
| POST | `/api/tags` | ✅ | 创建标签 |
| PUT | `/api/tags/:name` | ✅ | 重命名标签 |
| DELETE | `/api/tags/:name` | ✅ | 删除标签及关联图片 |
| POST | `/api/tags/batch` | ✅ | 批量标签操作 |

详细 API 文档请参考 [API.md](./docs/API.md)。

---

## 七、常见问题

### Q1: 401 Unauthorized 错误

确认已登录：访问 `/admin/login` 用管理员账号登录。若提示"请先初始化管理员"，请先访问 `/admin/setup` 创建账号（或执行 `SELECT * FROM admin_users;` 检查）。

### Q2: 如何重置管理员密码

```bash
pnpm wrangler d1 execute CattoPic-D1 --remote --command "
DELETE FROM admin_users;
"
```
删除后重新访问 `/admin/setup` 创建新账号即可。

### Q4: 如何查看所有资源 ID

```bash
# 查看 D1 数据库
pnpm wrangler d1 list

# 查看 KV 命名空间
pnpm wrangler kv namespace list

# 查看 R2 存储桶
pnpm wrangler r2 bucket list

# 查看队列
pnpm wrangler queues list
```

### Q5: 图片上传后无法访问

1. 检查 `R2_PUBLIC_URL` 是否配置正确
2. 确认 R2 存储桶已启用公开访问
3. 检查自定义域名 DNS 是否已生效

---

## 八、更新部署

### Worker 更新

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -C worker install --frozen-lockfile
pnpm -C worker wrangler deploy --config wrangler.prod.toml
```

### 自动更新

推送 `main` 后，GitHub Actions 会在前端或 Worker 文件变化时自动构建并部署单 Worker。
