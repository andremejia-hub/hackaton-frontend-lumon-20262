/* Praise Kier */
import { TREMOR_THRESHOLD, CONNECTIVITY } from "./refinementRules";
import type { Tile } from "../types/files";

export interface Grid {
  rows: number;
  cols: number;
  values: string[]; // length rows*cols
  tremor: number[]; // length rows*cols
  bins: string[]; // length rows*cols, '.' or W/F/D/M
}

export function emptyGrid(rows: number, cols: number): Grid {
  return {
    rows,
    cols,
    values: new Array(rows * cols).fill(""),
    tremor: new Array(rows * cols).fill(0),
    bins: new Array(rows * cols).fill("."),
  };
}

export function index(grid: Grid, r: number, c: number): number {
  return r * grid.cols + c;
}

export function inBounds(grid: Grid, r: number, c: number): boolean {
  return r >= 0 && r < grid.rows && c >= 0 && c < grid.cols;
}

export function isScary(grid: Grid, r: number, c: number): boolean {
  if (!inBounds(grid, r, c)) return false;
  return grid.tremor[index(grid, r, c)] >= TREMOR_THRESHOLD;
}

export function isRefined(grid: Grid, r: number, c: number): boolean {
  if (!inBounds(grid, r, c)) return false;
  const b = grid.bins[index(grid, r, c)];
  return b !== "." && b !== "";
}

export function decodeBase64Bytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function applyTile(grid: Grid, tile: Tile): void {
  const bytes = decodeBase64Bytes(tile.tremor);
  for (let dr = 0; dr < tile.rows; dr++) {
    for (let dc = 0; dc < tile.cols; dc++) {
      const r = tile.originRow + dr;
      const c = tile.originCol + dc;
      if (!inBounds(grid, r, c)) continue;
      const i = dr * tile.cols + dc;
      const flat = index(grid, r, c);
      grid.values[flat] = tile.values[i] ?? "";
      grid.tremor[flat] = bytes[i] ?? 0;
      grid.bins[flat] = tile.bins[i] ?? ".";
    }
  }
}

const NEIGHBORS_4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const NEIGHBORS_8 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function neighbors(connectivity: number): number[][] {
  return connectivity === 8 ? NEIGHBORS_8 : NEIGHBORS_4;
}

export function findGroup(
  grid: Grid,
  startR: number,
  startC: number,
  connectivity: number = CONNECTIVITY,
): { r: number; c: number }[] {
  if (!inBounds(grid, startR, startC)) return [];
  if (!isScary(grid, startR, startC)) return [];
  const result: { r: number; c: number }[] = [];
  const seen = new Set<number>();
  const stack: { r: number; c: number }[] = [{ r: startR, c: startC }];
  const nbrs = neighbors(connectivity);
  while (stack.length) {
    const { r, c } = stack.pop()!;
    const idx = index(grid, r, c);
    if (seen.has(idx)) continue;
    seen.add(idx);
    result.push({ r, c });
    for (const [dr, dc] of nbrs) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(grid, nr, nc)) continue;
      if (seen.has(index(grid, nr, nc))) continue;
      if (!isScary(grid, nr, nc)) continue;
      stack.push({ r: nr, c: nc });
    }
  }
  return result;
}
