import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Falta AuthProvider");
  return context;
}
export function usePermission(permission: string) {
  return useAuth().user?.permissions.includes(permission) ?? false;
}
