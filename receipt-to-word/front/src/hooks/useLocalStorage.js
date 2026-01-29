import { useState, useEffect, useCallback } from "react";
import { LOCALSTORAGE_WARNING_SIZE } from "../constants/config";

/**
 * Safe localStorage helper with quota check
 */
export function safeSetLocalStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > LOCALSTORAGE_WARNING_SIZE) {
      console.warn(`[localStorage] Warning: ${key} size (${serialized.length} bytes) approaching quota limit`);
    }
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.error("[localStorage] Save failed:", e);
    // Try to clear old data if quota exceeded
    if (e.name === "QuotaExceededError") {
      console.warn("[localStorage] Quota exceeded, data not saved");
    }
    return false;
  }
}

/**
 * Safe localStorage getter
 */
export function safeGetLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error("[localStorage] Read failed:", e);
    return defaultValue;
  }
}

/**
 * Custom hook for localStorage with automatic persistence
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    return safeGetLocalStorage(key, initialValue);
  });

  const setValue = useCallback((value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    safeSetLocalStorage(key, valueToStore);
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (e) {
      console.error("[localStorage] Remove failed:", e);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Strip blob preview URLs before saving to localStorage
 */
export function stripBlobPreview(receipt) {
  if (!receipt) return receipt;
  if (receipt.preview && receipt.preview.startsWith("blob:")) {
    return { ...receipt, preview: "" };
  }
  return receipt;
}

/**
 * Revoke blob URL to prevent memory leaks
 */
export function revokePreviewUrl(url) {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export default useLocalStorage;
