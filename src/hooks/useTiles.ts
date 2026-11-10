/* Praise Kier */
import { useEffect, useState, useRef, useCallback } from "react";
import { getTile } from "../services/files";
import { ApiError } from "../api/http";
import { applyTile, emptyGrid, type Grid } from "../utils/grid";
import type { Tile } from "../types/files";

export interface UseTilesResult {
  grid: Grid | null;
  version: number;
  loading: boolean;
  error: string | null;
  loaded: number;
  total: number;
  reload: () => void;
}

const CONCURRENCY = 8;

export function useTiles(
  fileId: number | null,
  rows: number,
  cols: number,
  tileSize: number,
): UseTilesResult {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const tileRows = Math.ceil(rows / tileSize);
  const tileCols = Math.ceil(cols / tileSize);
  const total = tileRows * tileCols;

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (fileId == null || rows <= 0 || cols <= 0 || tileSize <= 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setLoaded(0);
    const g = emptyGrid(rows, cols);
    setGrid(g);

    const tiles: { tr: number; tc: number }[] = [];
    for (let tr = 1; tr <= tileRows; tr++)
      for (let tc = 1; tc <= tileCols; tc++) tiles.push({ tr, tc });

    let cancelled = false;
    let inFlight = 0;
    const queue = [...tiles];
    const sleep = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    async function fetchOne(tr: number, tc: number): Promise<void> {
      if (cancelled || controller.signal.aborted) return;
      let attempt = 0;
      while (attempt < 6) {
        if (cancelled || controller.signal.aborted) return;
        try {
          const tile: Tile = await getTile(
            fileId as number,
            tr,
            tc,
            controller.signal,
          );
          if (cancelled || controller.signal.aborted) return;
          applyTile(g, tile);
          setLoaded((n) => n + 1);
          setVersion((v) => v + 1);
          return;
        } catch (e) {
          if (cancelled || controller.signal.aborted) return;
          if (e instanceof ApiError && e.status === 429) {
            const wait = (e.retryAfter ?? 1) * 1000;
            await sleep(wait);
            attempt++;
            continue;
          }
          if (e instanceof ApiError && e.status === 503) {
            const wait = Math.min(30000, 1000 * 2 ** attempt);
            await sleep(wait);
            attempt++;
            continue;
          }
          // other errors: stop retrying this tile
          setError(e instanceof Error ? e.message : "Error cargando bloque");
          return;
        }
      }
    }

    async function worker() {
      while (true) {
        if (cancelled || controller.signal.aborted) return;
        const next = queue.shift();
        if (!next) return;
        inFlight++;
        try {
          await fetchOne(next.tr, next.tc);
        } finally {
          inFlight--;
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    Promise.all(workers)
      .then(() => {
        if (!cancelled && !controller.signal.aborted) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fileId, rows, cols, tileSize, reloadToken]);

  return { grid, version, loading, error, loaded, total, reload };
}
