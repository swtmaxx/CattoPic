# CattoPic API 文档

[English](./API_EN.md)

## 概述

CattoPic 的前端和 API 由同一个 Cloudflare Worker 提供。生产环境的 Base URL 是 Worker 域名，例如：

    https://cattopic-worker.<你的子域名>.workers.dev

所有接口返回 JSON。成功响应通常包含 success: true 和 data；失败响应包含 success: false 和 error。

## 认证

当前版本使用管理员用户名/密码和 HttpOnly 会话 Cookie，不再使用 API Key。

公开认证接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/auth/session | 查询是否需要初始化及当前会话状态 |
| POST | /api/auth/setup | 创建第一个管理员账号，仅可成功一次 |
| POST | /api/auth/login | 登录并设置 cattopic_session Cookie |
| POST | /api/auth/logout | 清除当前会话 Cookie |

初始化请求示例：

    curl -X POST https://your-worker.workers.dev/api/auth/setup \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"admin\",\"password\":\"your-password\"}"

登录并保存 Cookie：

    curl -c cookies.txt -X POST https://your-worker.workers.dev/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"admin\",\"password\":\"your-password\"}"

之后在受保护请求中携带 Cookie：

    curl -b cookies.txt https://your-worker.workers.dev/api/images

浏览器前端会自动使用 credentials: include 携带会话。密码至少 8 位；用户名为 3-50 位字母、数字、点、下划线或短横线。

## 公开接口

### 随机图片

    GET /api/random

查询参数：

| 参数 | 可选值 | 说明 |
|------|--------|------|
| tags | 逗号分隔 | 只返回包含所有指定标签的图片 |
| exclude | 逗号分隔 | 排除包含任一指定标签的图片 |
| orientation | landscape、portrait、auto | 图片方向，auto 根据客户端判断 |
| format | original、webp、avif | 返回格式，不指定时自动选择 |

示例：

    curl "https://your-worker.workers.dev/api/random?tags=nature&format=webp"

## 受保护接口

以下接口都需要登录 Cookie：

    Cookie: cattopic_session=<session-token>

### 上传图片

    POST /api/upload/single

请求类型为 multipart/form-data。文件字段使用 image 或 file，可选 tags 字段：

    curl -b cookies.txt -X POST \
      -F "image=@./photo.jpg" \
      -F "tags=nature,travel" \
      https://your-worker.workers.dev/api/upload/single

每次请求上传一张图片。返回结果包含图片 ID、原图 URL、WebP URL、AVIF URL、格式、方向、标签和文件大小。

### 图片列表和详情

    GET /api/images
    GET /api/images/:id

列表查询参数：

| 参数 | 说明 |
|------|------|
| page | 页码，默认 1 |
| limit | 每页数量，最大 100 |
| tag | 按标签筛选 |
| orientation | landscape 或 portrait |
| format | all、gif、webp、avif、original |
| search | 按原文件名搜索 |
| sort | upload_time、name 或 size |
| order | asc 或 desc |

示例：

    curl -b cookies.txt "https://your-worker.workers.dev/api/images?page=1&limit=20&format=all"

### 修改和删除图片

    PUT /api/images/:id
    DELETE /api/images/:id
    POST /api/images/batch-delete

修改请求使用 JSON。批量删除请求也使用 JSON，传入要删除的图片 ID 列表。删除会清理 R2 文件；失败任务会由 Cron 重试。

### 标签

    GET /api/tags
    POST /api/tags
    PUT /api/tags/:name
    DELETE /api/tags/:name
    POST /api/tags/batch

标签名称会经过规范化处理。批量接口用于给多张图片增加、移除或替换标签。

### 账号

    POST /api/auth/account

使用当前密码验证后，可以修改用户名或密码。修改密码后已有会话会失效，需要重新登录。

请求字段：

    {
      "currentPassword": "old-password",
      "newUsername": "new-admin",
      "newPassword": "new-password"
    }

### 系统配置和统计

    GET /api/config
    PUT /api/config
    GET /api/admin/stats
    POST /api/cleanup

这些接口用于管理后台配置、统计数据和清理任务，均需要管理员会话。

## 图片 URL

API 返回的图片 URL 使用 Worker 配置中的 R2_PUBLIC_URL。请确认 R2 bucket 已开启公开访问或绑定了 R2 自定义域名。

## 错误响应

    {
      "success": false,
      "error": "Unauthorized"
    }

常见状态码：

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数或文件无效 |
| 401 | 未登录或会话无效 |
| 403 | 来源不在 CORS_ORIGINS 白名单 |
| 404 | 资源不存在 |
| 409 | 管理员已存在或资源冲突 |
| 413 | 文件超过后台配置的大小限制 |
| 500 | Worker 或绑定资源发生错误 |

## 旧版本说明

旧版 API Key 和 /api/validate-api-key 接口已经移除。旧数据库中的 api_keys 表不会被读取，也不需要配置 API Key Worker Secret。当前管理端使用 D1 admin_users 表和 KV 会话。
