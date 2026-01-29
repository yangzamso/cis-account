# -*- coding: utf-8 -*-
"""Validation and header detection helpers."""
from __future__ import annotations

import re
from typing import Any, Dict, Optional, Sequence, Tuple

import pandas as pd

from utils.excel_utils import normalize_columns, normalize_header_text


def detect_header_row(
    df_preview: pd.DataFrame,
    required_columns: Sequence[str],
    required_aliases: Dict[str, Sequence[str]],
) -> Optional[int]:
    """Detect the most likely header row in an Excel preview."""
    header_row: Optional[int] = None
    best_hits = 0
    for idx in range(min(len(df_preview), 100)):
        row_values = [normalize_header_text(v) for v in df_preview.iloc[idx].tolist()]
        hits = 0
        for required in required_columns:
            candidates = required_aliases.get(required, [normalize_header_text(required)])
            if any(c in row_values for c in candidates):
                hits += 1
        if hits > best_hits:
            best_hits = hits
            header_row = idx
        if hits >= max(2, len(required_columns) // 2):
            break
    return header_row if best_hits >= 2 else None


def build_rename_map(
    df: pd.DataFrame,
    required_columns: Sequence[str],
    required_aliases: Dict[str, Sequence[str]],
) -> Tuple[pd.DataFrame, Dict[str, str], list[str]]:
    """Normalize columns and build rename map for required columns."""
    df = normalize_columns(df)
    source_cols = list(df.columns)
    normalized_cols = {normalize_header_text(col): col for col in source_cols}
    rename_map: Dict[str, str] = {}
    missing: list[str] = []
    for required in required_columns:
        candidates = required_aliases.get(required, [normalize_header_text(required)])
        found = None
        for candidate in candidates:
            if candidate in normalized_cols:
                found = normalized_cols[candidate]
                break
        if not found:
            missing.append(required)
        else:
            rename_map[found] = required
    return df, rename_map, missing


def build_region_pattern(keywords: Any) -> str:
    """Build regex pattern for region keywords."""
    if isinstance(keywords, str):
        keywords = [keywords]
    escaped = [re.escape(word) for word in keywords if word]
    return "|".join(escaped)


def filter_by_region(df: pd.DataFrame, keywords: Any) -> pd.DataFrame:
    """Filter dataframe rows by region keywords."""
    pattern = build_region_pattern(keywords)
    if not pattern:
        return df.iloc[0:0].copy()
    return df[df["지역"].astype(str).str.contains(pattern, na=False)].copy()
