// API Configuration
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

// Local Storage Keys
export const LS_KEY = "cis_expense_data_v2";
export const LS_LANG = "cis_ui_lang";

// UI Constants
export const MOBILE_BREAKPOINT = 640;
export const MAX_FILE_SIZE_MB = 10;
export const LOCALSTORAGE_WARNING_SIZE = 4 * 1024 * 1024; // 4MB

// Recipient Constants
export const RECIPIENT_JINMO = "이진모";
export const RECIPIENT_JIMIN = "박지민";
export const RECIPIENT_OTHER = "기타";

// Country Options
export const COUNTRY_OPTIONS = [
  { code: "RUS", label: "Россия" },
  { code: "CRM", label: "Крым" },
  { code: "KAZ", label: "Казахстан" },
  { code: "UZB", label: "Узбекистан" },
  { code: "UKR", label: "Украина" }
];

export const COUNTRY_CURRENCY = {
  RUS: "рубль",
  CRM: "рубль",
  KAZ: "тенге",
  UZB: "сум",
  UKR: "гривна"
};

// Description Presets (Korean)
export const DESCRIPTION_PRESETS_KO = [
  "기타",
  "CIS지역 - 버니 서버이용료 - 월",
  "영어지역 - 버니 서버이용료- 월",
  "스페인지역 - 버니 서버이용료- 월",
  "카마테라 - 전도사이트 호스팅료- 월",
  "배알리나 숙소비 - 월"
];

// API Retry Configuration
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY_MS = 1000;
