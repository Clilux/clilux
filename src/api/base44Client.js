import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Inyecta el token de sesión (técnico/cliente) en las funciones que requieren
// autenticación, sin necesidad de modificar cada punto de llamada.
const _origInvoke = base44.functions.invoke.bind(base44.functions);
const SECURE_FUNCS = new Set(['getCompanyData', 'buzonNotificaciones', 'incidentNotifications']);
base44.functions.invoke = async function (functionName, data) {
  if (SECURE_FUNCS.has(functionName) && data && typeof data === 'object' && !(data instanceof FormData)) {
    const sessionToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('session_token') : null;
    if (sessionToken) data = { ...data, session_token: sessionToken };
  }
  return _origInvoke(functionName, data);
};