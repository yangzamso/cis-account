# -*- coding: utf-8 -*-
"""Excel-related utility functions."""
from __future__ import annotations

import os
import re
from io import BytesIO
from typing import Any, Dict, List, Optional, Sequence, Tuple

import pandas as pd
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

from config import NAME_KR_WIDTH, NAME_RU_WIDTH


def clean_amount(value: Any) -> Any:
    """Normalize amount values to numeric or NA."""
    if pd.isna(value):
        return pd.NA
    text = str(value).strip()
    if not text:
        return pd.NA
    text = text.replace(" ", "")
    text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", "-", ".", "-."}:
        return pd.NA
    return pd.to_numeric(text, errors="coerce")


def clean_amount_vectorized(series: pd.Series) -> pd.Series:
    """Vectorized amount normalization for a series."""
    if series.empty:
        return series
    mask = series.isna()
    text = series.astype(str).str.strip()
    text = text.str.replace(" ", "", regex=False)
    text = text.str.replace(",", ".", regex=False)
    text = text.str.replace(r"[^0-9.\-]", "", regex=True)
    text = text.replace({"": pd.NA, "-": pd.NA, ".": pd.NA, "-.": pd.NA})
    out = pd.to_numeric(text, errors="coerce")
    out = out.where(~mask, pd.NA)
    return out


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names by trimming and cleaning invisible characters."""
    cleaned = []
    for col in df.columns:
        text = str(col)
        text = text.replace("\ufeff", "")
        text = text.replace("\u200b", "")
        text = text.replace("\xa0", " ")
        text = text.strip()
        if "출결" in text and "출결여부" not in text:
            text = "출결여부"
        cleaned.append(text)
    df.columns = cleaned
    return df


def normalize_header_text(value: Any) -> str:
    """Normalize header text by removing whitespace and invisible chars."""
    text = str(value)
    text = text.replace("\ufeff", "")
    text = text.replace("\u200b", "")
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", "", text)
    return text


def read_excel_smart_bytes(file_bytes: bytes) -> pd.DataFrame:
    """Read Excel data with flexible header detection."""
    data = BytesIO(file_bytes)
    sheets = pd.read_excel(data, sheet_name=None, header=None)
    for sheet_name, sheet_df in sheets.items():
        max_scan = min(len(sheet_df), 20)
        for row_idx in range(max_scan):
            row = sheet_df.iloc[row_idx].tolist()
            normalized = [normalize_header_text(x) for x in row]
            if "고유번호" in normalized and "지역" in normalized:
                header = sheet_df.iloc[row_idx].tolist()
                df = sheet_df.iloc[row_idx + 1 :].copy()
                df.columns = header
                df = normalize_columns(df)
                df["__sheet"] = sheet_name
                return df

            if row_idx + 1 < max_scan:
                next_row = sheet_df.iloc[row_idx + 1].tolist()
                combined = [
                    normalize_header_text(a) + normalize_header_text(b)
                    for a, b in zip(row, next_row)
                ]
                if "고유번호" in combined and "지역" in combined:
                    df = sheet_df.iloc[row_idx + 2 :].copy()
                    df.columns = combined
                    df = normalize_columns(df)
                    df["__sheet"] = sheet_name
                    return df
    data.seek(0)
    df = pd.read_excel(data)
    df = normalize_columns(df)
    df["__sheet"] = 0
    return df


def read_excel_smart_path(file_path: str) -> pd.DataFrame:
    """Read Excel data from a file path with flexible header detection."""
    with open(file_path, "rb") as file:
        return read_excel_smart_bytes(file.read())


def list_excel_files(folder_path: str) -> List[str]:
    """List Excel files in a folder, excluding temporary files."""
    if not os.path.isdir(folder_path):
        return []
    files: List[str] = []
    for name in os.listdir(folder_path):
        if name.startswith("~$"):
            continue
        lower = name.lower()
        if lower.endswith(".xlsx") or lower.endswith(".xls"):
            files.append(os.path.join(folder_path, name))
    return sorted(files)


def list_yyyymm_subfolders(folder_path: str) -> List[str]:
    """List YYYY.MM subfolders under a path."""
    if not os.path.isdir(folder_path):
        return []
    results: List[str] = []
    for entry in os.scandir(folder_path):
        if not entry.is_dir():
            continue
        name = entry.name.strip()
        if re.match(r"^\d{4}\.\d{2}$", name):
            results.append(name)
    return sorted(results)


def make_unique_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure dataframe columns are unique to avoid concat reindex errors."""
    seen: Dict[str, int] = {}
    new_cols: List[str] = []
    for col in df.columns:
        base = str(col)
        if base in seen:
            seen[base] += 1
            new_cols.append(f"{base}.{seen[base]}")
        else:
            seen[base] = 0
            new_cols.append(base)
    df.columns = new_cols
    return df


