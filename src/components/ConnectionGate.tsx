/* Praise Kier */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, http } from '../api/http';
export function ConnectionGate({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false); const [attempt, setAttempt] = useState(0); const [retry, setRetry] = useState(0); const [message, setMessage] = useState('');
  const failed = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let active = true; let failures = 0;
    async function check() {
      try { await http('/meta/health', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }); if (!active) return; setConnected(true); failed.current = false; failures = 0; setMessage(''); timer = setTimeout(check, 30000); }
      catch (e) { if (!active) return; setConnected(false); failed.current = true; setMessage(e instanceof ApiError ? e.message : 'El servicio tarda en responder.'); setAttempt(++failures); timer = setTimeout(check, Math.min(30000, 1000 * 2 ** Math.min(failures - 1, 5))); }
    }
    void check(); const offline = () => { setConnected(false); }; window.addEventListener('offline', offline);
    return () => { active = false; controller.abort(); clearTimeout(timer); window.removeEventListener('offline', offline); };
  }, [retry]);
  return <>{!connected && <main className="flex min-h-screen flex-col items-center justify-center text-center" role="status"><p className="mb-8 text-sm tracking-widest">LUMON INDUSTRIES</p><h1 className="text-3xl">Conectando con Lumon…</h1><p className="my-4">{message || 'Verificando disponibilidad del servicio.'}</p>{attempt > 0 && <p>Intento {attempt}. Reintentaremos automáticamente.</p>}<button className="mt-6 rounded bg-lumon px-6 py-3 text-white" onClick={() => setRetry(n => n + 1)}>Reintentar</button></main>}<div hidden={!connected}>{children}</div></>;
}
