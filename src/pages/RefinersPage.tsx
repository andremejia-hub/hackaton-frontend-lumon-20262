/* Praise Kier */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listDepartments, listRefiners, type Department, type Refiner } from "../services/refiners";

export function RefinersPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(params.get("page") || "1");
  const pageSize = Number(params.get("pageSize") || "20");
  const departmentId = params.get("departmentId") ? Number(params.get("departmentId")) : undefined;
  const q = params.get("q") || "";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [data, setData] = useState<{ items: Refiner[]; total: number; page: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listRefiners({ page, pageSize, departmentId, q: q || undefined })
      .then((r) => {
        if (!controller.signal.aborted) setData(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, pageSize, departmentId, q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) {
        const next = new URLSearchParams(params);
        if (searchInput) next.set("q", searchInput);
        else next.delete("q");
        next.set("page", "1");
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, q, params, setParams]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next, { replace: true });
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Expedientes</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="rounded border px-3 py-2"
          placeholder="Buscar..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="rounded border px-3 py-2"
          value={departmentId ?? ""}
          onChange={(e) => updateParam("departmentId", e.target.value)}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {loading && <p>Cargando…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <>
          <ul className="divide-y rounded border">
            {data.items.map((r) => (
              <li
                key={r.id}
                className="flex cursor-pointer items-center gap-3 p-3 hover:bg-gray-50"
                onClick={() => navigate(`/refiners/${r.id}/badge`)}
              >
                {r.badgeUrl ? (
                  <img src={r.badgeUrl} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-200" />
                )}
                <span>{r.displayName}</span>
                <span className="text-sm text-gray-500">{r.department}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <button
              className="rounded border px-3 py-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => updateParam("page", String(page - 1))}
            >
              Anterior
            </button>
            <span>
              Página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <button
              className="rounded border px-3 py-1 disabled:opacity-50"
              disabled={page * pageSize >= data.total}
              onClick={() => updateParam("page", String(page + 1))}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default RefinersPage;