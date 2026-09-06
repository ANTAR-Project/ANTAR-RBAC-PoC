/**
 * ANTAR Unified API Client
 */

const BASE_URL = ''; // Proxied via Vite to http://localhost:8085

export function getSession() {
  try {
    const raw = sessionStorage.getItem('antar_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(sessionData) {
  if (!sessionData) {
    sessionStorage.removeItem('antar_session');
  } else {
    sessionStorage.setItem('antar_session', JSON.stringify(sessionData));
  }
}

export async function apiRequest(endpoint, options = {}) {
  const session = getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (session?.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
