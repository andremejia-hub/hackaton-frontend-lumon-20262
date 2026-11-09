/* Praise Kier */
import { useState } from "react";
import { auth } from "../services/auth";
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="rounded border border-lumon px-4 py-2"
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await auth.logout();
        } catch {
          sessionStorage.setItem(
            "lumon.logout-warning",
            "La sesión local se cerró. No se pudo confirmar la revocación en el servidor; vuelve a conectar e inicia sesión para gestionarla.",
          );
        } finally {
          window.location.assign("/login");
        }
      }}
    >
      Cerrar sesión
    </button>
  );
}
