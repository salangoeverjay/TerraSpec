// JSON requests to the session-protected API (LGU login and admin routes).
// Sends the session cookie and Laravel's XSRF token; on 401 the app returns to the public view.

export const UNAUTHENTICATED_EVENT = 'terraspec:unauthenticated';

function xsrfToken() {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

export async function apiJson(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-XSRF-TOKEN': xsrfToken() } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
    const firstError = json.errors ? Object.values(json.errors)[0]?.[0] : null;
    const error = new Error(firstError || json.message || json.error || 'Request failed.');
    error.status = res.status;
    error.data = json;
    throw error;
  }

  return json;
}
