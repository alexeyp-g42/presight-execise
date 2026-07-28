export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== '') usp.set(k, v);
  const url = usp.toString() ? `${path}?${usp}` : path;
  const res = await fetch(url);
  if (!res.ok) {
    let code = 'http_error';
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) { code = body.error.code; message = body.error.message; }
    } catch { /* ignore */ }
    throw new ApiRequestError(res.status, code, message);
  }
  return (await res.json()) as T;
}
