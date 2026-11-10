/* Praise Kier */
import { request } from "./auth";

export interface DeployChallenge {
  token: string;
  path: string;
}

export interface IntegrationStatus {
  deploy?: { verified: boolean; origin?: string };
  storage?: { verified: boolean; provider?: string; checks?: { name: string; passed: boolean; reason?: string }[] };
}

export async function deployChallenge(origin: string) {
  return request<DeployChallenge>("/integrations/deploy/challenge", {
    method: "POST",
    body: JSON.stringify({ origin }),
  });
}

export async function deployVerify() {
  return request<{ verified: boolean }>("/integrations/deploy/verify", { method: "POST" });
}

export async function registerStorage(config: unknown) {
  return request<{ checks: { name: string; passed: boolean; reason?: string }[] }>(
    "/integrations/storage",
    { method: "PUT", body: JSON.stringify(config) },
  );
}

export async function getIntegrationsStatus() {
  return request<IntegrationStatus>("/integrations/status");
}