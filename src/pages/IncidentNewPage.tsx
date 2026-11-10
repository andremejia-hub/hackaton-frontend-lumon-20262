/* Praise Kier */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadImage } from "../services/media";

export function IncidentNewPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 3);
    setFiles(arr);
    setProgress(new Array(arr.length).fill(0));
  }

  async function handleSend() {
    setSending(true);
    setMessage(null);
    try {
      const ids: number[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImage(files[i], (p) =>
          setProgress((prev) => {
            const next = [...prev];
            next[i] = Math.round((p.loaded / p.total) * 100);
            return next;
          }),
        );
        ids.push(res.mediaId);
      }
      setMessage(`Reporte enviado con ${ids.length} foto(s).`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Nueva incidencia</h1>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => addFiles(e.target.files)}
      />
      <div className="my-4 space-y-2">
        {files.map((f, i) => (
          <div key={i} className="text-sm">
            {f.name} — {progress[i] ?? 0}%
          </div>
        ))}
      </div>
      <button
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        disabled={files.length === 0 || sending}
        onClick={handleSend}
      >
        Enviar reporte
      </button>
      <button className="ml-2 rounded border px-4 py-2" onClick={() => navigate("/incidents")}>
        Ver reportes
      </button>
      {message && <p className="mt-4">{message}</p>}
    </main>
  );
}

export default IncidentNewPage;