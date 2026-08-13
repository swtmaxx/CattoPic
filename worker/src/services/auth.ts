// Admin Authentication Service (username/password + KV-backed sessions)
// Replaces the old API-key based AuthService.

export const SESSION_COOKIE = "cattopic_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
const SESSION_PREFIX = "session:";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH_BYTES = 32;

interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2Derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    PBKDF2_HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

export class AuthService {
  constructor(
    private db: D1Database,
    private kv: KVNamespace,
    private isProduction: boolean = true
  ) {}

  private async ensureSchema(): Promise<void> {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();
  }

  // === Password hashing ===

  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2Derive(password, salt, PBKDF2_ITERATIONS);
    return `$pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
  }

  static async verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    // Format: $pbkdf2$<iterations>$<saltHex>$<hashHex>
    if (parts.length !== 5 || parts[1] !== "pbkdf2") return false;
    const iterations = parseInt(parts[2], 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    try {
      const salt = fromHex(parts[3]);
      const expected = fromHex(parts[4]);
      const actual = await pbkdf2Derive(password, salt, iterations);
      return constantTimeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // === Admin users ===

  async hasAdmin(): Promise<boolean> {
    await this.ensureSchema();
    const row = await this.db.prepare(
      "SELECT id FROM admin_users LIMIT 1"
    ).first<{ id: number }>();
    return row !== null;
  }

  async getAdmin(): Promise<AdminUser | null> {
    await this.ensureSchema();
    return this.db.prepare(
      "SELECT * FROM admin_users ORDER BY id ASC LIMIT 1"
    ).first<AdminUser>();
  }

  async createAdmin(username: string, password: string): Promise<void> {
    await this.ensureSchema();
    const now = new Date().toISOString();
    const passwordHash = await AuthService.hashPassword(password);
    await this.db.prepare(`
      INSERT OR IGNORE INTO admin_users (username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).bind(username, passwordHash, now, now).run();
  }

  async verifyAdmin(username: string, password: string): Promise<boolean> {
    const admin = await this.getAdmin();
    if (!admin) return false;
    if (admin.username !== username) return false;
    return AuthService.verifyPassword(password, admin.password_hash);
  }

  /**
   * Update admin credentials (username and/or password).
   * Returns false if the current password does not match.
   */
  async updateAdminCredentials(
    currentPassword: string,
    newUsername?: string,
    newPassword?: string
  ): Promise<boolean> {
    await this.ensureSchema();
    const admin = await this.getAdmin();
    if (!admin) return false;

    const passwordOk = await AuthService.verifyPassword(currentPassword, admin.password_hash);
    if (!passwordOk) return false;

    const statements: D1PreparedStatement[] = [];
    const now = new Date().toISOString();

    if (newUsername && newUsername !== admin.username) {
      statements.push(
        this.db.prepare(`UPDATE admin_users SET username = ?, updated_at = ? WHERE id = ?`)
          .bind(newUsername, now, admin.id)
      );
    }

    if (newPassword) {
      const passwordHash = await AuthService.hashPassword(newPassword);
      statements.push(
        this.db.prepare(`UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?`)
          .bind(passwordHash, now, admin.id)
      );
    }

    if (statements.length > 0) {
      await this.db.batch(statements);
    }

    return true;
  }

  // === Sessions (KV) ===

  async createSession(): Promise<{ token: string; cookie: string }> {
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(tokenBytes);
    await this.kv.put(`${SESSION_PREFIX}${token}`, JSON.stringify({ createdAt: new Date().toISOString() }), {
      expirationTtl: SESSION_TTL_SECONDS,
    });

    const sameSite = this.isProduction ? "None" : "Lax";
    const secure = this.isProduction ? "; Secure" : "";
    const cookie = `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
    return { token, cookie };
  }

  static extractSessionToken(request: Request): string | null {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  async validateSession(request: Request): Promise<boolean> {
    const token = AuthService.extractSessionToken(request);
    if (!token) return false;
    const value = await this.kv.get(`${SESSION_PREFIX}${token}`);
    return value !== null;
  }

  async destroySession(request: Request): Promise<void> {
    const token = AuthService.extractSessionToken(request);
    if (!token) return;
    await this.kv.delete(`${SESSION_PREFIX}${token}`);
  }

  static buildLogoutCookie(isProduction: boolean): string {
    const sameSite = isProduction ? "None" : "Lax";
    const secure = isProduction ? "; Secure" : "";
    return `${SESSION_COOKIE}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`;
  }
}
