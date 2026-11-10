/* Praise Kier */
import { apiBase } from "../api/http";
import { getAccessToken } from "./auth";

export interface UploadProgress {
  loaded: number;
  total: number;
}

export function uploadImage(
  file: File,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<{ mediaId: number; url?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", `${apiBase}/media/upload`);
    xhr.setRequestHeader("X-Lumon-Build", "latest");
    // Authorization will be added by caller via header? We need token.
    // Token is read from auth module at call time.
    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ mediaId: 0 });
        }
      } else {
        reject(new Error(xhr.responseText || "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    if (signal) signal.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}