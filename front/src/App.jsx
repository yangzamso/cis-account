
import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const LS_KEY = "cis_expense_data_v2";
const LS_LANG = "cis_ui_lang";

const RECIPIENT_JINMO = "이진모";
const RECIPIENT_JIMIN = "박지민";
const RECIPIENT_OTHER = "기타";

const accountDatabase = {
  [RECIPIENT_JINMO]: { bank: "우리", account: "928-017364-02-101" },
  [RECIPIENT_JIMIN]: { bank: "기업", account: "183-104009-01-018" }
};

const COUNTRY_OPTIONS = [
  { code: "RUS", label: "Россия" },
  { code: "CRM", label: "Крым" },
  { code: "KAZ", label: "Казахстан" },
  { code: "UZB", label: "Узбекистан" },
  { code: "UKR", label: "Украина" }
];

const COUNTRY_CURRENCY = {
  RUS: "рубль",
  CRM: "рубль",
  KAZ: "тенге",
  UZB: "сум",
  UKR: "гривна"
};

const i18n = {
  ko: {
    brandTitle: "증빙철 자동화",
    documentTitle: "증빙철 자동화",
    langLabel: "언어",
    langKo: "한국어",
    langRu: "Русский",
    naturalTranslationLabel: "자연스러운 한국어 번역",
    summaryTitle: "요약",
    summaryTotalItemsLabel: "총 항목 수",
    summaryGrandTotalLabel: "전체 합계",
    currencyWon: "원",
    tableHeaderIndex: "번호",
    tableHeaderContent: "내용",
    tableHeaderAmount: "금액",
    tableHeaderActions: "액션",
    btnAddItem: "항목 추가",
    btnGenerate: "문서 생성",
    btnReset: "초기화",
    hintLine1: "좌측 리스트: 항목 선택",
    hintLine2: "OCR 실패 시 날짜/금액 직접 입력 가능",
    hintLine3: "자동 저장 간격 30초",
    guideTitle: "사용법 안내",
    guideLine1: "1) [항목 추가]를 눌러 새 항목을 만들어요.",
    guideLine2: "2) 오른쪽에서 날짜, 상세내용을 입력해요.",
    guideLine3: "3) [영수증 추가]를 눌러 사진을 넣어요.",
    guideLine4: "4) 금액/날짜가 틀리면 직접 고쳐요.",
    guideLine5: "5) 모두 끝나면 [문서 생성]을 눌러요.",
    detailTitle: "상세 편집",
    emptyStateNoSelection: "좌측에서 항목을 선택하거나 새 항목을 추가해주세요.",
    fieldDescription: "상세 내용 *",
    phDescription: "예: 서버 사용료",
    fieldDate: "영수증 일자 *",
    fieldManagerName: "담당자 이름",
    fieldTelegramId: "텔레그램 ID",
    fieldRecipientType: "수령인 구분 *",
    recipientJinmo: "이진모",
    recipientJimin: "박지민",
    recipientOther: "기타",
    fieldRecipientName: "수령인명 *",
    phRecipientName: "예: 홍길동",
    fieldBank: "은행 *",
    phBank: "예: 국민",
    fieldAccount: "계좌번호 *",
    phAccount: "예: 000-0000-0000",
    receiptTitle: "영수증",
    btnAddReceipt: "영수증 추가",
    dropzoneText: "여기에 드래그앤드롭 / 또는 Ctrl+V로 이미지 붙여넣기",
    btnSaveItem: "저장",
    spinnerOcr: "OCR 처리 중...",
    noItemsInTable: "등록된 항목이 없습니다. 새 항목을 추가해주세요.",
    badgeIncomplete: "미완료",
    badgeComplete: "완료",
    badgeRequired: "필수",
    badgeOptional: "선택",
    badgeMultiCurrency: "다중 통화",
    descDraft: "작성 중",
    noReceiptsYet: "아직 영수증이 없습니다.",
    phReceiptDesc: "예: 택시비",
    actionEdit: "편집",
    actionDelete: "삭제",
    itemLabel: "항목",
    receiptCardTitle: "영수증",
    labelDate: "날짜",
    labelAmount: "금액 (원)",
    labelDescription: "설명 (선택)",
    ocrToggleShow: "OCR 원문 보기",
    ocrToggleHide: "OCR 원문 숨기기",
    ocrNone: "(OCR 원문 없음)",
    msgInvalidImage: "이미지 파일만 업로드 가능합니다 (JPG/PNG/WebP).",
    msgOcrFailed: "OCR 처리에 실패했습니다. 날짜/금액을 직접 입력하세요.",
    msgFileProcessFailed: "파일 처리에 실패했습니다.",
    msgUploadFailed: "업로드에 실패했습니다.",
    msgUploadCanceled: "업로드가 취소되었습니다.",
    msgNoItemsGenerate: "최소 1개 이상의 항목이 필요합니다.",
    msgGenerateFailed: "문서 생성에 실패했습니다.",
    confirmDeleteItem: "{name} 항목을 삭제할까요?",
    confirmReset: "모든 데이터를 초기화할까요?",
    confirmGeneratedReset: "문서 생성 후 초기화할까요?",
    msgItemIncomplete: "항목이 미완료 상태입니다. 필수 정보를 입력하세요.",
    valDescription: "상세 내용이 필요합니다.",
    valDate: "결제일자가 필요합니다.",
    valRecipientType: "수령인 구분이 필요합니다.",
    valReceiptRequired: "최소 1개의 영수증이 필요합니다.",
    valRecipientName: "수령인명이 필요합니다.",
    valBank: "은행명이 필요합니다.",
    valAccount: "계좌번호가 필요합니다.",
    valFirstReceiptDate: "첫 번째 영수증 날짜가 필요합니다.",
    valFirstReceiptAmount: "첫 번째 영수증 금액이 필요합니다.",
    valCountry: "국가를 선택해주세요.",
    valManagerName: "담당자 이름을 입력해주세요.",
    msgSelectItemBeforeDrop: "먼저 항목을 선택해주세요.",
    serverChecking: "서버 상태 확인 중...",
    serverConnected: "서버 연결됨 - {model}",
    serverStatus: "서버: {status} - {model}",
    serverFailed: "서버 연결 실패 (백엔드 실행/주소 확인)",
    spinnerGenerating: "문서 생성 중...",
    spinnerUploading: "영수증 업로드 중..."
  },
  ru: {
    brandTitle: "Автоматизация документов по расходам CIS",
    documentTitle: "Автоматизация документов по расходам CIS",
    langLabel: "Язык",
    langKo: "Корейский",
    langRu: "Русский",
    naturalTranslationLabel: "Естественный перевод на корейский",
    summaryTitle: "Сводка",
    summaryTotalItemsLabel: "Всего пунктов",
    summaryGrandTotalLabel: "Итоговая сумма",
    currencyWon: "KRW",
    tableHeaderIndex: "№",
    tableHeaderContent: "Содержание",
    tableHeaderAmount: "Сумма",
    tableHeaderActions: "Действия",
    btnAddItem: "Добавить пункт",
    btnGenerate: "Скачать корейский документ",
    btnReset: "Сброс",
    hintLine1: "Подсказка: пункт выбирается слева, редактируется справа.",
    hintLine2: "Фотографии чеков можно перетаскивать мышкой.",
    hintLine3: "Документ скачивается кнопкой «Скачать корейский документ».",
    guideTitle: "Инструкция",
    guideLine1: "1) Нажмите «Добавить пункт».",
    guideLine2: "2) Выберите страну и заполните дату и описание.",
    guideLine3: "3) Добавьте фото чека кнопкой «Добавить квитанцию» или перетаскиванием.",
    guideLine4: "4) Проверьте дату и сумму, при ошибке исправьте вручную.",
    guideLine5: "5) Нажмите «Скачать корейский документ».",
    detailTitle: "Детали",
    emptyStateNoSelection: "Выберите пункт слева или добавьте новый.",
    fieldDescription: "Описание *",
    phDescription: "например: плата за сервер",
    fieldDate: "Дата чека *",
    fieldManagerName: "Имя ответственного *",
    fieldTelegramId: "Telegram ID",
    fieldRecipientType: "Тип получателя *",
    recipientJinmo: "Ли Джинмо",
    recipientJimin: "Пак Чимин",
    recipientOther: "Другое",
    fieldRecipientName: "Имя получателя *",
    phRecipientName: "например: Иван Иванов",
    fieldBank: "Банк *",
    phBank: "например: KB",
    fieldAccount: "Номер счёта *",
    phAccount: "например: 000-0000-0000",
    receiptTitle: "Квитанция",
    btnAddReceipt: "Добавить квитанцию",
    dropzoneText: "Перетащите сюда / или вставьте Ctrl+V",
    btnSaveItem: "Сохранить",
    spinnerOcr: "OCR в процессе...",
    noItemsInTable: "Пока нет пунктов. Добавьте новый.",
    badgeIncomplete: "Не заполнено",
    badgeComplete: "Заполнено",
    badgeRequired: "Обязательно",
    badgeOptional: "Необязательно",
    badgeMultiCurrency: "Несколько валют",
    descDraft: "Черновик",
    noReceiptsYet: "Квитанций пока нет.",
    phReceiptDesc: "например: такси",
    actionEdit: "Редактировать",
    actionDelete: "Удалить",
    itemLabel: "Пункт",
    receiptCardTitle: "Квитанция",
    labelDate: "Дата",
    labelAmount: "Сумма",
    labelDescription: "Описание (необязательно)",
    ocrToggleShow: "Показать OCR",
    ocrToggleHide: "Скрыть OCR",
    ocrNone: "(OCR отсутствует)",
    msgInvalidImage: "Поддерживаются только изображения (JPG/PNG/WebP).",
    msgOcrFailed: "OCR не удалось. Введите дату/сумму вручную.",
    msgFileProcessFailed: "Не удалось обработать файл.",
    msgUploadFailed: "Не удалось загрузить.",
    msgUploadCanceled: "Загрузка отменена.",
    msgNoItemsGenerate: "Нужен хотя бы один пункт.",
    msgGenerateFailed: "Не удалось создать документ.",
    confirmDeleteItem: "Удалить {name}?",
    confirmReset: "Сбросить все данные?",
    confirmGeneratedReset: "Сбросить после создания?",
    msgItemIncomplete: "Пункт заполнен не полностью. Заполните обязательные поля.",
    valDescription: "Нужно описание.",
    valDate: "Нужна дата оплаты.",
    valRecipientType: "Нужно указать тип получателя.",
    valReceiptRequired: "Нужна минимум одна квитанция.",
    valRecipientName: "Нужно имя получателя.",
    valBank: "Нужен банк.",
    valAccount: "Нужен номер счёта.",
    valFirstReceiptDate: "Нужна дата первой квитанции.",
    valFirstReceiptAmount: "Нужна сумма первой квитанции.",
    valCountry: "Выберите страну.",
    valManagerName: "Введите имя ответственного.",
    msgSelectItemBeforeDrop: "Сначала выберите пункт.",
    serverChecking: "Проверка сервера...",
    serverConnected: "Сервер подключён - {model}",
    serverStatus: "Сервер: {status} - {model}",
    serverFailed: "Сервер недоступен (проверьте бэкенд)",
    spinnerGenerating: "Создание документа...",
    spinnerUploading: "Загрузка квитанции...",
    countryLabel: "Страна"
  }
};

