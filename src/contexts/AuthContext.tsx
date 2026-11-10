/* Praise Kier */
import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { auth, session } from "../services/auth";
import type { Credentials, Me } from "../types/auth";
export interface AuthState {
  user: Me | null;
  loading: boolean;
  notice: string;
  signIn: (values: Credentials, register: boolean) => Promise<void>;
  reload: () => Promise<void>;
}
export const AuthContext = createContext<AuthState | null>(null);
let restoration: Promise<Me | null> | undefined;
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(
    () => sessionStorage.getItem("lumon.logout-warning") ?? "",
  );
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const id = ++revision.current;
    try {
      const me = await auth.restore();
      if (id === revision.current) setUser(me);
    } catch (e) {
      if (id === revision.current)
        setNotice(
          e instanceof Error ? e.message : "No se pudo cargar el perfil.",
        );
    } finally {
      if (id === revision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    sessionStorage.removeItem("lumon.logout-warning");
    let active = true;
    const id = ++revision.current;
    restoration ??= auth.restore().finally(() => {
      restoration = undefined;
    });
    void restoration
      .then((me) => {
        if (active && revision.current === id) setUser(me);
      })
      .catch((e) => {
        if (active)
          setNotice(
            e instanceof Error ? e.message : "No se pudo restaurar la sesión.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const unsubscribe = session.subscribe((changed) => {
      if (changed) {
        setUser(null);
        setLoading(true);
        void reload();
        return;
      }
      revision.current++;
      setUser(null);
      setNotice(session.reason);
    });
    const recover = () => {
      void reload();
    };
    window.addEventListener("lumon:connected", recover);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("lumon:connected", recover);
    };
  }, []);
  async function signIn(values: Credentials, register: boolean) {
    const id = ++revision.current;
    const me = await auth.signIn(values, register);
    if (id === revision.current) {
      setUser(me);
      setNotice("");
    }
  }
  return (
    <AuthContext.Provider value={{ user, loading, notice, signIn, reload }}>
      {loading ? <main role="status">Verificando tu sesión…</main> : children}
    </AuthContext.Provider>
  );
}
