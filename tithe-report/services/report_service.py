# -*- coding: utf-8 -*-
"""Report generation service."""
from __future__ import annotations

from io import BytesIO
from typing import Any, List, Optional, Sequence, Tuple

import pandas as pd

from utils.excel_utils import (
    find_col_by_keyword,
    make_unique_columns,
    normalize_columns,
    read_excel_smart_bytes,
    to_report_excel_bytes,
)


REPORT_HEADERS = ["순번", "언어권", "이름", "고유번호", "회비", "체육회비", "미납사유", "십일조", "미납사유"]
REPORT_HEADERS_ALL = ["순번", "언어권", "부서", "이름", "고유번호", "회비", "체육회비", "미납사유", "십일조", "미납사유"]

DEPT_FILTER_YOUTH_ELDER = ("2장년", "4청년")
DEPT_FILTER_WOMEN = ("3부녀",)
TITLE_DEPT_YOUTH_ELDER = "장년회, 청년회"
TITLE_DEPT_WOMEN = "부녀회"
TITLE_DEPT_ALL = "전체"
DEPT_STATS_ORDER = (("1자문", "자문"), ("2장년", "장년"), ("3부녀", "부녀"), ("4청년", "청년"))
REGION_STATS_ORDER = (
    ("러시아(모스크바)", "러시아\\(모스크바\\)"),
    ("러시아(크림공화국)", "러시아\\(크림공화국\\)"),
    ("러시아(야쿠츠크)", "러시아\\(야쿠츠크\\)"),
    ("카자흐스탄(알마티)", "카자흐스탄\\(알마티\\)"),
    ("카자흐스탄(악토베)", "카자흐스탄\\(악토베\\)"),
    ("우즈베키스탄", "우즈베키스탄"),
    ("우크라이나", "우크라이나"),
)


def _find_col_by_order(columns: Sequence[str], keywords: List[str]) -> List[Optional[str]]:
    """Find first column containing each keyword, each column used at most once."""
    result: List[Optional[str]] = []
    used = set()
    for kw in keywords:
        found = None
        for col in columns:
            if kw in str(col) and col not in used:
                found = col
                used.add(col)
                break
        result.append(found)
    return result


def load_report_source(file_bytes: bytes) -> Optional[pd.DataFrame]:
    """Load Excel from bytes and normalize columns."""
    try:
        df = read_excel_smart_bytes(file_bytes)
    except (ValueError, TypeError, KeyError, OSError, IOError):
        df = pd.read_excel(BytesIO(file_bytes))
    df = normalize_columns(df)
    df = make_unique_columns(df)
    return df


def _resolve_report_columns(df: pd.DataFrame) -> Optional[dict]:
    """Resolve source columns for report. Returns dict of output key -> source col name, or None if critical missing."""
    cols = list(df.columns)
    dept_col = find_col_by_keyword(cols, "부서")
    if not dept_col:
        return None

    name_col = find_col_by_keyword(cols, "이름(KR)") or find_col_by_keyword(cols, "전체명단") or find_col_by_keyword(cols, "이름")
    id_col = find_col_by_keyword(cols, "고유번호")
    if not name_col or not id_col:
        return None

    region_col = find_col_by_keyword(cols, "지역")
    fee_col = find_col_by_keyword(cols, "회비", exclude="체육")
    sports_col = find_col_by_keyword(cols, "체육회비")
    tithe_col = find_col_by_keyword(cols, "십일조") or find_col_by_keyword(cols, "금액")
    attend_col = find_col_by_keyword(cols, "출결여부") or find_col_by_keyword(cols, "출결")

    unpay1, memo_col = _find_col_by_order(cols, ["미납사유", "메모"])
    if not unpay1:
        unpay1 = find_col_by_keyword(cols, "미납사유")

    return {
        "부서": dept_col,
        "지역": region_col,
        "이름": name_col,
        "고유번호": id_col,
        "회비": fee_col,
        "체육회비": sports_col,
        "미납사유": unpay1,
        "십일조": tithe_col,
        "출결여부": attend_col,
        "메모": memo_col,
    }


def _tithe_1_to_O(val: Any) -> Any:
    if pd.isna(val):
        return pd.NA
    s = str(val).strip()
    return "O" if s == "1" else (s if s else pd.NA)


def _parse_amount_report(val: Any) -> Optional[float]:
    """Parse 회비/체육회비 to number for Excel (콤마 제거)."""
    if pd.isna(val):
        return None
    s = str(val).strip().replace(",", "").replace(" ", "")
    if not s:
        return None
    try:
        return float(s) if "." in s else int(s)
    except (ValueError, TypeError):
        return None


def _amount_series(df: pd.DataFrame, col_name: Optional[str]) -> pd.Series:
    if not col_name or col_name not in df.columns:
        return pd.Series([0] * len(df), index=df.index, dtype="float")
    return df[col_name].apply(_parse_amount_report).fillna(0)


