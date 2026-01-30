# -*- coding: utf-8 -*-
"""File generation helpers."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import pandas as pd

from config import FILE_GEN_OUTPUT_COLUMNS


def normalize_header_key(value: Any) -> str:
    text = str(value).strip().lower()
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[^0-9a-z가-힣]", "", text)
    return text


def find_column_by_key(df: pd.DataFrame, target: str) -> Optional[str]:
    target_key = normalize_header_key(target)
    for col in df.columns:
        if normalize_header_key(col) == target_key:
            return col
    if "출결" in target_key:
        for col in df.columns:
            if "출결" in normalize_header_key(col):
                return col
    return None


def build_overseas_output(df: pd.DataFrame) -> pd.DataFrame:
    required = [
        "고유번호",
        "지역",
        "팀",
        "구역",
        "부서",
        "이름(KR)",
        "이름(RU)",
        "출결여부",
    ]
    data: Dict[str, pd.Series] = {}
    for label in required:
        if label == "팀":
            col = find_column_by_key(df, "팀") or find_column_by_key(df, "국가")
        else:
            col = find_column_by_key(df, label)
        if col:
            data[label] = df[col]
        else:
            data[label] = pd.Series([pd.NA] * len(df), index=df.index)
    data["금액(десятина)"] = pd.Series([pd.NA] * len(df), index=df.index)
    data["메모(примечание)"] = pd.Series([pd.NA] * len(df), index=df.index)
    order = required + ["금액(десятина)", "메모(примечание)"]
    return pd.DataFrame({key: data[key] for key in order})


def number_to_emoji(num_text: str) -> str:
    mapping = {
        "0": "0️⃣",
        "1": "1️⃣",
        "2": "2️⃣",
        "3": "3️⃣",
        "4": "4️⃣",
        "5": "5️⃣",
        "6": "6️⃣",
        "7": "7️⃣",
        "8": "8️⃣",
        "9": "9️⃣",
    }
    return "".join(mapping.get(ch, ch) for ch in num_text)


def _crm_title(month_value: int | None, year_value: int | None) -> str:
    month_names = {
        1: "Январь",
        2: "Февраль",
        3: "Март",
        4: "Апрель",
        5: "Май",
        6: "Июнь",
        7: "Июль",
        8: "Август",
        9: "Сентябрь",
        10: "Октябрь",
        11: "Ноябрь",
        12: "Декабрь",
    }
    month_name = month_names.get(month_value or 0, "")
    year_text = str(year_value or "")
    return f"Крымская Республика – Отчёт по десятине за {month_name} {year_text} год".strip()


def _crm_area_title(area_text: str) -> str:
    match = re.search(r"\d+", area_text)
    return f"Ячейка {number_to_emoji(match.group(0))}" if match else "Ячейка"


def build_crm_text(df: pd.DataFrame, month_value: int | None, year_value: int | None) -> str:
    title = _crm_title(month_value, year_value)
    id_col = find_column_by_key(df, "고유번호") or "고유번호"
    name_col = find_column_by_key(df, "이름(RU)") or "이름(RU)"
    area_col = find_column_by_key(df, "구역") or "구역"
    lines: List[str] = [title, "", "🍎Крымская Республика", ""]
    new_believer_lines: List[str] = []
    for area_name, area_df in df.groupby(area_col, dropna=False, sort=False):
        area_text = str(area_name).strip()
        block_lines: List[str] = [_crm_area_title(area_text)]
        for _, row in area_df.iterrows():
            member_id = "" if pd.isna(row.get(id_col)) else str(row.get(id_col))
            name_ru = "" if pd.isna(row.get(name_col)) else str(row.get(name_col))
            block_lines.append(f"{member_id} / {name_ru} /")
        block_lines.append("")
        if bool(re.search(r"^새|새신자", area_text)):
            new_believer_lines.extend(block_lines)
        else:
            lines.extend(block_lines)
    if new_believer_lines:
        lines.extend(["🍏Новые верующие", ""])
        lines.extend(new_believer_lines)
    return "\n".join(lines).rstrip() + "\n"


def build_domestic_text(
    df: pd.DataFrame,
    allowed_areas: set,
    header: str,
    emoji: str,
    display_replace: dict[str, str] | None = None,
) -> str:
    lines: List[str] = []
    if header:
        lines.append(header)
        lines.append("")
    repl = display_replace or {}
    for area_name, area_df in df.groupby("구역", dropna=False, sort=False):
        normalized_area = re.sub(r"\s+", "", str(area_name))
        if not any(re.search(pattern, normalized_area) for pattern in allowed_areas):
            continue
        display_area = "미지정구역" if str(area_name) == "미지정구역" else str(area_name)
        for old, new in repl.items():
            display_area = display_area.replace(old, new)
        lines.append(f"{emoji} {display_area}")
        for _, row in area_df.iterrows():
            name = str(row.get("이름(KR)", ""))
            lines.append(f"{name}/")
        lines.append("")
    return "\n".join(lines).rstrip() + ("\n" if lines else "")
