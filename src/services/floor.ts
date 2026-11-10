/* Praise Kier */
import { getAccessToken } from "./auth";

export type FloorMessage = Record<string, unknown>;

export interface FloorConnection {
  send: (msg: FloorMessage) => void;
  close: () => void;
}

export function connectFloor(fileId: number, onMessage: (msg: FloorMessage) => void): FloorConnection {
  const token = getAccessToken();
  const base = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL;
  const url = `${base.replace(/^http/, "ws")}/floor/ws?token=${token}&fileId=${fileId}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  function connect() {
    if (closed) return;
    ws = new WebSocket(url);
    ws.onopen = () => {
      pingTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
      }, 15000);
    };
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      if (!closed) setTimeout(connect, 1000);
    };
    ws.onerror = () => {
      ws?.close();
    };
  }
  connect();

  return {
    send: (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
      ws?.close();
    },
  };
}