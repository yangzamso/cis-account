import React from "react";
import { t } from "../constants/i18n";

function formatNumber(num) {
  const n = Number(num) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseAmountFromInput(s) {
  const digits = String(s ?? "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function ReceiptCard({
  receipt,
  index,
  lang,
  currencyLabel,
  currentItemId,
  ocrExpanded,
  onToggleOcr,
  onUpdateField,
  onDelete,
  onImageClick
}) {
  const required = index === 0;
  const ocrKey = `${currentItemId}:${receipt.id}`;
  const showOcr = !!ocrExpanded[ocrKey];
  const tr = (key) => t(lang, key);

  return (
    <div className="receipt-card">
      <div className="card-top">
        <div>
          {tr("receiptCardTitle")} {index + 1}{" "}
          {required ? (
            <span className="badge danger">{tr("badgeRequired")}</span>
          ) : (
            <span className="badge">{tr("badgeOptional")}</span>
          )}
          {receipt.hasMultipleCurrency && (
            <span className="badge warn">{tr("badgeMultiCurrency")}</span>
          )}
        </div>
        <button
          className="btn danger"
          onClick={() => onDelete(receipt.id)}
        >
          {tr("actionDelete")}
        </button>
      </div>
      <div className="card-body">
        <div>
          <img
            className="preview"
            src={receipt.preview || ""}
            alt="preview"
            onClick={() => receipt.preview && onImageClick(receipt.preview)}
          />
        </div>
        <div className="card-fields">
          <div className="mini">
            <label>
              {tr("labelDate")} {required && <span className="reqmark">*</span>}
            </label>
            <input
              type="date"
              value={receipt.date || ""}
              onChange={(e) => onUpdateField(receipt.id, "date", e.target.value)}
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
              value={receipt.amount ? formatNumber(receipt.amount) : ""}
              placeholder="0"
              onChange={(e) =>
                onUpdateField(receipt.id, "amount", parseAmountFromInput(e.target.value))
              }
            />
          </div>
          <div className="mini">
            <label>{tr("labelDescription")}</label>
            <input
              type="text"
              value={receipt.description || ""}
              placeholder={tr("phReceiptDesc")}
              onChange={(e) => onUpdateField(receipt.id, "description", e.target.value)}
            />
          </div>

          {receipt.rawText ? (
            <>
              <div
                className="ocr-toggle"
                onClick={() => onToggleOcr(currentItemId, receipt.id)}
              >
                {showOcr ? tr("ocrToggleHide") : tr("ocrToggleShow")}
              </div>
              {showOcr && <div className="ocr-text">{receipt.rawText}</div>}
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
}

export default React.memo(ReceiptCard);
