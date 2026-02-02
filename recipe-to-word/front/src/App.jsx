import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

// Import constants
import {
  API_BASE,
  LS_KEY,
  LS_LANG,
  MOBILE_BREAKPOINT,
  RECIPIENT_JINMO,
  RECIPIENT_JIMIN,
  RECIPIENT_OTHER,
  COUNTRY_OPTIONS,
  COUNTRY_CURRENCY,
  DESCRIPTION_PRESETS_KO
} from "./constants/config";

// Import i18n
import { t, fmt } from "./constants/i18n";

// Import hooks
import { safeSetLocalStorage, safeGetLocalStorage, stripBlobPreview, revokePreviewUrl } from "./hooks/useLocalStorage";
import { apiGetAccounts, apiUploadReceipt, apiOcrFromUpload, apiGenerateDocument, uploadPreviewUrl } from "./hooks/useApi";

// Import components
import ReceiptCard from "./components/ReceiptCard";

// Account database - loaded from server
// Account database - managed by state

function currencyLabelForItem(item, lang, ruCountryCode) {
  if (lang !== "ru") return t("ko", "currencyWon");
  const code = String(ruCountryCode || item?.countryCode || "").toUpperCase();
  return COUNTRY_CURRENCY[code] || "";
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function formatNumber(num) {
  const n = Number(num) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseAmountFromInput(s) {
  const digits = String(s ?? "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function normalizeOcrAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") return parseAmountFromInput(val);
  return 0;
}

function normalizeOcrDate(val) {
  if (!val) return "";
  const s = String(val).trim();
  const m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m) {
    const yyyy = m[1];
    const mm = m[2].padStart(2, "0");
    const dd = m[3].padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

function extractOcrField(ocr, key) {
  if (!ocr || typeof ocr !== "object") return undefined;
  if (ocr[key] !== undefined) return ocr[key];
  if (ocr.data && ocr.data[key] !== undefined) return ocr.data[key];
  if (ocr.result && ocr.result[key] !== undefined) return ocr.result[key];
  return undefined;
}

function sumReceipts(receipts) {
  return (receipts || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
}

function isItemComplete(item, lang, ruCountryCode) {
  if (!item) return false;
  if (!(item.description || "").trim()) return false;
  if (!(item.date || "").trim()) return false;
  if (lang !== "ru" && !item.recipientType) return false;
  if (lang === "ru" && !(ruCountryCode || "").trim()) return false;
  if (lang === "ru" && !(item.managerName || "").trim()) return false;
  if (!Array.isArray(item.receipts) || item.receipts.length === 0) return false;

  const first = item.receipts[0];
  if (!(first?.date || "").trim()) return false;
  if (!Number(first?.amount || 0)) return false;

  if (lang !== "ru" && item.recipientType === RECIPIENT_OTHER) {
    if (!(item.recipient || "").trim()) return false;
    if (!(item.bank || "").trim()) return false;
    if (!(item.account || "").trim()) return false;
  }
  return true;
}

function App() {
  const [items, setItems] = useState([]);
  const [itemCounter, setItemCounter] = useState(0);
  const [currentEditingItemId, setCurrentEditingItemId] = useState(null);
  const [lang, setLang] = useState("ko");
  const [naturalTranslation, setNaturalTranslation] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [ruCountryCode, setRuCountryCode] = useState("");
  const initialReportDate = currentYearMonth();
  const [reportYear, setReportYear] = useState(initialReportDate.year);
  const [reportMonth, setReportMonth] = useState(initialReportDate.month);
  const [serverInfo, setServerInfo] = useState({
    state: "checking",
    ready: false,
    status: "",
    model: ""
  });
  const [spinner, setSpinner] = useState({ visible: false, text: "" });
  const [modalSrc, setModalSrc] = useState("");
  const [editorErrors, setEditorErrors] = useState([]);
  const [ocrExpanded, setOcrExpanded] = useState({});
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef(null);
  const currentEditingIdRef = useRef(currentEditingItemId);

  useEffect(() => {
    currentEditingIdRef.current = currentEditingItemId;
  }, [currentEditingItemId]);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
    } else {
      mql.addListener(update);
    }
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", update);
      } else {
        mql.removeListener(update);
      }
    };
  }, []);

  useEffect(() => {
    console.log("React app loaded: ocr-mapping-v3");
    const savedLang = localStorage.getItem(LS_LANG);
    if (savedLang) setLang(savedLang === "ru" ? "ru" : "ko");

    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          const normalized = parsed.items.map((it) => {
            const recipientType =
              it.recipientType === "김진모" ? RECIPIENT_JINMO : it.recipientType;
            const recipient =
              it.recipient === "김진모" ? RECIPIENT_JINMO : it.recipient;
            const receipts = (it.receipts || []).map((r) => ({
              ...r,
              preview: r.preview && r.preview.startsWith("blob:") ? "" : r.preview,
              amount: Number(r.amount) || 0,
              hasMultipleCurrency: !!r.hasMultipleCurrency
            }));
            return {
              ...it,
              recipientType: recipientType || RECIPIENT_OTHER,
              recipient,
              bank: recipientType === RECIPIENT_JINMO ? "우리" : recipientType === RECIPIENT_JIMIN ? "기업" : it.bank,
              account: recipientType === RECIPIENT_JINMO ? "928-017364-02-101" : recipientType === RECIPIENT_JIMIN ? "133-104009-01-018" : it.account,
              countryCode: it.countryCode || "",
              managerName: it.managerName || "",
              telegramId: it.telegramId || "",
              totalAmount: Number(it.totalAmount) || sumReceipts(receipts),
              receipts
            };
          });
          const savedCountry =
            normalized.find((it) => (it.countryCode || "").trim())?.countryCode || "";
          const normalizedWithCountry = savedCountry
            ? normalized.map((it) => ({ ...it, countryCode: savedCountry }))
            : normalized;
          setItems(normalizedWithCountry);
          setRuCountryCode(savedCountry);
          setItemCounter(Number(parsed.itemCounter) || 0);
          setCurrentEditingItemId(parsed.currentEditingItemId ?? null);
          if (parsed.reportYear) setReportYear(Number(parsed.reportYear) || initialReportDate.year);
          if (parsed.reportMonth) setReportMonth(Number(parsed.reportMonth) || initialReportDate.month);
        }
      } catch (_) {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang, "documentTitle");
    localStorage.setItem(LS_LANG, lang);
  }, [lang]);

  useEffect(() => {
    const payload = {
      items: items.map((it) => ({
        ...it,
        receipts: (it.receipts || []).map((r) => stripBlobPreview(r))
      })),
      itemCounter,
      currentEditingItemId,
      reportYear,
      reportMonth
    };
    safeSetLocalStorage(LS_KEY, payload);
  }, [items, itemCounter, currentEditingItemId, reportYear, reportMonth]);

  useEffect(() => {
    if (currentEditingItemId && !items.some((i) => i.id === currentEditingItemId)) {
      setCurrentEditingItemId(null);
    }
  }, [items, currentEditingItemId]);

  useEffect(() => {
    if (!isMobile) return;
    setViewMode(currentEditingItemId ? "editor" : "list");
  }, [isMobile, currentEditingItemId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGetAccounts();
        const model = data?.server_info?.model || "Unknown";
        const ready = !!data?.server_info?.api_ready;
        const status = data?.server_info?.status || (ready ? "OK" : "API Key missing");

        if (mounted) {
          setServerInfo({ state: "ready", ready, status, model });
        }
      } catch (_) {
        if (!mounted) return;
        setServerInfo({ state: "failed", ready: false, status: "", model: "" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onPaste = async (e) => {
      const currentId = currentEditingIdRef.current;
      if (!currentId) return;
      const itemsClipboard = e.clipboardData?.items;
      if (!itemsClipboard) return;

      const imageFiles = [];
      for (const it of itemsClipboard) {
        if (it.type && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFilesForItem(currentId, imageFiles);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setModalSrc("");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const totalItems = items.length;
  const grandTotal = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0),
    [items]
  );

  const currentItem = items.find((i) => i.id === currentEditingItemId) || null;
  const currencyLabel = currencyLabelForItem(currentItem || items[0], lang, ruCountryCode);
  const tr = (key) => t(lang, key);
  const yearOptions = Array.from({ length: 6 }, (_, i) => initialReportDate.year - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearSuffix = lang === "ru" ? " г." : "년";
  const monthSuffix = lang === "ru" ? " мес." : "월";

  function setSpinnerVisible(visible, text) {
    setSpinner({ visible, text: text || "" });
  }

  function newItem() {
    const id = itemCounter + 1;
    const defaultRecipientType = RECIPIENT_OTHER;
    setItemCounter(id);
    return {
      id,
      description: "",
      date: todayISO(),
      recipientType: defaultRecipientType,
      recipient: "",
      bank: "",
      account: "",
      countryCode: ruCountryCode || "",
      managerName: "",
      telegramId: "",
      totalAmount: 0,
      receipts: []
    };
  }

  function addItemAndOpen() {
    const it = newItem();
    setItems((prev) => [...prev, it]);
    setCurrentEditingItemId(it.id);
    setEditorErrors([]);
    if (isMobile) setViewMode("editor");
  }

  function openEditor(itemId) {
    setCurrentEditingItemId(itemId);
    setEditorErrors([]);
    if (isMobile) setViewMode("editor");
  }

  function deleteItem(itemId) {
    const it = items.find((i) => i.id === itemId);
    const name = it?.description?.trim()
      ? it.description
      : `${tr("itemLabel")} ${itemId}`;
    if (!confirm(fmt(tr("confirmDeleteItem"), { name }))) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (currentEditingItemId === itemId) setCurrentEditingItemId(null);
  }

  function resetAll() {
    if (!confirm(tr("confirmReset"))) return;
    items.forEach((it) => (it.receipts || []).forEach((r) => revokePreviewUrl(r.preview)));
    setItems([]);
    setItemCounter(0);
    setCurrentEditingItemId(null);
    setEditorErrors([]);
    setRuCountryCode("");
    setReportYear(initialReportDate.year);
    setReportMonth(initialReportDate.month);
    localStorage.removeItem(LS_KEY);
  }

  function updateItemField(itemId, field, value) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const next = { ...it, [field]: value };
        if (field === "date" && Array.isArray(it.receipts) && it.receipts.length > 0) {
          next.receipts = it.receipts.map((r, idx) =>
            idx === 0 ? { ...r, date: value } : r
          );
        }
        return next;
      })
    );
  }

  function setCountryForAll(value) {
    const next = value || "";
    setRuCountryCode(next);
    setItems((prev) => prev.map((it) => ({ ...it, countryCode: next })));
  }

  function updateReceiptField(itemId, receiptId, field, value) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const receipts = (it.receipts || []).map((r) =>
          r.id === receiptId ? { ...r, [field]: value } : r
        );
        const next = { ...it, receipts, totalAmount: sumReceipts(receipts) };
        if (field === "date" && receipts[0]?.id === receiptId) {
          next.date = value;
        }
        return next;
      })
    );
  }

  function deleteReceipt(itemId, receiptId) {
    const target = items
      .find((it) => it.id === itemId)
      ?.receipts?.find((r) => r.id === receiptId);
    revokePreviewUrl(target?.preview);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const receipts = (it.receipts || []).filter((r) => r.id !== receiptId);
        return { ...it, receipts, totalAmount: sumReceipts(receipts) };
      })
    );
  }

  function validateCurrentItem(item) {
    const errors = [];
    if (!(item.description || "").trim()) errors.push(tr("valDescription"));
    if (!(item.date || "").trim()) errors.push(tr("valDate"));
    if (lang !== "ru" && !item.recipientType) errors.push(tr("valRecipientType"));
    if (lang === "ru" && !(ruCountryCode || "").trim()) errors.push(tr("valCountry"));
    if (lang === "ru" && !(item.managerName || "").trim()) errors.push(tr("valManagerName"));
    if (!Array.isArray(item.receipts) || item.receipts.length === 0)
      errors.push(tr("valReceiptRequired"));

    if (lang !== "ru" && item.recipientType === RECIPIENT_OTHER) {
      if (!(item.recipient || "").trim()) errors.push(tr("valRecipientName"));
      if (!(item.bank || "").trim()) errors.push(tr("valBank"));
      if (!(item.account || "").trim()) errors.push(tr("valAccount"));
    }

    if (item.receipts && item.receipts.length > 0) {
      const first = item.receipts[0];
      if (!(first.date || "").trim()) errors.push(tr("valFirstReceiptDate"));
      if (!Number(first.amount || 0)) errors.push(tr("valFirstReceiptAmount"));
    }

    return errors;
  }

  async function handleFilesForItem(itemId, files) {
    console.warn("[upload] handleFilesForItem", { itemId, count: files?.length });
    const imageFiles = Array.from(files || []).filter(
      (f) => f && f.type && f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      setEditorErrors([tr("msgInvalidImage")]);
      return;
    }
    setEditorErrors([]);
    for (const file of imageFiles) {
      console.warn("[upload] process file", { name: file?.name, size: file?.size, type: file?.type });
      await addReceiptWithUploadAndOcr(itemId, file);
    }
  }

  async function addReceiptWithUploadAndOcr(itemId, file) {
    const receiptId = Date.now() + Math.floor(Math.random() * 1000);
    const localPreview = URL.createObjectURL(file);
    const placeholder = {
      id: receiptId,
      fileName: "",
      preview: localPreview,
      date: "",
      amount: 0,
      description: "",
      rawText: "",
      hasMultipleCurrency: false
    };

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const isFirstReceipt = (it.receipts || []).length === 0;
        const seeded = {
          ...placeholder,
          date: isFirstReceipt ? it.date || "" : ""
        };
        const receipts = [...(it.receipts || []), seeded];
        return { ...it, receipts, totalAmount: sumReceipts(receipts) };
      })
    );

    try {
      setSpinnerVisible(true, tr("spinnerUploading"));
      const up = await apiUploadReceipt(file);
      console.info("[upload] response", up);
      if (up?.fileName) {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== itemId) return it;
            const receipts = (it.receipts || []).map((r) =>
              r.id === receiptId
                ? (() => {
                  if (r.preview && r.preview.startsWith("blob:")) {
                    revokePreviewUrl(r.preview);
                  }
                  const previewUrl = uploadPreviewUrl(up.fileName);
                  return {
                    ...r,
                    fileName: up.fileName,
                    preview: previewUrl || r.preview
                  };
                })()
                : r
            );
            return { ...it, receipts };
          })
        );
      }

      setSpinnerVisible(true, tr("spinnerOcr"));
      let ocr = up;
      const hasDirectOcr =
        up &&
        (up.ocrSuccess ||
          (up.date !== undefined && up.date !== null && String(up.date).trim() !== "") ||
          (up.amount !== undefined && up.amount !== null && String(up.amount).trim() !== "") ||
          (up.rawText !== undefined && up.rawText !== null && String(up.rawText).trim() !== "") ||
          (up.merchant !== undefined && up.merchant !== null && String(up.merchant).trim() !== ""));
      if (!hasDirectOcr && up?.fileName) {
        ocr = await apiOcrFromUpload(up.fileName);
      }

      console.log("[ocr] payload", ocr);
      const ocrDateRaw = extractOcrField(ocr, "date");
      const ocrDate =
        ocrDateRaw !== undefined && ocrDateRaw !== null ? normalizeOcrDate(ocrDateRaw) : "";
      const ocrAmountRaw = extractOcrField(ocr, "amount");
      const ocrRawText = extractOcrField(ocr, "rawText");
      const ocrMerchantRaw = extractOcrField(ocr, "merchant");
      const ocrMulti = extractOcrField(ocr, "hasMultipleCurrency");
      const hasOcrData =
        ocr &&
        (ocr.ocrSuccess === true ||
          (ocrDateRaw !== undefined && ocrDateRaw !== null && String(ocrDateRaw).trim() !== "") ||
          (ocrAmountRaw !== undefined && ocrAmountRaw !== null && String(ocrAmountRaw).trim() !== "") ||
          (ocrMerchantRaw !== undefined && ocrMerchantRaw !== null && String(ocrMerchantRaw).trim() !== "") ||
          (ocrRawText !== undefined && ocrRawText !== null && String(ocrRawText).trim() !== ""));
      if (hasOcrData) {
        console.info("[ocr] result", {
          date: ocrDateRaw,
          amount: ocrAmountRaw,
          rawText: ocrRawText,
          merchant: ocrMerchantRaw,
          hasMultipleCurrency: ocrMulti
        });
      }

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;
          const receipts = (it.receipts || []).map((r) => {
            if (r.id !== receiptId) return r;
            const next = { ...r };
            if (ocrDate) next.date = ocrDate;
            if (ocrAmountRaw !== undefined && ocrAmountRaw !== null) {
              next.amount = normalizeOcrAmount(ocrAmountRaw);
            }
            const merchant = String(ocrMerchantRaw || "").trim();
            if (merchant && !next.description) {
              next.description = merchant;
            }
            if (ocrRawText !== undefined) next.rawText = ocrRawText || "";
            if (ocrMulti !== undefined) next.hasMultipleCurrency = !!ocrMulti;
            return next;
          });
          const nextItem = { ...it, receipts, totalAmount: sumReceipts(receipts) };
          if (ocrDate && receipts[0]?.id === receiptId) {
            nextItem.date = ocrDate;
          }
          return nextItem;
        })
      );

      if (!hasOcrData) {
        setEditorErrors([tr("msgOcrFailed")]);
      }
    } catch (e) {
      console.error("[upload] failed", e);
      setEditorErrors([tr("msgUploadFailed"), String(e.message || e)]);
    } finally {
      setSpinnerVisible(false, "");
    }
  }

  async function generateDocument() {
    if (items.length === 0) {
      alert(tr("msgNoItemsGenerate"));
      return;
    }

    for (const it of items) {
      if (!isItemComplete(it, lang, ruCountryCode)) {
        setCurrentEditingItemId(it.id);
        const errors = validateCurrentItem(it);
        setEditorErrors(errors.length ? errors : [tr("msgItemIncomplete")]);
        return;
      }
    }

    const cleanItems = items.map((it) => ({
      id: it.id,
      description: it.description || "",
      date: it.date || "",
      countryCode: lang === "ru" ? ruCountryCode || "" : it.countryCode || "",
      managerName: it.managerName || "",
      telegramId: it.telegramId || "",
      recipientType: it.recipientType || "",
      recipient: it.recipient || it.recipientType || "",
      bank: it.bank || "",
      account: it.account || "",
      totalAmount: Number(it.totalAmount) || 0,
      receipts: (it.receipts || []).map((r) => ({
        id: r.id,
        fileName: r.fileName,
        date: r.date || "",
        amount: Number(r.amount) || 0,
        description: r.description || "",
        rawText: r.rawText || "",
        hasMultipleCurrency: !!r.hasMultipleCurrency
      }))
    }));

    try {
      setSpinnerVisible(true, tr("spinnerGenerating"));
      const result = await apiGenerateDocument(
        cleanItems,
        lang,
        lang === "ru" ? naturalTranslation : false,
        reportYear,
        reportMonth
      );
      setSpinnerVisible(false, "");
      if (result?.success && result?.downloadUrl) {
        window.location.href = `${API_BASE}${result.downloadUrl}`;
        if (confirm(tr("confirmGeneratedReset"))) {
          setItems([]);
          setItemCounter(0);
          setCurrentEditingItemId(null);
          setEditorErrors([]);
        }
      } else {
        alert(tr("msgGenerateFailed"));
      }
    } catch (e) {
      setSpinnerVisible(false, "");
      alert(`${tr("msgGenerateFailed")}\n${String(e.message || e)}`);
    }
  }

  function handleRecipientTypeChange(value) {
    if (!currentItem) return;
    if (value === RECIPIENT_JINMO || value === RECIPIENT_JIMIN) {
      // Hardcoded account info
      let acc = { bank: "", account: "" };
      if (value === RECIPIENT_JINMO) {
        acc = { bank: "우리", account: "928-017364-02-101" };
      } else if (value === RECIPIENT_JIMIN) {
        acc = { bank: "기업", account: "133-104009-01-018" };
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? {
              ...it,
              recipientType: value,
              recipient: value,
              bank: acc.bank,
              account: acc.account
            }
            : it
        )
      );
    } else if (value === RECIPIENT_OTHER) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? {
              ...it,
              recipientType: value,
              recipient: "",
              bank: "",
              account: ""
            }
            : it
        )
      );
    }
  }

  function handleSaveCurrentItem() {
    if (!currentItem) return;
    const errors = validateCurrentItem(currentItem);
    if (errors.length) {
      setEditorErrors(errors);
      return;
    }
    setCurrentEditingItemId(null);
    setEditorErrors([]);
    if (isMobile) setViewMode("list");
  }

  function handleDescriptionPresetChange(value) {
    if (!currentItem) return;
    if (value === "기타") {
      updateItemField(currentItem.id, "description", "");
      return;
    }
    if (value) {
      updateItemField(currentItem.id, "description", value);
    }
  }

  function toggleOcr(itemId, receiptId) {
    const key = `${itemId}:${receiptId}`;
    setOcrExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function serverInfoText() {
    if (serverInfo.state === "failed") return tr("serverFailed");
    if (serverInfo.state === "checking") return tr("serverChecking");
    return serverInfo.ready
      ? fmt(tr("serverConnected"), { model: serverInfo.model })
      : fmt(tr("serverStatus"), { status: serverInfo.status, model: serverInfo.model });
  }

  return (
    <div>
      <header className="topbar">
        <div className="brand">{tr("brandTitle")}</div>
        <div className="topbar-right">
          <div className="server">{serverInfoText()}</div>
          <div className="lang-select">
            <label className="lang-label" htmlFor="langSelect">
              {tr("langLabel")}
            </label>
            <select
              id="langSelect"
              value={lang}
              onChange={(e) => setLang(e.target.value === "ru" ? "ru" : "ko")}
            >
              <option value="ko">{tr("langKo")}</option>
              <option value="ru">{tr("langRu")}</option>
            </select>
          </div>
        </div>
      </header>

      <main className="layout">
        {(!isMobile || viewMode === "list") && (
          <section className="panel left">
            <div className="panel-title">{tr("summaryTitle")}</div>

            <div className="report-date">
              <label className="report-label">{tr("reportDateLabel")}</label>
              <div className="report-selects">
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(parseInt(e.target.value, 10))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                      {yearSuffix}
                    </option>
                  ))}
                </select>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                      {monthSuffix}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="summary">
              <div>
                {tr("summaryTotalItemsLabel")}: <b>{totalItems}</b>
              </div>
              <div>
                {tr("summaryGrandTotalLabel")}: <b>{formatNumber(grandTotal)}</b>
                {lang === "ru" ? currencyLabel || "" : tr("currencyWon")}
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>{tr("tableHeaderIndex")}</th>
                  <th>{tr("tableHeaderContent")}</th>
                  <th style={{ width: "120px" }}>{tr("tableHeaderAmount")}</th>
                  <th style={{ width: "140px" }}>{tr("tableHeaderActions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      style={{ textAlign: "center", color: "#6b7280", padding: "24px" }}
                    >
                      {tr("noItemsInTable")}
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const complete = isItemComplete(it, lang, ruCountryCode);
                    const selected = currentEditingItemId === it.id;
                    return (
                      <tr
                        key={it.id}
                        onClick={() => openEditor(it.id)}
                        style={selected ? { background: "#f8fafc" } : null}
                      >
                        <td>{idx + 1}</td>
                        <td>
                          {it.description?.trim() ? it.description : `(${tr("descDraft")})`}
                          {complete ? (
                            <span className="badge ok">{tr("badgeComplete")}</span>
                          ) : (
                            <span className="badge warn">{tr("badgeIncomplete")}</span>
                          )}
                        </td>
                        <td>{formatNumber(it.totalAmount || 0)}</td>
                        <td>
                          <button
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditor(it.id);
                            }}
                          >
                            {tr("actionEdit")}
                          </button>{" "}
                          <button
                            className="btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(it.id);
                            }}
                          >
                            {tr("actionDelete")}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="left-actions">
              <button className="btn primary" onClick={addItemAndOpen}>
                {tr("btnAddItem")}
              </button>
              <button className="btn success" onClick={generateDocument}>
                {tr("btnGenerate")}
              </button>
              <button className="btn" onClick={resetAll}>
                {tr("btnReset")}
              </button>
            </div>

            <div className="guide">
              <div className="guide-title">{tr("guideTitle")}</div>
              <div>{tr("guideLine1")}</div>
              <div>{tr("guideLine2")}</div>
              <div>{tr("guideLine3")}</div>
              <div>{tr("guideLine4")}</div>
              <div>{tr("guideLine5")}</div>
            </div>

            <div className="hint">
              {tr("hintLine1")}
              <br />
              {tr("hintLine2")}
              <br />
              {tr("hintLine3")}
            </div>
          </section>
        )}

        {(!isMobile || viewMode === "editor") && (
          <section className="panel right">
            {isMobile ? (
              <div className="mobile-editor-header">
                <button className="btn" onClick={() => setViewMode("list")}>
                  {tr("btnBackList")}
                </button>
                <div className="panel-title">{tr("detailTitle")}</div>
              </div>
            ) : (
              <div className="panel-title">{tr("detailTitle")}</div>
            )}

            {!currentItem ? (
              <div className="empty-state">{tr("emptyStateNoSelection")}</div>
            ) : (
              <div className="editor">
                {lang === "ko" && (
                  <div className="field">
                    <label>{tr("descriptionPresetLabel")}</label>
                    <select
                      value={
                        DESCRIPTION_PRESETS_KO.includes(currentItem.description || "")
                          ? currentItem.description
                          : "기타"
                      }
                      onChange={(e) => handleDescriptionPresetChange(e.target.value)}
                    >
                      {DESCRIPTION_PRESETS_KO.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {lang === "ru" && (
                  <div className="field">
                    <label>
                      {tr("countryLabel")} <span className="reqmark">*</span>
                    </label>
                    <div className="radios">
                      {COUNTRY_OPTIONS.map((opt) => (
                        <label key={opt.code}>
                          <input
                            type="radio"
                            name="countryCode"
                            value={opt.code}
                            checked={ruCountryCode === opt.code}
                            onChange={(e) => setCountryForAll(e.target.value)}
                          />{" "}
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {!ruCountryCode && (
                      <div className="field-hint error">{tr("valCountry")}</div>
                    )}
                  </div>
                )}

                <div className="field">
                  <label>{tr("fieldDescription")}</label>
                  <input
                    type="text"
                    value={currentItem.description || ""}
                    placeholder={tr("phDescription")}
                    onChange={(e) => updateItemField(currentItem.id, "description", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>{tr("fieldDate")}</label>
                  <input
                    type="date"
                    value={currentItem.date || ""}
                    onChange={(e) => updateItemField(currentItem.id, "date", e.target.value)}
                  />
                </div>

                {lang === "ru" && (
                  <>
                    <div className="field">
                      <label>{tr("fieldManagerName")}</label>
                      <input
                        type="text"
                        value={currentItem.managerName || ""}
                        onChange={(e) =>
                          updateItemField(currentItem.id, "managerName", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>{tr("fieldTelegramId")}</label>
                      <input
                        type="text"
                        value={currentItem.telegramId || ""}
                        onChange={(e) =>
                          updateItemField(currentItem.id, "telegramId", e.target.value)
                        }
                      />
                    </div>
                  </>
                )}

                {lang !== "ru" && (
                  <div className="field">
                    <label>{tr("fieldRecipientType")}</label>
                    <div className="radios">
                      <label>
                        <input
                          type="radio"
                          name="recipientType"
                          value={RECIPIENT_OTHER}
                          checked={currentItem.recipientType === RECIPIENT_OTHER}
                          onChange={(e) => handleRecipientTypeChange(e.target.value)}
                        />{" "}
                        {tr("recipientOther")}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="recipientType"
                          value={RECIPIENT_JINMO}
                          checked={currentItem.recipientType === RECIPIENT_JINMO}
                          onChange={(e) => handleRecipientTypeChange(e.target.value)}
                        />{" "}
                        {tr("recipientJinmo")}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="recipientType"
                          value={RECIPIENT_JIMIN}
                          checked={currentItem.recipientType === RECIPIENT_JIMIN}
                          onChange={(e) => handleRecipientTypeChange(e.target.value)}
                        />{" "}
                        {tr("recipientJimin")}
                      </label>
                    </div>
                  </div>
                )}

                {lang !== "ru" && (
                  <div className="recipient-box">
                    <div className="recipient-row">
                      <div className="field">
                        <label>{tr("fieldRecipientName")}</label>
                        <input
                          type="text"
                          value={currentItem.recipient || ""}
                          placeholder={tr("phRecipientName")}
                          onChange={(e) =>
                            updateItemField(currentItem.id, "recipient", e.target.value)
                          }
                        />
                        {lang === "ko" && currentItem.recipientType === RECIPIENT_OTHER && (
                          <div className="field-hint error">
                            {tr("fieldRecipientNameHelp")}
                          </div>
                        )}
                      </div>
                      <div className="field">
                        <label>{tr("fieldBank")}</label>
                        <input
                          type="text"
                          value={currentItem.bank || ""}
                          placeholder={tr("phBank")}
                          onChange={(e) => updateItemField(currentItem.id, "bank", e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>{tr("fieldAccount")}</label>
                        <input
                          type="text"
                          value={currentItem.account || ""}
                          placeholder={tr("phAccount")}
                          onChange={(e) =>
                            updateItemField(currentItem.id, "account", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="receipt-header">
                  <div className="receipt-title">{tr("receiptTitle")}</div>
                  <div className="receipt-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={async (e) => {
                        console.warn("[upload] input change", e.target?.files?.length || 0);
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          await handleFilesForItem(currentItem.id, files);
                          e.target.value = "";
                        } else {
                          setEditorErrors([tr("msgUploadCanceled")]);
                        }
                      }}
                    />
                    <button
                      className="btn primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {tr("btnAddReceipt")}
                    </button>
                  </div>
                </div>

                <div
                  className={`dropzone ${dropActive ? "dragover" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropActive(true);
                  }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDropActive(false);
                    console.warn("[upload] drop", e.dataTransfer?.files?.length || 0);
                    if (!currentItem) {
                      alert(tr("msgSelectItemBeforeDrop"));
                      return;
                    }
                    const files = e.dataTransfer?.files;
                    if (files && files.length > 0) {
                      await handleFilesForItem(currentItem.id, files);
                    } else {
                      setEditorErrors([tr("msgUploadCanceled")]);
                    }
                  }}
                >
                  {tr("dropzoneText")}
                </div>

                <div className="receipts">
                  {(!currentItem.receipts || currentItem.receipts.length === 0) && (
                    <div className="empty-state" style={{ padding: "14px" }}>
                      {tr("noReceiptsYet")}
                    </div>
                  )}
                  {(currentItem.receipts || []).map((r, idx) => (
                    <ReceiptCard
                      key={r.id}
                      receipt={r}
                      index={idx}
                      lang={lang}
                      currencyLabel={currencyLabel}
                      currentItemId={currentItem.id}
                      ocrExpanded={ocrExpanded}
                      onToggleOcr={toggleOcr}
                      onUpdateField={(receiptId, field, value) =>
                        updateReceiptField(currentItem.id, receiptId, field, value)
                      }
                      onDelete={(receiptId) => deleteReceipt(currentItem.id, receiptId)}
                      onImageClick={setModalSrc}
                    />
                  ))}
                </div>

                <div className="right-actions">
                  <button className="btn success" onClick={handleSaveCurrentItem}>
                    {tr("btnSaveItem")}
                  </button>
                </div>

                {editorErrors.length > 0 && (
                  <div className="errors">
                    {editorErrors.map((msg, idx) => (
                      <div key={`${idx}-${msg}`}>• {msg}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {modalSrc && (
        <div className="modal" onClick={() => setModalSrc("")}>
          <div className="modal-backdrop"></div>
          <div className="modal-content">
            <img src={modalSrc} alt="receipt" />
          </div>
        </div>
      )}

      {spinner.visible && (
        <div className="spinner">
          <div className="spinbox">
            <div className="loader"></div>
            <div>{spinner.text || tr("spinnerOcr")}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
