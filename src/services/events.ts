/* Praise Kier */
import { getAccessToken } from "./auth";

export type LumonEvent = {
  id?: number;
  type: string;
  data: unknown;
};

export function connectEvents(onEvent: (e: LumonEvent) => void): () => void {
  const token = getAccessToken();
  if (!token) return () => {};
  const es = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/events/stream?token=${token}`);
  const handler = (ev: MessageEvent) => {
    let data: unknown = ev.data;
    try {
      data = JSON.parse(ev.data);
    } catch {
      /* keep raw */
    }
    onEvent({ id: ev.lastEventId ? Number(ev.lastEventId) : undefined, type: ev.type, data });
  };
  es.onmessage = handler;
  // named events
  ["refiner.updated", "refinement.created", "file.completed", "contingency.activated", "session.revoked", "stream.reset", "stream.superseded"].forEach((name) => {
    es.addEventListener(name, handler as EventListener);
  });
  es.onerror = () => {
    // browser auto-reconnects
  };
  return () => es.close();
}