def _apply_header_style(ws: Any) -> None:
    header_fill = PatternFill(fill_type="solid", fgColor="D9D9D9")
    header_font = Font(size=10, bold=True)
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font


def _auto_size_columns(ws: Any) -> None:
    for col_idx, col_cells in enumerate(ws.columns, start=1):
        max_len = 0
        for cell in col_cells:
            value = cell.value
            if value is None:
                continue
            max_len = max(max_len, len(str(value)))
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = min(max_len + 2, 60)


def _apply_name_widths(ws: Any) -> None:
    for col_idx, cell in enumerate(ws[1], start=1):
        header_text = normalize_header_text(cell.value).lower()
        if header_text == normalize_header_text("이름(kr)").lower():
            ws.column_dimensions[get_column_letter(col_idx)].width = NAME_KR_WIDTH
        elif header_text == normalize_header_text("이름(ru)").lower():
            ws.column_dimensions[get_column_letter(col_idx)].width = NAME_RU_WIDTH


def _apply_filter(ws: Any, df: pd.DataFrame, autofilter: Dict[str, Any]) -> None:
    max_row = ws.max_row
    max_col = ws.max_column
    ws.auto_filter.ref = f"A1:{get_column_letter(max_col)}{max_row}"
    filter_col = df.columns.get_loc(autofilter["column"])
    filter_value = autofilter.get("value")
    values = filter_value if isinstance(filter_value, list) else [filter_value]
    ws.auto_filter.add_filter_column(filter_col, values)


def _apply_hide_rows(ws: Any, hide_rows: pd.Series) -> None:
    for row_idx, should_hide in enumerate(hide_rows, start=2):
        if bool(should_hide):
            ws.row_dimensions[row_idx].hidden = True


def apply_sheet_style(
    ws: Any,
    df: pd.DataFrame,
    autofilter: Optional[Dict[str, Any]] = None,
    hide_rows: Optional[pd.Series] = None,
) -> None:
    """Apply shared Excel styling to a worksheet."""
    font = Font(size=10)
    for row in ws.iter_rows():
        for cell in row:
            cell.font = font
    _apply_header_style(ws)
    _auto_size_columns(ws)
    _apply_name_widths(ws)
    ws.freeze_panes = "A2"
    if autofilter:
        _apply_filter(ws, df, autofilter)
    if hide_rows is not None:
        _apply_hide_rows(ws, hide_rows)


def to_excel_bytes(
    df: pd.DataFrame,
    sheet_name: str = "Sheet1",
    autofilter: Optional[Dict[str, Any]] = None,
    hide_rows: Optional[pd.Series] = None,
) -> bytes:
    """Serialize dataframe to styled Excel bytes."""
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name)
        ws = writer.book[sheet_name]
        apply_sheet_style(ws, df, autofilter=autofilter, hide_rows=hide_rows)
    return output.getvalue()


def write_excel_sheets(file_path: str, sheets: Sequence[Tuple[str, pd.DataFrame]]) -> None:
    """Write multiple sheets to an Excel file with shared styling."""
    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        for sheet_name, df in sheets:
            df.to_excel(writer, index=False, sheet_name=sheet_name)
            ws = writer.book[sheet_name]
            apply_sheet_style(ws, df)


def to_excel_multi_bytes(sheets: Sequence[Tuple[str, pd.DataFrame]]) -> bytes:
    """Serialize multiple sheets to styled Excel bytes."""
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        for sheet_name, df in sheets:
            df.to_excel(writer, index=False, sheet_name=sheet_name)
            ws = writer.book[sheet_name]
            apply_sheet_style(ws, df)
    return output.getvalue()
