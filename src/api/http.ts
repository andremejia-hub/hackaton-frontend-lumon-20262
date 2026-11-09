export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: unknown = null,
  ) {
    super(message);
  }
}
export const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
export async function http<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  if (!apiBase)
    throw new ApiError(
      0,
      "CONFIGURATION",
      "Configura VITE_API_BASE_URL en .env.",
    );
  const headers = new Headers(options.headers);
  headers.set("X-Lumon-Build", __BUILD__);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (path !== "/meta/health")
      window.dispatchEvent(new Event("lumon:connection-lost"));
    throw new ApiError(
      0,
      "NETWORK",
      "No se pudo conectar con Lumon. Comprueba tu conexión.",
    );
  }
  if (response.status === 204) return undefined as T;
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "UNEXPECTED_RESPONSE",
      "El servidor devolvió una respuesta inesperada.",
    );
  }
  if (!response.ok) {
    if (response.status >= 500 && path !== "/meta/health")
      window.dispatchEvent(new Event("lumon:connection-lost"));
    const body = data as {
      error?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      response.status,
      body?.error ?? "HTTP_ERROR",
      body?.message ?? "No se pudo completar la solicitud.",
      body?.details,
    );
  }
  return data as T;
}
