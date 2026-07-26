export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
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
