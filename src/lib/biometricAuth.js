// Acceso biométrico (huella dactilar / Face ID) vía WebAuthn (platform authenticator).
// Modelo: la credencial se guarda localmente y se usa como barrera de desbloqueo
// antes de restaurar la sesión persistente del técnico. Solo en dispositivos con
// sensor biométrico y contexto seguro (https).

const STORAGE_KEY = 'clilux_biometric';

function bufToArr(buf) {
  return Array.from(new Uint8Array(buf));
}

export async function isBiometricAvailable() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

export function getBiometricConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isBiometricEnabled() {
  const cfg = getBiometricConfig();
  return !!(cfg && cfg.enabled && cfg.email && Array.isArray(cfg.credentialId) && cfg.credentialId.length);
}

export function getBiometricEmail() {
  return getBiometricConfig()?.email || null;
}

export function clearBiometric() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function registerBiometric(email) {
  if (!window.PublicKeyCredential) throw new Error('Tu dispositivo no soporta acceso biométrico');
  const available = await isBiometricAvailable();
  if (!available) throw new Error('No se ha encontrado sensor biométrico en este dispositivo');

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);

  const publicKey = {
    challenge,
    rp: { name: 'Clilux' },
    user: { id: userId, name: email, displayName: email },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    attestation: 'none',
  };

  const cred = await navigator.credentials.create({ publicKey });
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    enabled: true,
    email,
    credentialId: bufToArr(cred.rawId),
  }));
  return true;
}

export async function authenticateBiometric() {
  const cfg = getBiometricConfig();
  if (!cfg || !cfg.credentialId) throw new Error('Biometría no configurada');
  if (!window.PublicKeyCredential) throw new Error('Tu dispositivo no soporta acceso biométrico');

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const publicKey = {
    challenge,
    timeout: 60000,
    userVerification: 'required',
    allowCredentials: [{ type: 'public-key', id: new Uint8Array(cfg.credentialId) }],
  };

  await navigator.credentials.get({ publicKey });
  return true;
}