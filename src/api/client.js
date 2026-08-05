const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const getToken = () => '';

let refreshPromise = null;

async function refreshToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    await res.json().catch(() => ({}));
    return true;
  } catch {
    return false;
  }
}

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include', headers });

  // Auto-refresh on 401
  if (response.status === 401) {
    if (!refreshPromise) refreshPromise = refreshToken();
    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include', headers });
    } else {
      // Refresh failed — force logout
      localStorage.removeItem('nova_user');
      window.dispatchEvent(new Event('nova:logout'));
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}
