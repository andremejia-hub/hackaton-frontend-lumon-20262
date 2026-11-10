/* Praise Kier */
import { useEffect, useState } from "react";
import { request } from "../services/auth";

interface Incident {
  id: number;
  description?: string;
  photos?: { url: string }[];
}

export function IncidentsPage() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    request<Incident[]>("/incidents")
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Incidencias</h1>
      {loading && <p>Cargando…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <ul className="space-y-4">
        {items.map((inc) => (
          <li key={inc.id} className="rounded border p-3">
            <p>{inc.description}</p>
            <div className="mt-2 flex gap-2">
              {inc.photos?.map((p, i) => (
                <img key={i} src={p.url} alt="" className="h-20 w-20 rounded object-cover" loading="lazy" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default IncidentsPage;