function t(lang, key) {
  return i18n[lang]?.[key] ?? i18n.ko[key] ?? key;
}

function currencyLabelForItem(item, lang) {
  if (lang !== "ru") return t("ko", "currencyWon");
  const code = String(item?.countryCode || "").toUpperCase();
  return COUNTRY_CURRENCY[code] || "";
}

function fmt(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ""));
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
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

function revokePreviewUrl(url) {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function stripBlobPreview(receipt) {
  if (!receipt) return receipt;
  if (receipt.preview && receipt.preview.startsWith("blob:")) {
    return { ...receipt, preview: "" };
  }
  return receipt;
}

async function apiGetAccounts() {
  const res = await fetch(`${API_BASE}/api/accounts`);
  if (!res.ok) throw new Error(`accounts failed: ${res.status}`);
  return res.json();
}

async function apiUploadReceipt(file) {
  console.warn("[upload] start", { name: file?.name, size: file?.size, type: file?.type });
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload-receipt`, {
    method: "POST",
    body: fd
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`upload failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  console.warn("[upload] ok", json);
  return json;
}

async function apiOcrFromUpload(fileName) {
  const res = await fetch(`${API_BASE}/api/ocr-from-upload`, {
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

async function apiGenerateDocument(cleanItems, language, naturalTranslation) {
  const res = await fetch(`${API_BASE}/api/generate-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cleanItems, language, naturalTranslation })
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

function isItemComplete(item, lang) {
  if (!item) return false;
  if (!(item.description || "").trim()) return false;
  if (!(item.date || "").trim()) return false;
  if (lang !== "ru" && !item.recipientType) return false;
  if (lang === "ru" && !(item.countryCode || "").trim()) return false;
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
              countryCode: it.countryCode || "",
              managerName: it.managerName || "",
              telegramId: it.telegramId || "",
              totalAmount: Number(it.totalAmount) || sumReceipts(receipts),
              receipts
            };
          });
          setItems(normalized);
          setItemCounter(Number(parsed.itemCounter) || 0);
          setCurrentEditingItemId(parsed.currentEditingItemId ?? null);
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
      currentEditingItemId
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (_) {
      // ignore storage errors
    }
  }, [items, itemCounter, currentEditingItemId]);

  useEffect(() => {
    if (currentEditingItemId && !items.some((i) => i.id === currentEditingItemId)) {
      setCurrentEditingItemId(null);
    }
  }, [items, currentEditingItemId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGetAccounts();
        const model = data?.server_info?.model || "Unknown";
        const ready = !!data?.server_info?.api_ready;
        const status = data?.server_info?.status || (ready ? "OK" : "API Key missing");
        if (!mounted) return;
        setServerInfo({ state: "ready", ready, status, model });
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
  const currencyLabel = currencyLabelForItem(currentItem || items[0], lang);
  const tr = (key) => t(lang, key);

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
      countryCode: "",
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
  }

  function openEditor(itemId) {
    setCurrentEditingItemId(itemId);
    setEditorErrors([]);
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
    if (lang === "ru" && !(item.countryCode || "").trim()) errors.push(tr("valCountry"));
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
              r.id === receiptId ? { ...r, fileName: up.fileName } : r
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
      if (!isItemComplete(it, lang)) {
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
      countryCode: it.countryCode || "",
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
        lang === "ru" ? naturalTranslation : false
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
      const acc = accountDatabase[value];
      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? {
                ...it,
                recipientType: value,
                recipient: value,
                bank: acc?.bank || "",
                account: acc?.account || ""
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
          {lang === "ru" && (
            <label className="natural-translate">
              <input
                type="checkbox"
                checked={naturalTranslation}
                onChange={(e) => setNaturalTranslation(e.target.checked)}
              />
              {tr("naturalTranslationLabel")}
            </label>
          )}
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
        <section className="panel left">
          <div className="panel-title">{tr("summaryTitle")}</div>

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
                  <td colSpan="4" style={{ textAlign: "center", color: "#6b7280", padding: "24px" }}>
                    {tr("noItemsInTable")}
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const complete = isItemComplete(it, lang);
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

        <section className="panel right">
          <div className="panel-title">{tr("detailTitle")}</div>

          {!currentItem ? (
            <div className="empty-state">{tr("emptyStateNoSelection")}</div>
          ) : (
            <div className="editor">
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
                          checked={(currentItem.countryCode || "RUS") === opt.code}
                          onChange={(e) =>
                            updateItemField(currentItem.id, "countryCode", e.target.value)
                          }
                        />{" "}
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {!currentItem.countryCode && (
                    <div className="field-hint error">{tr("valCountry")}</div>
                  )}
                </div>
              )}

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
                {(currentItem.receipts || []).map((r, idx) => {
                  const required = idx === 0;
                  const ocrKey = `${currentItem.id}:${r.id}`;
                  const showOcr = !!ocrExpanded[ocrKey];
                  return (
                    <div key={r.id} className="receipt-card">
                      <div className="card-top">
                        <div>
                          {tr("receiptCardTitle")} {idx + 1}{" "}
                          {required ? (
                            <span className="badge danger">{tr("badgeRequired")}</span>
                          ) : (
                            <span className="badge">{tr("badgeOptional")}</span>
                          )}
                          {r.hasMultipleCurrency && (
                            <span className="badge warn">{tr("badgeMultiCurrency")}</span>
                          )}
                        </div>
                        <button
                          className="btn danger"
                          onClick={() => deleteReceipt(currentItem.id, r.id)}
                        >
                          {tr("actionDelete")}
                        </button>
                      </div>
                      <div className="card-body">
                        <div>
                          <img
                            className="preview"
                            src={r.preview || ""}
                            alt="preview"
                            onClick={() => r.preview && setModalSrc(r.preview)}
                          />
                        </div>
                        <div className="card-fields">
                          <div className="mini">
                            <label>
                              {tr("labelDate")} {required && <span className="reqmark">*</span>}
                            </label>
                            <input
                              type="date"
                              value={r.date || ""}
                              onChange={(e) =>
                                updateReceiptField(currentItem.id, r.id, "date", e.target.value)
                              }
                            />
                          </div>
                          <div className="mini">
                            <label>
                              {tr("labelAmount")} {required && <span className="reqmark">*</span>}
                              {lang === "ru" && currencyLabel && (
                                <span className="unit">({currencyLabel})</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={r.amount ? formatNumber(r.amount) : ""}
                              placeholder="0"
                              onChange={(e) =>
                                updateReceiptField(
                                  currentItem.id,
                                  r.id,
                                  "amount",
                                  parseAmountFromInput(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="mini">
                            <label>{tr("labelDescription")}</label>
                            <input
                              type="text"
                              value={r.description || ""}
                              placeholder={tr("phReceiptDesc")}
                              onChange={(e) =>
                                updateReceiptField(
                                  currentItem.id,
                                  r.id,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          {r.rawText ? (
                            <>
                              <div
                                className="ocr-toggle"
                                onClick={() => toggleOcr(currentItem.id, r.id)}
                              >
                                {showOcr ? tr("ocrToggleHide") : tr("ocrToggleShow")}
                              </div>
                              {showOcr && <div className="ocr-text">{r.rawText}</div>}
                            </>
                          ) : (
                            <div className="ocr-toggle" style={{ opacity: 0.6 }}>
                              {tr("ocrNone")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
