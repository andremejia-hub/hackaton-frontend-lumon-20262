/* Praise Kier */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRefiner, patchRefiner } from "../services/refiners";
import { uploadImage } from "../services/media";

export function BadgePage() {
  const { id } = useParams();
  const refinerId = id ? Number(id) : NaN;
  const navigate = useNavigate();
  const [refiner, setRefiner] = useState<{ id: number; displayName: string; version?: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!Number.isFinite(refinerId)) return;
    getRefiner(refinerId).then(setRefiner).catch(() => setRefiner(null));
  }, [refinerId]);

  function handleFile(f: File | null) {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!file || !refiner) return;
    setUploading(true);
    setProgress(0);
    setMessage(null);
    try {
      const res = await uploadImage(file, (p) => setProgress(Math.round((p.loaded / p.total) * 100)));
      const etag = "*";
      await patchRefiner(refiner.id, { badgeMediaId: res.mediaId }, etag);
      setMessage("Fotocheck actualizado.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  if (!Number.isFinite(refinerId)) return <main>ID inválido</main>;
  if (!refiner) return <main className="p-4">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Fotocheck — {refiner.displayName}</h1>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="mb-4"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {preview && (
        <div className="mb-4">
          <img src={preview} alt="preview" className="max-h-64 rounded" />
        </div>
      )}
      {uploading && (
        <div className="mb-4">
          <div className="h-2 w-full rounded bg-gray-200">
            <div className="h-2 rounded bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm">{progress}%</p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          Subir y confirmar
        </button>
        <button className="rounded border px-4 py-2" onClick={() => navigate("/refiners")}>
          Volver
        </button>
      </div>
      {message && <p className="mt-4">{message}</p>}
    </main>
  );
}

export default BadgePage;