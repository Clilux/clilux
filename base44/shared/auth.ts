// Utilidades de autenticación compartidas entre funciones backend.
// - Hashing de contraseñas: PBKDF2-SHA256 (100k iteraciones) con sal aleatoria.
//   Formato almacenado: `pbkdf2$100000$<b64url(salt)>$<b64url(hash)>`.
//   verifyPassword acepta también contraseñas legacy en texto plano (migración).
// - Tokens de sesión: HMAC-SHA256 con expiración, firmados con SESSION_SIGNING_KEY
//   (fallback a BASE44_SERVICE_TOKEN). El frontend los envía como `session_token`.
// - Limitador de intentos por clave (en memoria, mejor esfuerzo) contra fuerza bruta.

const enc = new TextEncoder();

function b64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function signingKey(): Uint8Array {
  const raw = Deno.env.get('SESSION_SIGNING_KEY') || Deno.env.get('BASE44_SERVICE_TOKEN') || 'clilux-session-fallback';
  return enc.encode(raw);
}

// ── Password hashing ───────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(plain), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$100000$${b64url(salt)}$${b64url(bits)}`;
}

export function isHashed(stored: string): boolean {
  return !!stored && stored.startsWith('pbkdf2$');
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored || !plain) return false;
  const parts = stored.split('$');
  if (parts.length === 4 && parts[0] === 'pbkdf2') {
    try {
      const iter = Number(parts[1]);
      const salt = b64urlDecode(parts[2]);
      const expected = b64urlDecode(parts[3]);
      const key = await crypto.subtle.importKey('raw', enc.encode(plain), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256);
      const got = new Uint8Array(bits);
      if (got.length !== expected.length) return false;
      let diff = 0;
      for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
      return diff === 0;
    } catch {
      return false;
    }
  }
  // Legacy en texto plano (se migrará a hash tras un login correcto)
  return plain === stored;
}

// ── Session token (HMAC-SHA256) ────────────────────────────────
export async function issueSessionToken(payload: { email: string; id?: string; kind: string }): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })));
  const key = await crypto.subtle.importKey('raw', signingKey(), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySessionToken(token: string): Promise<any | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const key = await crypto.subtle.importKey('raw', signingKey(), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Rate limiter (en memoria, mejor esfuerzo) ───────────────────
const _rl = new Map<string, { count: number; first: number; lockedUntil: number }>();

export function rateLimitStatus(key: string): { locked: boolean; retryAfterSec?: number } {
  const e = _rl.get(key);
  const now = Date.now();
  if (e && e.lockedUntil > now) return { locked: true, retryAfterSec: Math.ceil((e.lockedUntil - now) / 1000) };
  return { locked: false };
}

export function registerFailure(key: string, max = 5, windowMs = 15 * 60 * 1000, lockMs = 15 * 60 * 1000): void {
  const now = Date.now();
  let e = _rl.get(key);
  if (!e || now - e.first > windowMs) e = { count: 0, first: now, lockedUntil: 0 };
  e.count++;
  if (e.count >= max) e.lockedUntil = now + lockMs;
  _rl.set(key, e);
}

export function registerSuccess(key: string): void {
  _rl.delete(key);
}