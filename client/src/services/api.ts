import { useAuth } from '../composables/useAuth';

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const { token, clearSession } = useAuth();

  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (token.value) {
    headers.set('Authorization', `Bearer ${token.value}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && token.value) {
      clearSession();
      throw new Error('Session expired. Please log in again.');
    }
    const errorData = await response.json().catch(() => ({}));
    const message = Array.isArray(errorData.message) 
      ? errorData.message.join(', ') 
      : errorData.message || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const json = await response.json();
  // NestJS global interceptor unwrapping: { status: boolean, data: T, meta?: any }
  if (json.status !== undefined && 'data' in json) {
    if (!json.status) {
      throw new Error(json.message || 'API request failed');
    }
    if ('meta' in json) {
      return { data: json.data, meta: json.meta } as unknown as T;
    }
    return json.data as T;
  }

  return json as T;
}
