/* Praise Kier */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRefiner, patchRefiner } from "../services/refiners";

export function RefinerEditPage() {
  const { id } = useParams();
  const refinerId = id ? Number(id) : NaN;
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [etag, setEtag] = useState<string>("*");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ mine: string; server: string } | null>(null);

  useEffect(() => {
    if (!Number.isFinite(refinerId)) return;
    getRefiner(refinerId).then((r) => {
      setDisplayName(r.displayName ?? "");
      // ETag may come from response headers; here we fall back to "*"
      setEtag("*");
    });
  }, [refinerId]);

  async function handleSave() {
    if (!Number.isFinite(refinerId)) return;
    setSaving(true);
    setMessage(null);
    setConflict(null);
    try {
      await patchRefiner(refinerId, { displayName }, etag);
      setMessage("Guardado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("412") || msg.toLowerCase().includes("conflict")) {
        setConflict({ mine: displayName, server: "versión actual del servidor" });
      } else {
        setMessage(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!Number.isFinite(refinerId)) return <main>ID inválido</main>;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Editar expediente</h1>
      <label className="block">
        Nombre
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <div className="mt-4 flex gap-2">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={saving}
          onClick={handleSave}
        >
          Guardar
        </button>
        <button className="rounded border px-4 py-2" onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>
      {message && <p className="mt-4">{message}</p>}
      {conflict && (
        <div className="mt-4 rounded border p-3">
          <p className="font-semibold">Conflicto de versión</p>
          <p>Tu valor: {conflict.mine}</p>
          <p>Servidor: {conflict.server}</p>
        </div>
      )}
    </main>
  );
}

export default RefinerEditPage;