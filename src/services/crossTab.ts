export interface SessionBroadcast {
  type: "rotated";
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  epoch: string | null;
}
export const LOGOUT_KEY = "lumon.logout";
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("lumon.session")
    : null;
const waiters = new Set<() => void>();
export function broadcastSession(message: SessionBroadcast) {
  channel?.postMessage(message);
}
export async function requestPeerSession() {
  if (!channel) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      waiters.delete(finish);
      resolve();
    };
    const timer = setTimeout(finish, 150);
    waiters.add(finish);
    channel.postMessage({ type: "request" });
  });
}
export function listenSession(
  receive: (message: SessionBroadcast) => void,
  logout: () => void,
  snapshot: () => SessionBroadcast | null,
) {
  if (channel)
    channel.onmessage = (event) => {
      const data: unknown = event.data;
      if (!data || typeof data !== "object" || !("type" in data)) return;
      if (data.type === "request") {
        const current = snapshot();
        if (current) broadcastSession(current);
      }
      if (data.type === "rotated") {
        receive(data as SessionBroadcast);
        waiters.forEach((finish) => finish());
      }
    };
  window.addEventListener("storage", (event) => {
    if (event.key === LOGOUT_KEY && event.newValue) logout();
  });
}
