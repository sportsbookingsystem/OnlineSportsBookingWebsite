/**
 * Thin HTTP client for the Express API.
 * Uses `import.meta.env.VITE_API_URL` as the API origin (no trailing slash).
 * In development, if VITE_API_URL is unset or points to localhost, requests use relative
 * `/api/...` so the Vite proxy works (including phones on the same Wi‑Fi).
 * For production builds, set VITE_API_URL to your deployed API (e.g. on Render).
 */
function apiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (import.meta.env.DEV) {
    try {
      const u = new URL(raw);
      const h = u.hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1') return '';
    } catch {
      return raw;
    }
  }
  return raw;
}

const BASE = apiBase();

function url(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return BASE ? `${BASE}${p}` : p;
}

const TOKEN_KEY = 'sports_booking_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, token = getStoredToken(), headers = {} } =
    options;

  const safeStatusMessage = (status) => {
    if (status === 401) return 'Please sign in to continue.';
    if (status === 403) return 'You do not have permission for this action.';
    if (status === 404) return 'Not found.';
    return `Request failed (${status})`;
  };

  const init = {
    method,
    headers: {
      ...headers,
    },
  };

  if (token) {
    init.headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url(path), init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    let message;
    const serverMsg =
      data?.message && typeof data.message === 'string' && !data.raw
        ? data.message.trim()
        : '';
    // Prefer API message for 503/500 too (e.g. SMTP not configured) — don't hide it behind a generic line.
    if (serverMsg && serverMsg.length > 0 && serverMsg.length <= 640) {
      message = serverMsg;
      if (import.meta.env.DEV && res.status >= 500) {
        console.error('[api]', method, path, res.status, data ?? text?.slice?.(0, 400));
      }
    } else if (data?.errors?.[0]?.msg) {
      message = data.errors[0].msg;
    } else if (res.status >= 500) {
      message =
        'Something went wrong on our end. Please try again in a moment.';
      if (import.meta.env.DEV) {
        console.error('[api]', method, path, res.status, data ?? text?.slice?.(0, 400));
      }
    } else {
      message = safeStatusMessage(res.status);
    }
    const err = new Error(message);
    err.status = res.status;
    err.details = data;
    throw err;
  }

  return data;
}
