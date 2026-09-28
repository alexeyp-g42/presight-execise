export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const getJson = async <T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${path}?${params}`, { signal, headers: { Accept: "application/json" } });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? `Request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
};
