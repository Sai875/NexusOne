import { useAuthStore } from './auth-store';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

/** Same-origin via Next rewrites (next.config.mjs) which proxy to the gateway. */
const BASE = '';

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth, headers: customHeaders, ...rest } = options;
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...(rest.method && rest.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
    ...(customHeaders as Record<string, string> | undefined),
  };
  if (token && !skipAuth) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, { ...rest, headers });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired — please sign in again');
  }
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      // non-JSON error body
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown, options: ApiOptions = {}) =>
  request<T>(path, { ...options, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export function uploadFile<T>(path: string, file: File, extra?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  for (const [key, value] of Object.entries(extra ?? {})) form.append(key, value);
  const token = useAuthStore.getState().accessToken;
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  }).then(async (response) => {
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return (await response.json()) as T;
  });
}

export async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${BASE}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new ApiError(400, body.errors[0].message);
  return body.data as T;
}
