import { parseMe } from "../utils/parseMe";
import {
  broadcastSession,
  listenSession,
  requestPeerSession,
  LOGOUT_KEY,
} from "./crossTab";
import { ApiError, http } from "../api/http";
import type { Credentials, Tokens, Me } from "../types/auth";
const KEY = "lumon.refresh";
const RETIRED = "lumon.refresh.retired";
let access: string | undefined;
let expiresAt = 0;
let currentRefresh: string | null = null;
let pending: Promise<string> | undefined;
let version = 0;
const listeners = new Set<(changed?: boolean) => void>();
let reason = "";
export const session = {
  subscribe(listener: (changed?: boolean) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get reason() {
    return reason;
  },
  clear(message = "", notify = true) {
    if (notify) localStorage.setItem(LOGOUT_KEY, crypto.randomUUID());
    version++;
    access = undefined;
    expiresAt = 0;
    currentRefresh = null;
    localStorage.removeItem(KEY);
    localStorage.removeItem(RETIRED);
    reason = message;
    listeners.forEach((fn) => fn());
  },
};
function store(tokens: Tokens) {
  if (
    typeof tokens.accessToken !== "string" ||
    typeof tokens.refreshToken !== "string" ||
    !Number.isFinite(tokens.expiresIn) ||
    tokens.expiresIn <= 0
  )
    throw new ApiError(
      0,
      "UNEXPECTED_RESPONSE",
      "La sesión recibida no es válida.",
    );
  localStorage.setItem(KEY, tokens.refreshToken);
  localStorage.removeItem(RETIRED);
  currentRefresh = tokens.refreshToken;
  access = tokens.accessToken;
  expiresAt = Date.now() + tokens.expiresIn * 1000;
  reason = "";
}
async function locked<T>(callback: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw new ApiError(
      0,
      "BROWSER_UNSUPPORTED",
      "Este navegador no permite coordinar sesiones con seguridad. Usa una versión reciente de Chrome, Edge, Firefox o Safari en localhost o HTTPS.",
    );
  return navigator.locks.request("lumon.session", callback);
}
export async function refresh(failedToken?: string): Promise<string> {
  if (access && access !== failedToken && Date.now() < expiresAt) return access;
  if (pending) return pending;
  pending = locked(async () => {
    if (localStorage.getItem(KEY) !== currentRefresh)
      await requestPeerSession();
    if (access && access !== failedToken && Date.now() < expiresAt)
      return access;
    const token = localStorage.getItem(KEY);
    if (!token)
      throw new ApiError(401, "NO_SESSION", "Inicia sesión para continuar.");
    const generation = version;
    const epoch = localStorage.getItem(LOGOUT_KEY);
    // Retire before sending: an ambiguous network failure must never reuse a consumed token.
    if (localStorage.getItem(RETIRED) === token) {
      session.clear(
        "No se puede reutilizar un token de renovación. Inicia sesión nuevamente.",
      );
      throw new ApiError(401, "REFRESH_UNCERTAIN", "Inicia sesión nuevamente.");
    }
    localStorage.setItem(RETIRED, token);
    try {
      const result = await http<Tokens>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
      });
      if (
        generation !== version ||
        epoch !== localStorage.getItem(LOGOUT_KEY)
      ) {
        await http<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: result.refreshToken }),
        });
        throw new ApiError(401, "SESSION_CHANGED", "La sesión cambió.");
      }
      store(result);
      broadcastSession({
        type: "rotated",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt,
        epoch: localStorage.getItem(LOGOUT_KEY),
      });
      return result.accessToken;
    } catch (error) {
      session.clear(
        error instanceof ApiError && error.code === "REFRESH_REUSED"
          ? "La sesión se revocó por reutilización del token. Inicia sesión nuevamente."
          : "No se pudo recuperar la sesión. Inicia sesión nuevamente.",
      );
      throw error;
    }
  });
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  options.signal?.throwIfAborted();
  const token =
    access && Date.now() < expiresAt ? access : await refresh(access);
  try {
    return await http<T>(path, options, token);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      error.code === "TOKEN_EXPIRED"
    ) {
      const next = await refresh(token);
      options.signal?.throwIfAborted();
      try {
        return await http<T>(path, options, next);
      } catch (retryError) {
        invalidate(retryError);
        throw retryError;
      }
    }
    invalidate(error);
    throw error;
  }
}
function invalidate(error: unknown) {
  if (
    error instanceof ApiError &&
    [
      "TOKEN_INVALID",
      "SESSION_REVOKED",
      "REFRESH_REUSED",
      "TOKEN_EXPIRED",
    ].includes(error.code)
  )
    session.clear("Tu sesión ya no es válida. Inicia sesión nuevamente.");
}
export const auth = {
  async signIn(values: Credentials, register: boolean) {
    await locked(async () => {
      const generation = version;
      const tokens = await http<Tokens>(
        register ? "/auth/register" : "/auth/login",
        { method: "POST", body: JSON.stringify(values) },
      );
      if (version !== generation)
        throw new Error("La sesión cambió. Intenta nuevamente.");
      store(tokens);
      broadcastSession({
        type: "rotated",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        epoch: localStorage.getItem(LOGOUT_KEY),
      });
    });
    return parseMe(await request<unknown>("/auth/me"));
  },
  async restore() {
    if (!localStorage.getItem(KEY) && !access) return null;
    await refresh();
    return parseMe(await request<unknown>("/auth/me"));
  },
  async logout() {
    const stored = localStorage.getItem(KEY);
    const token = stored !== localStorage.getItem(RETIRED) ? stored : null;
    localStorage.setItem(LOGOUT_KEY, crypto.randomUUID());
    session.clear("Has cerrado sesión.");
    if (token)
      await locked(() =>
        http<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: token }),
        }),
      );
  },
  async me() {
    return parseMe(await request<unknown>("/auth/me"));
  },
};

listenSession(
  (message) => {
    if (
      message.epoch !== localStorage.getItem(LOGOUT_KEY) ||
      message.refreshToken !== localStorage.getItem(KEY) ||
      typeof message.accessToken !== "string" ||
      !Number.isFinite(message.expiresAt)
    )
      return;
    const changed =
      currentRefresh !== null && currentRefresh !== message.refreshToken;
    access = message.accessToken;
    currentRefresh = message.refreshToken;
    expiresAt = message.expiresAt;
    if (changed) listeners.forEach((fn) => fn(true));
  },
  () => session.clear("La sesión se cerró desde otra pestaña.", false),
  () =>
    access && currentRefresh && Date.now() < expiresAt
      ? {
          type: "rotated",
          accessToken: access,
          refreshToken: currentRefresh,
          expiresAt,
          epoch: localStorage.getItem(LOGOUT_KEY),
        }
      : null,
);
