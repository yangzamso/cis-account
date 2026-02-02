import { API_BASE, API_RETRY_COUNT, API_RETRY_DELAY_MS } from "../constants/config";

/**
 * Fetch with exponential backoff retry
 */
export async function fetchWithRetry(url, options = {}, retries = API_RETRY_COUNT) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      // Retry on server errors (5xx)
      if (res.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, API_RETRY_DELAY_MS * (i + 1)));
        continue;
      }

      // Don't retry client errors (4xx)
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, API_RETRY_DELAY_MS * (i + 1)));
    }
  }
}

/**
 * Get account information from server
 */
export async function apiGetAccounts() {
  const res = await fetchWithRetry(`${API_BASE}/api/accounts`);
  if (!res.ok) throw new Error(`accounts failed: ${res.status}`);
  return res.json();
}

/**
 * Upload receipt image
 */
export async function apiUploadReceipt(file) {
  console.info("[upload] start", { name: file?.name, size: file?.size, type: file?.type });
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetchWithRetry(`${API_BASE}/api/upload-receipt`, {
    method: "POST",
    body: fd
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`upload failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  console.info("[upload] ok", json);
  return json;
}

/**
 * Run OCR on previously uploaded file
 */
export async function apiOcrFromUpload(fileName) {
  const res = await fetchWithRetry(`${API_BASE}/api/ocr-from-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ocr-from-upload failed: ${res.status} ${t}`);
  }
  return res.json();
}

/**
 * Generate document from items
 */
export async function apiGenerateDocument(
  cleanItems,
  language,
  naturalTranslation,
  reportYear,
  reportMonth
) {
  const res = await fetchWithRetry(`${API_BASE}/api/generate-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: cleanItems,
      language,
      naturalTranslation,
      reportYear,
      reportMonth
    })
  });
  if (!res.ok) {
    let msg = `generate failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail?.errors) msg = j.detail.errors.join("\n");
      else if (j?.detail?.message && j?.detail?.errors) msg = j.detail.errors.join("\n");
      else if (j?.detail) msg = JSON.stringify(j.detail);
    } catch (_) {
      const t = await res.text().catch(() => "");
      if (t) msg = t;
    }
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Get upload preview URL
 */
export function uploadPreviewUrl(fileName) {
  if (!fileName) return "";
  return `${API_BASE || ""}/uploads/${fileName}`;
}

export default {
  apiGetAccounts,
  apiUploadReceipt,
  apiOcrFromUpload,
  apiGenerateDocument,
  uploadPreviewUrl
};
