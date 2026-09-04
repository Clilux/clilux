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
// Si el token ha caducado, limpia la sesión y devuelve al menú de acceso.
const _origInvoke = base44.functions.invoke.bind(base44.functions);
const SECURE_FUNCS = new Set(['getCompanyData', 'buzonNotificaciones', 'incidentNotifications', 'uploadArchivo', 'importDatosEmpresa']);

const _isExpiredSession = (obj) => {
  const msg = String(obj?.response?.data?.error || obj?.data?.error || obj?.message || obj?.error || '');
  const status = obj?.response?.status || obj?.status;
  return msg.includes('No autenticado') || status === 401;
};

const _handleExpiredTechSession = () => {
  if (typeof sessionStorage === 'undefined' || !sessionStorage.getItem('technician_email')) return false;
  sessionStorage.removeItem('technician_email');
  sessionStorage.removeItem('technician_id');
  sessionStorage.removeItem('technician_name');
  sessionStorage.removeItem('session_token');
  localStorage.removeItem('clilux_tech_email');
  localStorage.removeItem('clilux_session_token');
  window.location.href = '/MenuInicio';
  return true;
};

base44.functions.invoke = async function (functionName, data) {
  const isSecure = SECURE_FUNCS.has(functionName);
  if (isSecure && data && typeof data === 'object' && !(data instanceof FormData)) {
    const sessionToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('session_token') : null;
    if (sessionToken) data = { ...data, session_token: sessionToken };
  }
  let res;
  try {
    res = await _origInvoke(functionName, data);
  } catch (err) {
    if (isSecure && _isExpiredSession(err) && _handleExpiredTechSession()) {
      return { data: { error: 'Sesión caducada. Vuelve a iniciar sesión.' } };
    }
    throw err;
  }
  if (isSecure && _isExpiredSession(res) && _handleExpiredTechSession()) {
    return { data: { error: 'Sesión caducada. Vuelve a iniciar sesión.' } };
  }
  return res;
};