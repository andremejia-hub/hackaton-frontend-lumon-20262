/* Praise Kier */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { connectEvents, type LumonEvent } from "../services/events";
import { getAccessToken } from "../services/auth";

interface EventsState {
  connected: boolean;
  lastEvent: LumonEvent | null;
}

const EventsContext = createContext<EventsState>({ connected: false, lastEvent: null });

export function EventsProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<LumonEvent | null>(null);
  const seen = useRef(new Set<number>());

  const handle = useCallback((e: LumonEvent) => {
    if (e.id != null) {
      if (seen.current.has(e.id)) return;
      seen.current.add(e.id);
    }
    setLastEvent(e);
    if (e.type === "session.revoked") {
      // handled by auth layer; here just notify
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const cleanup = connectEvents(handle);
    setConnected(true);
    return () => {
      cleanup();
      setConnected(false);
    };
  }, [handle]);

  return <EventsContext.Provider value={{ connected, lastEvent }}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  return useContext(EventsContext);
}