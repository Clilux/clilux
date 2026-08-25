// Helper frontend para hashear contraseñas con PBKDF2-SHA256 (mismo formato que el backend).
// Usar antes de enviar portal_password al servidor para que nunca se almacene en texto plano.

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashPassword(plain) {
  if (!plain) return '';
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(plain), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$100000$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;
}

export function setSessionToken(token) {
  if (token) {
    sessionStorage.setItem('session_token', token);
    localStorage.setItem('clilux_session_token', token);
  } else {
    sessionStorage.removeItem('session_token');
    localStorage.removeItem('clilux_session_token');
  }
}

export function ensureSessionTokenFromStorage() {
  if (!sessionStorage.getItem('session_token')) {
    const t = localStorage.getItem('clilux_session_token');
    if (t) sessionStorage.setItem('session_token', t);
  }
}

export function clearSessionToken() {
  sessionStorage.removeItem('session_token');
  localStorage.removeItem('clilux_session_token');
}