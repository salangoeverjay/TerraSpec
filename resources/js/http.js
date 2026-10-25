// JSON requests to the session-protected API (LGU login and admin routes).
// Sends the session cookie and Laravel's XSRF token; on 401 the app returns to the public view.

export const UNAUTHENTICATED_EVENT = 'terraspec:unauthenticated';

function xsrfToken() {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

// Raw request with the session cookie and XSRF token (for non-JSON answers such as PDF downloads).
// Never throws on an error status; a 401 still signs the app out.
export async function apiRequest(url, { method = 'GET', body, accept = 'application/json' } = {}) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: accept,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-XSRF-TOKEN': xsrfToken() } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));

  return res;
}

// GET a JSON data route. Throws on any error status (with the server's message when it sends one),
// so a failed load reaches the screen's error state instead of showing as an empty list.
export async function getJson(url) {
  return apiJson(url);
}

export async function apiJson(url, { method = 'GET', body } = {}) {
  const res = await apiRequest(url, { method, body });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const firstError = json.errors ? Object.values(json.errors)[0]?.[0] : null;
    const error = new Error(firstError || json.message || json.error || 'Request failed.');
    error.status = res.status;
    error.data = json;
    throw error;
  }

  return json;
}
