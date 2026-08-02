import type { ApiErrorBody, ApiErrorCode } from '@contract';

export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  } catch (cause) {
    // Aborts are rethrown untouched. Every keystroke cancels the in-flight
    // request, and turning those into visible errors would flash the error
    // state while someone is still typing.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiRequestError('INTERNAL', 'The server is unreachable. Check your connection.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(
      body?.error.code ?? 'INTERNAL',
      body?.error.message ?? `The server returned ${response.status}.`,
    );
  }

  return (await response.json()) as T;
}
