import type { Context } from 'hono';
import type { Env } from '../types';
import { AuthService } from '../services/auth';
import { successResponse, errorResponse } from '../utils/response';

const USERNAME_MAX = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length < 3 || value.length > USERNAME_MAX) return null;
  // Allow letters, digits, underscore, hyphen, dot
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) return null;
  return value;
}

function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.length < PASSWORD_MIN || raw.length > PASSWORD_MAX) return null;
  return raw;
}

function getIsProduction(c: Context<{ Bindings: Env }>): boolean {
  return c.env.ENVIRONMENT !== 'development';
}

function authService(c: Context<{ Bindings: Env }>): AuthService {
  return new AuthService(c.env.DB, c.env.CACHE_KV, getIsProduction(c));
}

// POST /api/auth/setup - Create the first admin account (one-time)
export async function setupHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const service = authService(c);
    if (await service.hasAdmin()) {
      return errorResponse('管理员账号已存在', 409);
    }

    const body = await c.req.json().catch(() => null);
    const username = sanitizeUsername(body?.username);
    const password = validatePassword(body?.password);

    if (!username || !password) {
      return errorResponse('用户名需 3-50 位（字母/数字/._-），密码至少 8 位');
    }

    await service.createAdmin(username, password);
    return successResponse({ message: '管理员账号创建成功' });
  } catch (err) {
    console.error('Setup error:', err);
    return errorResponse('初始化失败');
  }
}

// POST /api/auth/login
export async function loginHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const service = authService(c);
    if (!(await service.hasAdmin())) {
      return errorResponse('请先初始化管理员账号', 403);
    }

    const body = await c.req.json().catch(() => null);
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const ok = await service.verifyAdmin(username, password);
    if (!ok) {
      return errorResponse('用户名或密码错误', 401);
    }

    const { cookie } = await service.createSession();
    return new Response(JSON.stringify({ success: true, message: '登录成功' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('登录失败');
  }
}

// POST /api/auth/logout
export async function logoutHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const service = authService(c);
    await service.destroySession(c.req.raw);
    const cookie = AuthService.buildLogoutCookie(getIsProduction(c));
    return new Response(JSON.stringify({ success: true, message: '已退出登录' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    console.error('Logout error:', err);
    return errorResponse('退出失败');
  }
}

// GET /api/auth/session - Session status + whether setup is needed
export async function sessionHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const service = authService(c);
    const needsSetup = !(await service.hasAdmin());
    const authenticated = !needsSetup && await service.validateSession(c.req.raw);
    return successResponse({ needsSetup, authenticated });
  } catch (err) {
    console.error('Session check error:', err);
    return errorResponse('会话检查失败');
  }
}


// POST /api/auth/account - Update admin username and/or password (requires login)
export async function changeAccountHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const service = authService(c);
    if (!(await service.hasAdmin())) {
      return errorResponse('请先初始化管理员账号', 403);
    }

    const body = await c.req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    if (!currentPassword) {
      return errorResponse('请输入当前密码');
    }

    let newUsername: string | undefined;
    if (body?.newUsername !== undefined && body.newUsername !== null && String(body.newUsername).trim() !== '') {
      const username = sanitizeUsername(body.newUsername);
      if (!username) {
        return errorResponse('新用户名需 3-50 位（字母/数字/._-）');
      }
      newUsername = username;
    }

    let newPassword: string | undefined;
    if (body?.newPassword !== undefined && body.newPassword !== null && String(body.newPassword) !== '') {
      const password = validatePassword(body.newPassword);
      if (!password) {
        return errorResponse('新密码至少 8 位');
      }
      newPassword = password;
    }

    if (!newUsername && !newPassword) {
      return errorResponse('请提供要修改的用户名或密码');
    }

    const ok = await service.updateAdminCredentials(currentPassword, newUsername, newPassword);
    if (!ok) {
      return errorResponse('当前密码错误', 401);
    }

    // The credential version changes on update, so the current cookie and all other sessions are invalidated.
    const cookie = AuthService.buildLogoutCookie(getIsProduction(c));
    return new Response(JSON.stringify({ success: true, message: '账号信息已更新' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    console.error('Change account error:', err);
    return errorResponse('修改账号失败');
  }
}
