/* Praise Kier */
import { useEffect, useState } from "react";
import { http } from "../api/http";
import { getIntegrationsStatus } from "../services/integrations";
import { getClearanceStatus, runClearanceCheck, overrideClearance } from "../services/clearance";

export function StatusPage() {
  const [health, setHealth] = useState<string>("verificando…");
  const [integrations, setIntegrations] = useState<unknown>(null);
  const [clearance, setClearance] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      await http("/meta/health");
      setHealth("ok");
    } catch {
      setHealth("sin respuesta");
    }
    try {
      setIntegrations(await getIntegrationsStatus());
    } catch (e) {
      setIntegrations({ error: e instanceof Error ? e.message : "error" });
    }
    try {
      setClearance(await getClearanceStatus());
    } catch (e) {
      setClearance({ error: e instanceof Error ? e.message : "error" });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCheck() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await runClearanceCheck();
      setMessage(JSON.stringify(res));
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await overrideClearance();
      setMessage(JSON.stringify(res));
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Estado del sistema</h1>
      <section className="mb-4 rounded border p-3">
        <h2 className="font-semibold">Build</h2>
        <p>latest</p>
      </section>
      <section className="mb-4 rounded border p-3">
        <h2 className="font-semibold">API</h2>
        <p>{health}</p>
      </section>
      <section className="mb-4 rounded border p-3">
        <h2 className="font-semibold">Integraciones</h2>
        <pre className="overflow-auto text-xs">{JSON.stringify(integrations, null, 2)}</pre>
      </section>
      <section className="mb-4 rounded border p-3">
        <h2 className="font-semibold">Clearance</h2>
        <pre className="overflow-auto text-xs">{JSON.stringify(clearance, null, 2)}</pre>
        <div className="mt-2 flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
            disabled={loading}
            onClick={handleCheck}
          >
            Abrir el Piso de Pruebas
          </button>
          <button
            className="rounded border px-3 py-1 disabled:opacity-50"
            disabled={loading}
            onClick={handleOverride}
          >
            Override (ensayo)
          </button>
        </div>
        {message && <p className="mt-2 text-sm">{message}</p>}
      </section>
    </main>
  );
}

export default StatusPage;