# CattoPic API Documentation

[中文](./API.md)

## Overview

The frontend and API are served by the same Cloudflare Worker. The production
base URL is the Worker domain, for example:

    https://cattopic-worker.<your-subdomain>.workers.dev

Responses are JSON. Successful responses normally contain success: true and
data; failures contain success: false and error.

## Authentication

The current release uses an administrator username/password and an HttpOnly
session cookie. API keys are no longer used.

Public authentication endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/session | Return setup and session state |
| POST | /api/auth/setup | Create the first administrator, once |
| POST | /api/auth/login | Log in and set the cattopic_session cookie |
| POST | /api/auth/logout | Clear the current session cookie |

Create the first administrator:

    curl -X POST https://your-worker.workers.dev/api/auth/setup \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"admin\",\"password\":\"your-password\"}"

Log in and save the cookie:

    curl -c cookies.txt -X POST https://your-worker.workers.dev/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"admin\",\"password\":\"your-password\"}"

Use the saved cookie for protected requests:

    curl -b cookies.txt https://your-worker.workers.dev/api/images

The browser frontend automatically sends the cookie with credentials: include.
Passwords must be at least 8 characters. Usernames are 3-50 characters and
may contain letters, digits, dots, underscores, and hyphens.

## Public Endpoint

### Random Image

    GET /api/random

Query parameters:

| Parameter | Values | Description |
|-----------|--------|-------------|
| tags | comma-separated | Include images with all specified tags |
| exclude | comma-separated | Exclude images with any specified tag |
| orientation | landscape, portrait, auto | Image direction; auto uses the client |
| format | original, webp, avif | Response format; auto-selected when omitted |

Example:

    curl "https://your-worker.workers.dev/api/random?tags=nature&format=webp"

## Protected Endpoints

Protected endpoints require the login cookie:

    Cookie: cattopic_session=<session-token>

### Upload

    POST /api/upload/single

The request uses multipart/form-data. The file field can be image or file;
tags is optional:

    curl -b cookies.txt -X POST \
      -F "image=@./photo.jpg" \
      -F "tags=nature,travel" \
      https://your-worker.workers.dev/api/upload/single

Each request uploads one image. The response contains the image ID, original,
WebP, and AVIF URLs, format, orientation, tags, and sizes.

### Images

    GET /api/images
    GET /api/images/:id

List query parameters:

| Parameter | Description |
|-----------|-------------|
| page | Page number, default 1 |
| limit | Items per page, maximum 100 |
| tag | Filter by tag |
| orientation | landscape or portrait |
| format | all, gif, webp, avif, or original |
| search | Search the original filename |
| sort | upload_time, name, or size |
| order | asc or desc |

Example:

    curl -b cookies.txt "https://your-worker.workers.dev/api/images?page=1&limit=20"

Update and delete:

    PUT /api/images/:id
    DELETE /api/images/:id
    POST /api/images/batch-delete

Update and batch-delete requests use JSON. R2 deletion failures are recorded
and retried by the scheduled cleanup job.

### Tags

    GET /api/tags
    POST /api/tags
    PUT /api/tags/:name
    DELETE /api/tags/:name
    POST /api/tags/batch

Tag names are normalized by the Worker. The batch endpoint applies tag
operations to multiple images.

### Account

    POST /api/auth/account

The current password is required to change the administrator username or
password:

    {
      "currentPassword": "old-password",
      "newUsername": "new-admin",
      "newPassword": "new-password"
    }

Changing the password invalidates existing sessions.

### System

    GET /api/config
    PUT /api/config
    GET /api/admin/stats
    POST /api/cleanup

These endpoints manage application settings, dashboard statistics, and cleanup
tasks. They require the administrator session.

## Image URLs

Image URLs use the R2_PUBLIC_URL configured for the Worker. R2 public access
or an R2 custom domain must be enabled for uploaded files to be reachable.

## Error Responses

    {
      "success": false,
      "error": "Unauthorized"
    }

Common status codes:

| Status | Meaning |
|--------|---------|
| 400 | Invalid request or file |
| 401 | Not logged in or invalid session |
| 403 | Origin is not in CORS_ORIGINS |
| 404 | Resource not found |
| 409 | Administrator or resource conflict |
| 413 | File exceeds the configured size limit |
| 500 | Worker or binding error |

## Legacy API-key Release

The old API-key authentication and /api/validate-api-key endpoint were removed.
The legacy api_keys table, if present, is not read. Do not configure an API
key as a Worker Secret; the current application uses D1 admin_users and KV
sessions.
