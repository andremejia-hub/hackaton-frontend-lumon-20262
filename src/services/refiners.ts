/* Praise Kier */
import { request } from "./auth";

export interface Refiner {
  id: number;
  displayName: string;
  departmentId?: number;
  department?: string;
  badgeMediaId?: number | null;
  badgeUrl?: string;
  version?: number;
}

export interface Department {
  id: number;
  name: string;
}

export async function listDepartments() {
  return request<Department[]>("/departments");
}

export async function listRefiners(params: { page?: number; pageSize?: number; departmentId?: number; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.departmentId) qs.set("departmentId", String(params.departmentId));
  if (params.q) qs.set("q", params.q);
  const path = `/refiners${qs.toString() ? `?${qs.toString()}` : ""}`;
  return request<{ items: Refiner[]; total: number; page: number; pageSize: number }>(path);
}

export async function getRefiner(id: number) {
  const res = await request<Refiner & { etag?: string }>(`/refiners/${id}`);
  return res;
}

export async function patchRefiner(id: number, body: unknown, ifMatch: string) {
  return request<Refiner>(`/refiners/${id}`, {
    method: "PATCH",
    headers: { "If-Match": ifMatch },
    body: JSON.stringify(body),
  });
}