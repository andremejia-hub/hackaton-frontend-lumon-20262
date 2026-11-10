/* Praise Kier */
import { useEffect, useRef, useState } from "react";
import { request } from "../services/auth";

export function ContingencyModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    const first = focusable[0];
    first?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const list = Array.from(focusable);
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, []);

  async function confirm() {
    setSending(true);
    setError(null);
    try {
      await request(`/contingency/${id}/ack`, { method: "POST" });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contingency-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div ref={dialogRef} className="w-full max-w-md rounded bg-white p-6">
        <h2 id="contingency-title" className="text-xl font-bold">
          Contingencia activada
        </h2>
        <p className="mt-2">Se requiere tu confirmación para continuar.</p>
        {error && <p className="mt-2 text-red-600">{error}</p>}
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={sending}
          onClick={confirm}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}