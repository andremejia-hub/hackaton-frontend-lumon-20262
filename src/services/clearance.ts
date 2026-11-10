/* Praise Kier */
import { request } from "./auth";

export interface ClearanceStatus {
  granted: boolean;
  grantedAt: string | null;
  rounds?: unknown;
  checks?: { name: string; passed: boolean; reason?: string }[];
}

export interface ClearanceCheckResult {
  passed: boolean;
  checks: { name: string; passed: boolean; reason?: string }[];
}

export async function getClearanceStatus() {
  return request<ClearanceStatus>("/clearance");
}

export async function runClearanceCheck() {
  return request<ClearanceCheckResult>("/clearance/check", { method: "POST" });
}

export async function overrideClearance() {
  return request<ClearanceCheckResult>("/clearance/override", {
    method: "POST",
    headers: { "X-Lumon-Override": "wellness-2026" },
  });
}