def _parse_paid_amount(val: Any) -> Tuple[bool, float]:
    amt = _parse_amount_report(val)
    if amt is not None:
        return (amt > 0, float(amt))
    if pd.isna(val):
        return (False, 0.0)
    text = str(val).strip()
    if not text:
        return (False, 0.0)
    return (True, 0.0)


def build_report_stats_lines_for_key(df: pd.DataFrame, col_map: dict, key_name: str) -> List[str]:
    """Build stats lines for a single key (십일조/회비/체육회비)."""
    dept_col = col_map.get("부서")
    value_col = col_map.get(key_name)
    if not dept_col or dept_col not in df.columns or not value_col or value_col not in df.columns:
        return []
    dept_values = df[dept_col].astype(str).str.strip()
    paid_flags = []
    amounts = []
    for val in df[value_col]:
        paid, amt = _parse_paid_amount(val)
        paid_flags.append(paid)
        amounts.append(amt)
    paid_series = pd.Series(paid_flags, index=df.index)
    amount_series = pd.Series(amounts, index=df.index)

    lines: List[str] = []
    include_amount = key_name != "십일조"
    for dept_key, label in DEPT_STATS_ORDER:
        mask = dept_values == dept_key
        total = int(mask.sum())
        paid = int((paid_series & mask).sum())
        unpaid = total - paid
        ratio = f"{(paid / total * 100):.0f}%" if total else "0%"
        if include_amount:
            paid_sum = int(round(amount_series[mask].sum()))
            paid_sum_text = f"{paid_sum:,}원"
            lines.append(f"{label}/{total}/{paid}/{unpaid}/{ratio}/{paid_sum_text}")
        else:
            lines.append(f"{label}/{total}/{paid}/{unpaid}/{ratio}")
    return lines


def build_report_stats_df(df: pd.DataFrame, col_map: dict, key_name: str) -> pd.DataFrame:
    """Build stats DataFrame for a single key (십일조/회비/체육회비) for table display."""
    dept_col = col_map.get("부서")
    value_col = col_map.get(key_name)
    if not dept_col or dept_col not in df.columns or not value_col or value_col not in df.columns:
        return pd.DataFrame(columns=["부서", "비율"])

    dept_values = df[dept_col].astype(str).str.strip()
    paid_flags = []
    for val in df[value_col]:
        paid, _ = _parse_paid_amount(val)
        paid_flags.append(paid)
    paid_series = pd.Series(paid_flags, index=df.index)

    data = []
    for dept_key, label in DEPT_STATS_ORDER:
        mask = dept_values == dept_key
        total = int(mask.sum())
        paid = int((paid_series & mask).sum())
        # unpaid = total - paid
        ratio = (paid / total * 100) if total else 0.0
        data.append({
            "부서": label,
            "비율": ratio
        })
    
    return pd.DataFrame(data)


def build_region_summary(
    df: pd.DataFrame,
    col_map: dict,
    key_name: str,
    exclude_attendance: bool = True,
) -> pd.DataFrame:
    """Build region summary table for a key (십일조/회비/체육회비)."""
    region_col = col_map.get("지역")
    value_col = col_map.get(key_name)
    if not region_col or region_col not in df.columns or not value_col or value_col not in df.columns:
        return pd.DataFrame(columns=["지역", "총인원", "납부자", "미납자", "비율"])

    region_series = df[region_col].astype(str).str.strip()
    base_df = df.copy()
    if exclude_attendance:
        attend_col = col_map.get("출결여부")
        if attend_col and attend_col in base_df.columns:
            attend_mask = ~base_df[attend_col].astype(str).str.contains("출결제외", na=False)
            base_df = base_df.loc[attend_mask].copy()
            region_series = base_df[region_col].astype(str).str.strip()

    region_values = [v for v in region_series.dropna().unique().tolist() if v and v.lower() != "nan"]
    region_values.sort()

    paid_flags = []
    for val in base_df[value_col]:
        paid, _ = _parse_paid_amount(val)
        paid_flags.append(paid)
    paid_series = pd.Series(paid_flags, index=base_df.index)

    rows = []
    totals = {"지역": "합계", "총인원": 0, "납부자": 0, "미납자": 0, "비율": 0.0}
    for region_value in region_values:
        mask = region_series == region_value
        total = int(mask.sum())
        paid = int((paid_series & mask).sum())
        unpaid = total - paid
        ratio = round((paid / total * 100), 1) if total else 0.0
        totals["총인원"] += total
        totals["납부자"] += paid
        totals["미납자"] += unpaid
        rows.append(
            {
                "지역": region_value,
                "총인원": total,
                "납부자": paid,
                "미납자": unpaid,
                "비율": ratio,
            }
        )
    if rows:
        totals["비율"] = round((totals["납부자"] / totals["총인원"] * 100), 1) if totals["총인원"] else 0.0
        rows.append(totals)
    return pd.DataFrame(rows, columns=["지역", "총인원", "납부자", "미납자", "비율"])


