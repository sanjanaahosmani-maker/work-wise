export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  authToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    success?: boolean;
    error?: string;
  };

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}
