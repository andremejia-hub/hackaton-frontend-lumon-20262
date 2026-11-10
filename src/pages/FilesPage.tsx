/* Praise Kier */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listFiles } from "../services/files";
import type { FileSummary, FilesListResponse } from "../types/files";

export function FilesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(params.get("page") || "1");
  const pageSize = Number(params.get("pageSize") || "20");
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const sort = params.get("sort") || "";

  const [data, setData] = useState<FilesListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q);

  const fetchList = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listFiles(
          {
            page,
            pageSize,
            status: status || undefined,
            q: q || undefined,
            sort: sort || undefined,
          },
          signal,
        );
        if (!signal.aborted) setData(res);
      } catch (e) {
        if (!signal.aborted)
          setError(e instanceof Error ? e.message : "Error cargando archivos");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [page, pageSize, status, q, sort],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList]);

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
      <h1 className="mb-4 text-2xl font-bold">Archivos de datos</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="rounded border px-3 py-2"
          placeholder="Buscar..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="rounded border px-3 py-2"
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="completed">Completado</option>
        </select>
        <select
          className="rounded border px-3 py-2"
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="">Orden por defecto</option>
          <option value="name">Nombre</option>
          <option value="progress">Progreso</option>
        </select>
        <select
          className="rounded border px-3 py-2"
          value={pageSize}
          onChange={(e) => updateParam("pageSize", e.target.value)}
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      {loading && <p>Cargando archivos…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <>
          <ul className="divide-y rounded border">
            {data.items.map((f: FileSummary) => (
              <li
                key={f.id}
                className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50"
                onClick={() => navigate(`/files/${f.id}/refine`)}
              >
                <span>
                  {f.name}{" "}
                  <span className="text-sm text-gray-500">
                    ({f.rows}×{f.cols})
                  </span>
                </span>
                <span className="text-sm">
                  {Math.round(
                    (f.progress ?? 0) <= 1
                      ? (f.progress ?? 0) * 100
                      : (f.progress ?? 0),
                  )}
                  % · {f.status}
                </span>
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
              Página {data.page} de{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
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

export default FilesPage;
