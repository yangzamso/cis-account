# -*- coding: utf-8 -*-
"""Annual stats service."""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Optional, Tuple
import os
import re

import pandas as pd

from services.report_service import load_report_source, _resolve_report_columns, _parse_paid_amount
from utils.excel_utils import find_col_by_keyword

# Pre-compiled regex pattern for date parsing
_YYYYMM_RE = re.compile(r"(\d{2}|\d{4})\.(\d{2})")


def _parse_yyyymm_from_name(filename: str) -> Optional[Tuple[int, int]]:
    stem = os.path.splitext(os.path.basename(filename))[0]
    match = _YYYYMM_RE.search(stem)
    if not match:
        return None
    year_text = match.group(1)
    year = int(year_text)
    if len(year_text) == 2:
        year += 2000
    month = int(match.group(2))
    if month < 1 or month > 12:
        return None
    return (year, month)


def build_annual_region_table(file_paths: List[str]) -> Tuple[pd.DataFrame, Optional[int], List[int]]:
    """Build annual stats table: 지역 x 1..12 with row/column totals."""
    year_counts: Dict[int, int] = defaultdict(int)
    parsed_items: List[Tuple[str, int, int]] = []

    for file_path in file_paths:
        parsed = _parse_yyyymm_from_name(file_path)
        if not parsed:
            continue
        year, month = parsed
        parsed_items.append((file_path, year, month))
        year_counts[year] += 1

    if not parsed_items:
        return pd.DataFrame(), None, []

    years = sorted(year_counts.keys())
    target_year = years[0] if len(years) == 1 else None
    if target_year is None:
        return pd.DataFrame(), None, years

    totals: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    paid_counts: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))

    for file_path, year, month in parsed_items:
        if year != target_year:
            continue
        with open(file_path, "rb") as file:
            df = load_report_source(file.read())
        if df is None or df.empty:
            continue
        col_map = _resolve_report_columns(df)
        region_col = col_map.get("지역") if col_map else ("지역" if "지역" in df.columns else None)
        if not region_col or region_col not in df.columns:
            continue
        region_series = df[region_col].astype(str).str.strip()
        attend_col = col_map.get("출결여부") if col_map else None
        if attend_col and attend_col in df.columns:
            attend_mask = ~df[attend_col].astype(str).str.contains("출결제외", na=False)
            df = df.loc[attend_mask].copy()
            region_series = df[region_col].astype(str).str.strip()
        tithe_col = col_map.get("십일조") if col_map else None
        if not tithe_col or tithe_col not in df.columns:
            continue
        paid_flags = []
        for val in df[tithe_col]:
            paid, _ = _parse_paid_amount(val)
            paid_flags.append(paid)
        paid_series = pd.Series(paid_flags, index=df.index)
        for region_value, cnt in region_series.value_counts(dropna=True).items():
            label = str(region_value).strip()
            if not label or label.lower() == "nan":
                continue
            mask = region_series == label
            totals[label][month] += int(mask.sum())
            paid_counts[label][month] += int((paid_series & mask).sum())

    regions = sorted(totals.keys())
    data_rows = []
    for region in regions:
        row = {"지역": region}
        ratio_sum = 0.0
        ratio_count = 0
        for m in range(1, 13):
            total = int(totals[region].get(m, 0))
            paid = int(paid_counts[region].get(m, 0))
            ratio = round((paid / total * 100), 1) if total else 0.0
            row[str(m)] = ratio
            if total:
                ratio_sum += ratio
                ratio_count += 1
        row["평균"] = round((ratio_sum / ratio_count), 1) if ratio_count else 0.0
        data_rows.append(row)

    if not data_rows:
        return pd.DataFrame(), target_year, years

    df = pd.DataFrame(data_rows, columns=["지역"] + [str(m) for m in range(1, 13)] + ["평균"])
    total_row = {"지역": "합계"}
    for m in range(1, 13):
        values = df[str(m)].tolist()
        total_row[str(m)] = round(sum(values) / len(values), 1) if values else 0.0
    total_row["평균"] = round(sum(df["평균"].tolist()) / len(df["평균"].tolist()), 1) if not df.empty else 0.0
    df = pd.concat([df, pd.DataFrame([total_row])], ignore_index=True)

    return df, target_year, years


def build_annual_detail_table(file_paths: List[str], target_year: int) -> pd.DataFrame:
    """Build annual detail table: per person with month tithe/memo columns."""
    records: Dict[str, Dict[str, object]] = {}
    months = list(range(1, 13))

    for file_path in file_paths:
        parsed = _parse_yyyymm_from_name(file_path)
        if not parsed:
            continue
        year, month = parsed
        if year != target_year:
            continue
        with open(file_path, "rb") as file:
            df = load_report_source(file.read())
        if df is None or df.empty:
            continue

        cols = list(df.columns)
        id_col = find_col_by_keyword(cols, "고유번호")
        region_col = find_col_by_keyword(cols, "지역")
        team_col = find_col_by_keyword(cols, "팀")
        dept_col = find_col_by_keyword(cols, "부서")
        name_kr_col = find_col_by_keyword(cols, "이름(KR)") or find_col_by_keyword(cols, "이름")
        name_ru_col = find_col_by_keyword(cols, "이름(RU)") or find_col_by_keyword(cols, "이름(ru)")
        attend_col = find_col_by_keyword(cols, "출결여부") or find_col_by_keyword(cols, "출결")
        tithe_col = find_col_by_keyword(cols, "십일조") or find_col_by_keyword(cols, "금액")
        memo_col = find_col_by_keyword(cols, "메모") or find_col_by_keyword(cols, "미납사유")

        for idx, row in df.iterrows():
            key = str(row.get(id_col, "")).strip() if id_col else ""
            if not key:
                name_key = str(row.get(name_kr_col, "")).strip() if name_kr_col else ""
                key = f"{name_key}-{idx}"
            if key not in records:
                records[key] = {
                    "고유번호": row.get(id_col, "") if id_col else "",
                    "지역": row.get(region_col, "") if region_col else "",
                    "팀": row.get(team_col, "") if team_col else "",
                    "부서": row.get(dept_col, "") if dept_col else "",
                    "이름(KR)": row.get(name_kr_col, "") if name_kr_col else "",
                    "이름(RU)": row.get(name_ru_col, "") if name_ru_col else "",
                    "출결여부": row.get(attend_col, "") if attend_col else "",
                }
                for m in months:
                    records[key][f"{m}월 십일조"] = ""
                    records[key][f"{m}월 메모"] = ""

            tithe_value = row.get(tithe_col, "") if tithe_col else ""
            memo_value = row.get(memo_col, "") if memo_col else ""
            records[key][f"{month}월 십일조"] = tithe_value if not pd.isna(tithe_value) else ""
            records[key][f"{month}월 메모"] = memo_value if not pd.isna(memo_value) else ""

    if not records:
        return pd.DataFrame()

    columns = [
        "고유번호",
        "지역",
        "팀",
        "부서",
        "이름(KR)",
        "이름(RU)",
        "출결여부",
    ]
    for m in months:
        columns.append(f"{m}월 십일조")
        columns.append(f"{m}월 메모")

    return pd.DataFrame(records.values(), columns=columns)