def filter_domestic_by_region(df: pd.DataFrame, col_map: dict) -> pd.DataFrame:
    """1차 필터: 지역 열에 '국내' 포함된 행만."""
    region_col = col_map.get("지역")
    if not region_col or region_col not in df.columns:
        return df
    mask = df[region_col].astype(str).str.contains("국내", na=False)
    return df.loc[mask].copy()


def build_report_df(
    df: pd.DataFrame,
    dept_filter: Optional[Tuple[str, ...]],
    col_map: dict,
) -> pd.DataFrame:
    """Filter by 부서 (if dept_filter) and build report rows (순번, 언어권, 이름, ...)."""
    if dept_filter is not None:
        dept_col = col_map["부서"]
        mask = df[dept_col].astype(str).str.strip().isin(dept_filter)
        sub = df.loc[mask].copy()
    else:
        sub = df.copy()

    dept_col = col_map.get("부서")
    if dept_col and dept_col in sub.columns:
        sub = sub.sort_values(by=dept_col, kind="stable")

    out = pd.DataFrame(index=sub.index)
    n = len(sub)
    out["순번"] = range(1, n + 1)
    out["언어권"] = "CIS"
    if dept_filter is None:
        out["부서"] = sub[col_map["부서"]].astype(str).fillna("")

    out["이름"] = sub[col_map["이름"]].astype(str).fillna("")
    out["고유번호"] = sub[col_map["고유번호"]].astype(str).fillna("")

    for key, src_key in [("회비", "회비"), ("체육회비", "체육회비")]:
        col = col_map.get(src_key)
        out[key] = sub[col].fillna("").astype(str) if col and col in sub.columns else ""

    unpay_col = col_map.get("미납사유")
    out["미납사유"] = sub[unpay_col].fillna("").astype(str) if unpay_col and unpay_col in sub.columns else ""

    tithe_col = col_map.get("십일조")
    if tithe_col and tithe_col in sub.columns:
        out["십일조"] = sub[tithe_col].apply(_tithe_1_to_O).fillna("").astype(str)
    else:
        out["십일조"] = ""

    memo_col = col_map.get("메모")
    out["미납사유2"] = sub[memo_col].fillna("").astype(str) if memo_col and memo_col in sub.columns else ""

    return out


def report_df_to_rows(df: pd.DataFrame, include_dept: bool = False) -> List[List[Any]]:
    """Export report DataFrame to rows for Excel. 회비/체육회비 are numeric for Excel."""
    rows: List[List[Any]] = []
    for _, r in df.iterrows():
        fee_n = _parse_amount_report(r["회비"])
        sports_n = _parse_amount_report(r["체육회비"])
        base = [r["순번"], r["언어권"]]
        if include_dept:
            base.append(r["부서"])
        base.extend([r["이름"], r["고유번호"], fee_n, sports_n, r["미납사유"], r["십일조"], r["미납사유2"]])
        rows.append(base)
    return rows


def _report_year(year_value: int) -> int:
    """설정한 년도 → 제목/파일명용 년 (년도 - 1984 + 1)."""
    return year_value - 1984 + 1


def build_report_excel_bytes(
    df: pd.DataFrame,
    dept_filter: Optional[Tuple[str, ...]],
    title_dept_name: str,
    col_map: dict,
    year_value: int,
    month_value: int,
) -> bytes:
    """Build report DataFrame, then return Excel bytes (title + headers + data)."""
    ny = _report_year(year_value)
    title = f"국제부 CIS지역 - {title_dept_name} 십일조,회비 현황 - {ny}년{month_value}월"
    include_dept = dept_filter is None
    headers = REPORT_HEADERS_ALL if include_dept else REPORT_HEADERS
    if dept_filter == DEPT_FILTER_YOUTH_ELDER:
        rows: List[List[Any]] = []
        elder_df = build_report_df(df, (DEPT_FILTER_YOUTH_ELDER[0],), col_map)
        youth_df = build_report_df(df, (DEPT_FILTER_YOUTH_ELDER[1],), col_map)
        label_width = len(headers)
        if not elder_df.empty:
            rows.append(["장년회"] + [""] * (label_width - 1))
            rows.extend(report_df_to_rows(elder_df, include_dept=False))
        if not youth_df.empty:
            rows.append(["청년회"] + [""] * (label_width - 1))
            rows.extend(report_df_to_rows(youth_df, include_dept=False))
    else:
        report_df = build_report_df(df, dept_filter, col_map)
        rows = report_df_to_rows(report_df, include_dept=include_dept)
    return to_report_excel_bytes(title, headers, rows, sheet_name="Sheet1", include_dept=include_dept)
