export interface SessionBroadcast { type: 'rotated'; accessToken: string; refreshToken: string; expiresAt: number; epoch: string | null }
export const LOGOUT_KEY = 'lumon.logout';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lumon.session') : null;
export function broadcastSession(message: SessionBroadcast) { channel?.postMessage(message); }
export function listenSession(receive: (message: SessionBroadcast) => void, logout: () => void) {
  if (channel) channel.onmessage = event => { const data: unknown = event.data; if (data && typeof data === 'object' && 'type' in data && data.type === 'rotated') receive(data as SessionBroadcast); };
  window.addEventListener('storage', event => { if (event.key === LOGOUT_KEY && event.newValue) logout(); });
}
