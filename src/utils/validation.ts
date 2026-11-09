import type { Credentials } from '../types/auth';
import { ApiError } from '../api/http';
export function validate(values: Credentials, register: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 120) errors.email = 'Ingresa un correo válido (máximo 120 caracteres).';
  if (!values.password) errors.password = 'Ingresa tu contraseña.';
  if (register && (values.password.length < 8 || values.password.length > 72)) errors.password = 'Usa entre 8 y 72 caracteres.';
  if (register && (!values.teamName || values.teamName.length < 3 || values.teamName.length > 40)) errors.teamName = 'Usa entre 3 y 40 caracteres.';
  return errors;
}
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  if (error.code === 'EMAIL_TAKEN') return { email: error.message };
  if (error.code === 'TEAM_NAME_TAKEN') return { teamName: error.message };
  const details = error.details as { fields?: Record<string, unknown>; field?: string } | null;
  return Object.fromEntries(Object.entries(details?.fields ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
