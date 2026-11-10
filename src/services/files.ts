/* Praise Kier */
import { request } from "./auth";
import type {
  FileDetail,
  FilesListParams,
  FilesListResponse,
  RefinementCell,
  RefinementRequest,
  RefinementResponse,
  Tile,
} from "../types/files";

export async function listFiles(
  params: FilesListParams = {},
  signal?: AbortSignal,
): Promise<FilesListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  const path = `/files${qs.toString() ? `?${qs.toString()}` : ""}`;
  return request<FilesListResponse>(path, { signal });
}

export async function getFile(
  id: number,
  signal?: AbortSignal,
): Promise<FileDetail> {
  return request<FileDetail>(`/files/${id}`, { signal });
}

export async function getTile(
  id: number,
  tileRow: number,
  tileCol: number,
  signal?: AbortSignal,
): Promise<Tile> {
  return request<Tile>(`/files/${id}/tiles/${tileRow}/${tileCol}`, { signal });
}

export async function refineFile(
  id: number,
  bin: RefinementRequest["bin"],
  cells: RefinementCell[],
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<RefinementResponse> {
  return request<RefinementResponse>(`/files/${id}/refinements`, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ bin, cells }),
    signal,
  });
}
