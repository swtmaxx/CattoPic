# CattoPic

一个自托管的图片托管服务，支持自动格式转换、标签管理和随机图片 API。前端使用 Next.js，后端使用 Cloudflare Workers 和 Hono。

[English](../README.md)

## 系统架构

CattoPic 使用单 Worker 部署。Cloudflare Worker 同时提供 Next.js 静态页面和 Hono API：

    Cloudflare Worker
    ├── Next.js 静态资源（out/）
    ├── Hono API（/api/*）
    ├── R2 图片存储
    ├── D1 图片元数据、标签和管理员账号
    ├── KV 登录会话和缓存
    ├── Cloudflare Images 图片转换
    └── Cron 定时清理

| 组件 | 服务 | 用途 |
|------|------|------|
| 前端 + API | Cloudflare Worker | Next.js 静态资源与 Hono API |
| 存储 | Cloudflare R2 | 原图和转换后的图片文件 |
| 数据库 | Cloudflare D1 | 图片元数据、标签、管理员账号 |
| 会话/缓存 | Cloudflare KV | 登录会话和响应缓存 |
| 队列 | Cloudflare Queues（可选） | 异步删除 R2 文件 |
| 图片转换 | Cloudflare Images | WebP/AVIF 转换和优化 |
| 定时任务 | Cron Triggers | 重试删除任务和清理过期图片 |

## 功能特性

- 多格式支持：JPEG、PNG、GIF、WebP、AVIF
- 自动生成 WebP 和 AVIF 版本
- 标签管理和批量标签操作
- 公开随机图片 API
- 临时图片过期时间
- 支持深色模式的管理界面

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Next.js 16、React 19、Tailwind CSS |
| 后端 | Cloudflare Workers、Hono |
| 存储 | Cloudflare R2 |
| 数据库 | Cloudflare D1（SQLite） |
| 缓存和会话 | Cloudflare KV |
| 图片处理 | Cloudflare Images |

## 快速开始

### 前置条件

- Node.js 24 或更高版本
- pnpm 10.x
- Cloudflare 账户

锁文件使用 pnpm 10 维护。pnpm 11 可能会改写锁文件元数据，建议部署时使用 pnpm 10。

### 1. 克隆并安装

    git clone https://github.com/yourusername/cattopic.git
    cd cattopic
    npx --yes pnpm@10.24.0 install --frozen-lockfile
    npx --yes pnpm@10.24.0 -C worker install --frozen-lockfile

### 2. 创建 Cloudflare 资源

    npx --yes pnpm@10.24.0 -C worker exec wrangler login
    npx --yes pnpm@10.24.0 -C worker exec wrangler r2 bucket create cattopic-r2 --location=apac
    npx --yes pnpm@10.24.0 -C worker exec wrangler d1 create CattoPic-D1 --location=apac
    npx --yes pnpm@10.24.0 -C worker exec wrangler kv namespace create CACHE_KV

记录 R2、D1 和 KV 返回的资源 ID。新数据库执行初始化：

    npx --yes pnpm@10.24.0 -C worker exec wrangler d1 execute CattoPic-D1 --remote --file=schema.sql

已有部署不要重复执行 schema.sql。

队列是可选的。只有将生产配置中的 USE_QUEUE 设置为 true 时，才需要创建队列：

    npx --yes pnpm@10.24.0 -C worker exec wrangler queues create cattopic-delete-queue

### 3. 配置生产 Worker

生产部署使用仓库中的 worker/wrangler.prod.toml。替换其中的：

- R2_PUBLIC_URL：图片文件的公开访问域名
- CORS_ORIGINS：独立前端域名或其他跨域浏览器客户端的来源
- R2 bucket 名称
- D1 数据库名称和 ID
- KV namespace ID

必须保留静态资源配置：

    [assets]
    directory = '../out'
    binding = 'ASSETS'
    html_handling = 'auto-trailing-slash'

前端和 API 使用同一个 Worker 域名时，当前 origin 会自动放行。不要再复制旧版 wrangler.example.toml，也不需要配置独立的前端托管平台。

### 4. 构建并部署单 Worker

在仓库根目录执行：

    npx --yes pnpm@10.24.0 install --frozen-lockfile
    npx --yes pnpm@10.24.0 run build
    npx --yes pnpm@10.24.0 -C worker install --frozen-lockfile
    npx --yes pnpm@10.24.0 -C worker exec tsc --noEmit
    npx --yes pnpm@10.24.0 -C worker exec wrangler deploy --config wrangler.prod.toml

前端构建会生成 out/，Wrangler 会将它作为同一个 Worker 的静态 Assets 上传。部署后，以下地址由同一个 Worker 提供：

    https://cattopic-worker.<你的子域名>.workers.dev/
    https://cattopic-worker.<你的子域名>.workers.dev/api/random

### 5. 初始化管理员账号

部署后打开 Worker 地址的 /admin/setup，创建第一个用户名和密码。密码以 PBKDF2 哈希保存到 D1，会话保存到 KV。

之后访问 /admin/login 登录。管理、上传、删除等受保护接口使用 HttpOnly 的 cattopic_session Cookie；/api/random 保持公开。

检查初始化状态：

    curl https://cattopic-worker.<你的子域名>.workers.dev/api/auth/session

### 6. GitHub Actions 自动部署

Deploy Worker workflow 会构建前端、检查 Worker 类型并部署 worker/wrangler.prod.toml。

GitHub 仓库只需要配置：

| Secret | 说明 |
|--------|------|
| CLOUDFLARE_API_TOKEN | 具有 Worker 部署权限的 Cloudflare API Token |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare Account ID |

不再需要 WRANGLER_TOML。推送前端、Worker、构建配置或 workflow 改动到 main，或在 Actions 页面手动运行。

## 升级已有部署

保留原有 D1 数据库和 R2 bucket，不要重新初始化数据库。

admin_users 表会在首次访问 setup 或 login 时自动创建。旧版 api_keys 表即使存在也不再使用。deletion_jobs 表也会在删除逻辑首次需要时自动创建，本次升级不需要手动迁移。

如果之前使用独立前端 + Worker：

1. 在 worker/wrangler.prod.toml 中填入原有资源绑定。
2. 如果继续使用旧前端域名，将它填入 CORS_ORIGINS。
3. 按上面的命令构建并部署单 Worker。
4. 验证 Worker 地址后，再移除旧的前端部署。

## 本地开发

本地开发仍然分别运行前端和 Worker。

终端 1：

    cd worker
    npx --yes pnpm@10.24.0 dev

终端 2（仓库根目录）：

    npx --yes pnpm@10.24.0 dev

Worker 地址为 http://localhost:8787，Next.js 地址为 http://localhost:3000。在仓库根目录创建 .env.local：

    NEXT_PUBLIC_API_URL=http://localhost:8787

生产环境不需要 NEXT_PUBLIC_API_URL，前端会使用同源 /api/* 请求。

## API 概览

公开接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/random | 随机获取图片 |
| GET | /api/auth/session | 获取初始化和会话状态 |
| POST | /api/auth/setup | 创建第一个管理员账号 |
| POST | /api/auth/login | 登录并创建会话 |
| POST | /api/auth/logout | 退出登录 |

受保护接口需要 cattopic_session Cookie，包括：

- POST /api/auth/account：修改管理员账号信息
- POST /api/upload/single：上传图片
- GET、PUT、DELETE /api/images/:id：查看、修改和删除图片
- GET /api/images：获取图片列表
- GET、POST、PUT、DELETE /api/tags：标签管理
- POST /api/tags/batch：批量标签操作
- GET、PUT /api/config：读取和修改配置
- GET /api/admin/stats：获取统计数据
- POST /api/cleanup：执行清理

详细请求和响应格式请参考 API.md。API.md 中部分 API Key 示例来自旧版本，当前管理端请使用网页登录会话。

## 文档

- [部署指南](../DEPLOYMENT.md)（中文）
- [部署指南](./DEPLOYMENT_EN.md)（英文）
- [API 文档](./API.md)（中文）
- [API 文档](./API_EN.md)（英文）

## 常见问题

### 401 未授权

打开 /admin/login 登录。如果提示需要初始化，先打开 /admin/setup。也可以访问 /api/auth/session 检查会话状态。

### 重置管理员

在远程 D1 中删除 admin_users 的唯一记录，然后重新打开 /admin/setup：

    npx --yes pnpm@10.24.0 -C worker exec wrangler d1 execute CattoPic-D1 --remote --command "DELETE FROM admin_users;"

### 图片上传后无法访问

检查 R2_PUBLIC_URL、R2 公共访问配置和自定义域名 DNS 是否已经生效。

## 许可证

[GPL-3.0](../LICENSE)
