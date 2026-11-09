/* Praise Kier */
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../services/auth';
import type { Credentials, Me } from '../types/auth';
export interface AuthState { user: Me | null; loading: boolean; notice: string; signIn: (values: Credentials, register: boolean) => Promise<void>; reload: () => Promise<void> }
export const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null); const [loading, setLoading] = useState(false); const [notice] = useState('');
  const reload = useCallback(async () => {}, []);
  useEffect(() => { void reload(); }, [reload]);
  async function signIn(values: Credentials, register: boolean) { setLoading(true); try { setUser(await auth.signIn(values, register)); } finally { setLoading(false); } }
  return <AuthContext.Provider value={{user, loading, notice, signIn, reload}}>{children}</AuthContext.Provider>;
}
