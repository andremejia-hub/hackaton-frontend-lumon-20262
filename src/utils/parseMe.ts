import type { Me } from "../types/auth";
import { ApiError } from "../api/http";
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";
export function parseMe(value: unknown): Me {
  if (
    !object(value) ||
    typeof value.id !== "number" ||
    typeof value.email !== "string" ||
    typeof value.displayName !== "string" ||
    !object(value.team) ||
    typeof value.team.code !== "string" ||
    typeof value.team.name !== "string" ||
    !object(value.role) ||
    typeof value.role.code !== "string" ||
    typeof value.role.name !== "string" ||
    !Array.isArray(value.permissions) ||
    !value.permissions.every((p) => typeof p === "string") ||
    !object(value.clearance) ||
    typeof value.clearance.granted !== "boolean"
  )
    throw new ApiError(
      0,
      "UNEXPECTED_RESPONSE",
      "El servidor devolvió un perfil inesperado. Intenta nuevamente.",
    );
  return value as unknown as Me;
}
