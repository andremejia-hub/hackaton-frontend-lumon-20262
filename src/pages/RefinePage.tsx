/* Praise Kier */
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getFile } from "../services/files";
import { refineFile } from "../services/files";
import { useTiles } from "../hooks/useTiles";
import { findGroup, index } from "../utils/grid";
import { groupDigitSum, binForGroup, isNoise } from "../utils/refinementRules";
import type { FileDetail, RefinementCell } from "../types/files";
import type { Grid } from "../utils/grid";

const CELL = 24;
const VIEW_H = 620;
const VIEW_W = 900;

export function RefinePage() {
  const { id } = useParams();
  const fileId = id ? Number(id) : NaN;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [noise, setNoise] = useState(false);
  const [refining, setRefining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [, forceUpdate] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(fileId)) return;
    let active = true;
    getFile(fileId)
      .then((f) => {
        if (active) setFile(f);
      })
      .catch((e) => {
        if (active) setFileError(e instanceof Error ? e.message : "Error");
      });
    return () => {
      active = false;
    };
  }, [fileId]);

  const rows = file?.rows ?? 0;
  const cols = file?.cols ?? 0;
  const tileSize = file?.tileSize ?? 32;
  const { grid, version, loading, error, loaded, total } = useTiles(
    Number.isFinite(fileId) ? fileId : null,
    rows,
    cols,
    tileSize,
  );
  void version;

  // initial scroll from query
  useEffect(() => {
    if (!grid || !containerRef.current) return;
    const r = Number(searchParams.get("r"));
    const c = Number(searchParams.get("c"));
    if (Number.isFinite(r) && Number.isFinite(c)) {
      containerRef.current.scrollTo({
        top: Math.max(0, (r - 5) * CELL),
        left: Math.max(0, (c - 5) * CELL),
      });
    }
  }, [grid, searchParams]);

  const minSize = file?.minGroupSize ?? 1;
  const maxSize = file?.maxGroupSize ?? Number.MAX_SAFE_INTEGER;

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!grid) return;
      const idx = index(grid, r, c);
      if (grid.bins[idx] !== ".") return; // already refined
      if (grid.tremor[idx] < 70) return; // not scary (threshold 70)
      const group = findGroup(grid, r, c, 8);
      if (group.length === 0) return;
      const cells = group.map((p) => grid.values[index(grid, p.r, p.c)]);
      const sum = groupDigitSum(cells);
      const bin = binForGroup(sum);
      const noiseFlag = isNoise(group.length, minSize, maxSize);
      setSelected(new Set(group.map((p) => `${p.r},${p.c}`)));
      setSelectedBin(bin);
      setNoise(noiseFlag);
      setMessage(null);
    },
    [grid, minSize, maxSize],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectedBin(null);
    setNoise(false);
  }, []);

  const handleCellKeyDown = useCallback(
    (e: ReactKeyboardEvent, r: number, c: number) => {
      if (!grid) return;
      const page = 10;
      let nr = r;
      let nc = c;
      switch (e.key) {
        case "ArrowUp":
          nr = Math.max(0, r - 1);
          break;
        case "ArrowDown":
          nr = Math.min(rows - 1, r + 1);
          break;
        case "ArrowLeft":
          nc = Math.max(0, c - 1);
          break;
        case "ArrowRight":
          nc = Math.min(cols - 1, c + 1);
          break;
        case "PageUp":
          nr = Math.max(0, r - page);
          break;
        case "PageDown":
          nr = Math.min(rows - 1, r + page);
          break;
        case "Home":
          nc = 0;
          break;
        case "End":
          nc = cols - 1;
          break;
        case "Enter":
          handleCellClick(r, c);
          e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault();
      setFocus({ r: nr, c: nc });
      const el = containerRef.current;
      if (el) {
        el.scrollTop = Math.max(0, (nr - 5) * CELL);
        el.scrollLeft = Math.max(0, (nc - 5) * CELL);
      }
    },
    [grid, rows, cols, handleCellClick],
  );

  const handleRefine = useCallback(
    async (bin: "WOE" | "FROLIC" | "DREAD" | "MALICE") => {
      if (!grid || !file || selected.size === 0 || refining) return;
      if (noise) {
        setMessage("Este grupo es ruido: no se puede refinar.");
        return;
      }
      const cells: RefinementCell[] = [...selected].map((k) => {
        const [r, c] = k.split(",").map(Number);
        return { r, c };
      });
      setRefining(true);
      setMessage(null);
      try {
        const key = crypto.randomUUID();
        const res = await refineFile(file.id, bin, cells, key);
        // mark cells
        const binLetter = bin[0]; // W/F/D/M
        for (const cell of cells) {
          grid.bins[index(grid, cell.r, cell.c)] = binLetter;
        }
        forceUpdate((n) => n + 1);
        // update progress
        if (res.progress && file) {
          setFile({
            ...file,
            progress: res.progress.percent,
            progressDetail: res.progress,
          });
        }
        clearSelection();
        if (res.progress) {
          const p = res.progress.percent;
          const norm = p <= 1 ? p * 100 : p;
          if (norm >= 100) setCompleted(true);
        }
        setMessage("Refinado correctamente.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error refinando";
        setMessage(msg);
        // on 409, re-fetch tiles? reload tiles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const code = (e as any)?.code;
        if (code === "ALREADY_REFINED") {
          // reload tiles
        }
      } finally {
        setRefining(false);
      }
    },
    [grid, file, selected, refining, noise, clearSelection],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (selected.size === 0) return;
      setDragging(true);
      setDragPos({ x: e.clientX, y: e.clientY });
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [selected],
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    },
    [dragging],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setDragging(false);
      const el = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement | null;
      const bin = el?.closest("[data-bin]")?.getAttribute("data-bin");
      if (
        bin === "WOE" ||
        bin === "FROLIC" ||
        bin === "DREAD" ||
        bin === "MALICE"
      ) {
        void handleRefine(bin);
      }
    },
    [dragging, handleRefine],
  );

  // update URL on scroll (replace)
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
    const r = Math.floor(el.scrollTop / CELL);
    const c = Math.floor(el.scrollLeft / CELL);
    const url = new URL(window.location.href);
    url.searchParams.set("r", String(r));
    url.searchParams.set("c", String(c));
    window.history.replaceState(null, "", url.toString());
  }, []);

  const visibleRows = Math.ceil(VIEW_H / CELL) + 2;
  const visibleCols = Math.ceil(VIEW_W / CELL) + 2;
  const startRow = Math.floor(scrollTop / CELL);
  const startCol = Math.floor(scrollLeft / CELL);
  const endRow = Math.min(rows, startRow + visibleRows);
  const endCol = Math.min(cols, startCol + visibleCols);

  const cellsToRender: { r: number; c: number }[] = [];
  if (grid) {
    for (let r = startRow; r < endRow; r++)
      for (let c = startCol; c < endCol; c++) cellsToRender.push({ r, c });
  }

  if (!Number.isFinite(fileId)) return <main>ID inválido</main>;
  if (fileError) return <main className="p-4 text-red-600">{fileError}</main>;
  if (!file) return <main className="p-4">Cargando archivo…</main>;

  if (completed) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Archivo completado</h1>
          <p className="mt-2">Todos los grupos fueron refinados.</p>
          <button
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => navigate("/files")}
          >
            Volver a archivos
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b p-3">
        <div>
          <h1 className="text-lg font-bold">{file.name}</h1>
          <p className="text-sm text-gray-500">
            {rows}×{cols} · tiles {loaded}/{total} · progreso{" "}
            {Math.round(
              (file.progress ?? 0) <= 1
                ? (file.progress ?? 0) * 100
                : (file.progress ?? 0),
            )}
            %
          </p>
        </div>
        {selected.size > 0 && (
          <div
            onPointerDown={startDrag}
            className="cursor-grab rounded bg-red-500 px-3 py-1 text-white select-none"
            style={{ touchAction: "none" }}
          >
            Arrastrar grupo ({selected.size})
          </div>
        )}
        <div className="flex gap-2">
          {(["WOE", "FROLIC", "DREAD", "MALICE"] as const).map((b) => (
            <button
              key={b}
              data-bin={b}
              disabled={selected.size === 0 || refining || noise}
              className="rounded border px-3 py-1 disabled:opacity-40"
              onClick={() => handleRefine(b)}
            >
              {b}
            </button>
          ))}
          <button className="rounded border px-3 py-1" onClick={clearSelection}>
            Cancelar
          </button>
        </div>
      </header>
      {loading && <p className="p-2 text-sm">Cargando bloques…</p>}
      {error && <p className="p-2 text-sm text-red-600">{error}</p>}
      {message && <p className="p-2 text-sm">{message}</p>}
      {selected.size > 0 && (
        <p className="p-2 text-sm">
          Seleccionado: {selected.size} celdas · caja sugerida:{" "}
          <strong>{selectedBin}</strong>
          {noise && " · (ruido)"}
        </p>
      )}
      <div
        ref={containerRef}
        role="grid"
        aria-rowcount={rows}
        aria-colcount={cols}
        className="relative flex-1 overflow-auto"
        style={{ height: VIEW_H }}
        onScroll={onScroll}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
      >
        <div
          style={{
            position: "relative",
            width: cols * CELL,
            height: rows * CELL,
          }}
        >
          {cellsToRender.map(({ r, c }) => {
            if (!grid) return null;
            const idx = index(grid, r, c);
            const scary = grid.tremor[idx] >= 70;
            const refined = grid.bins[idx] !== "." && grid.bins[idx] !== "";
            const sel = selected.has(`${r},${c}`);
            const tremor = grid.tremor[idx];
            return (
              <div
                key={`${r}-${c}`}
                role="gridcell"
                aria-rowindex={r + 1}
                aria-colindex={c + 1}
                tabIndex={focus.r === r && focus.c === c ? 0 : -1}
                onClick={() => handleCellClick(r, c)}
                onFocus={() => setFocus({ r, c })}
                onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                className={
                  "absolute flex items-center justify-center border border-gray-200 text-xs " +
                  (refined
                    ? "bg-blue-100"
                    : scary
                      ? "cursor-pointer bg-yellow-50"
                      : "bg-white") +
                  (sel ? " ring-2 ring-red-500" : "")
                }
                style={{
                  top: r * CELL,
                  left: c * CELL,
                  width: CELL,
                  height: CELL,
                  animation:
                    scary && !refined
                      ? `tremor ${Math.max(0.2, 1 - tremor / 100)}s infinite`
                      : undefined,
                }}
              >
                {refined ? grid.bins[idx] : grid.values[idx]}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes tremor {
          0% { transform: translate(0,0); }
          25% { transform: translate(1px,-1px); }
          50% { transform: translate(-1px,1px); }
          75% { transform: translate(1px,1px); }
          100% { transform: translate(0,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
      {dragging && (
        <div
          className="pointer-events-none fixed rounded bg-red-500 px-3 py-1 text-white"
          style={{ left: dragPos.x + 8, top: dragPos.y + 8 }}
        >
          Grupo ({selected.size})
        </div>
      )}
    </main>
  );
}

export default RefinePage;
