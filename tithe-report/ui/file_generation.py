# -*- coding: utf-8 -*-
"""File generation UI."""
from __future__ import annotations

import logging
import os
import re
from datetime import date
from io import BytesIO
from typing import Dict, List, Optional, Tuple

import pandas as pd
import streamlit as st

from config import COLUMN_ALIASES, FILE_GEN_OUTPUT_COLUMNS, FILE_GEN_REQUIRED_COLUMNS, REGION_CONFIGS
from services.file_generation_service import build_crm_text, build_domestic_text, build_overseas_output
from services.file_service import load_header_presets, pick_folder_dialog, save_header_presets
from utils.excel_utils import normalize_header_text, to_excel_bytes
from utils.validators import build_rename_map, detect_header_row

LOGGER = logging.getLogger(__name__)


def _build_aliases() -> Dict[str, List[str]]:
    normalized_aliases = {
        key: [normalize_header_text(alias) for alias in aliases]
        for key, aliases in COLUMN_ALIASES.items()
    }
    return {key: [normalize_header_text(key)] + normalized_aliases.get(key, []) for key in FILE_GEN_REQUIRED_COLUMNS}


def _read_uploaded_file(upload) -> Optional[pd.DataFrame]:
    try:
        return pd.read_excel(BytesIO(upload.getvalue()))
    except (ValueError, TypeError, OSError, IOError) as exc:
        st.error(f"{upload.name} 읽기 실패: {exc}")
        LOGGER.exception("Failed to read uploaded file")
        return None


def _rebuild_with_header_detection(upload, required_aliases: Dict[str, List[str]]) -> Tuple[Optional[pd.DataFrame], Optional[Dict[str, str]], List[str]]:
    data = BytesIO(upload.getvalue())
    preview = pd.read_excel(data, header=None)
    header_row = detect_header_row(preview, FILE_GEN_REQUIRED_COLUMNS, required_aliases)
    data.seek(0)
    df = pd.read_excel(data, header=header_row) if header_row is not None else pd.read_excel(data, header=0)
    return build_rename_map(df, FILE_GEN_REQUIRED_COLUMNS, required_aliases)


def _render_left_panel(required_aliases: Dict[str, List[str]]) -> Tuple[Optional[pd.DataFrame], Optional[Dict[str, str]], Optional[str], Optional[int], Optional[int], Optional[str]]:
    source_df = None
    rename_map = None
    yy_mm = None
    year_value = None
    month_value = None
    region_mode = None
    st.subheader("1) 파일 업로드")
    upload = st.file_uploader("엑셀 파일을 선택하세요.", type=["xlsx", "xls"], accept_multiple_files=False)
    if not upload:
        st.info("엑셀 파일을 업로드하면 결과가 표시됩니다.")
        return None, None, None, None, None, None
    source_df = _read_uploaded_file(upload)
    if source_df is None:
        return None, None, None, None, None, None

    source_df, rename_map, missing = build_rename_map(source_df, FILE_GEN_REQUIRED_COLUMNS, required_aliases)
    source_cols = list(source_df.columns)
    if missing or all(str(col).startswith("Unnamed") for col in source_df.columns):
        source_df, rename_map, missing = _rebuild_with_header_detection(upload, required_aliases)
        source_cols = list(source_df.columns)
    if missing:
        st.error("업로드한 파일에서 필요한 컬럼을 찾지 못했습니다.\n" f"필요 컬럼: {missing}\n" f"업로드 컬럼: {source_cols}")
        LOGGER.error("Missing required columns: %s", missing)
        return None, None, None, None, None, None

    st.subheader("2) 날짜 선택")
    today = date.today()
    year_col, month_col = st.columns(2)
    with year_col:
        year_value = st.number_input("년도", min_value=2000, max_value=2100, value=today.year, step=1)
    with month_col:
        month_value = st.selectbox("월", list(range(1, 13)), index=today.month - 1)
    yy_mm = f"{year_value % 100:02d}.{month_value:02d}"

    st.subheader("3) 국내 / 해외 선택")
    region_mode = st.radio("", ["국내", "해외"], horizontal=True, index=None)
    return source_df, rename_map, yy_mm, year_value, month_value, region_mode


def _build_standardized_df(source_df: pd.DataFrame, rename_map: Dict[str, str]) -> pd.DataFrame:
    standardized_df = source_df.rename(columns=rename_map).copy()

    # 번호 컬럼 처리 - 원본에 있으면 사용, 없으면 빈값
    if "번호" not in standardized_df.columns:
        number_col = None
        for col in source_df.columns:
            col_str = str(col).lower().strip()
            if col_str in ("번호", "no", "no.", "순번"):
                number_col = col
                break
        if number_col:
            standardized_df["번호"] = source_df[number_col]
        # 없으면 reindex에서 fill_value=pd.NA로 빈값 처리됨

    for col in source_df.columns:
        if "출결" in str(col) and "출결여부" not in standardized_df.columns:
            standardized_df["출결여부"] = source_df[col]
        if "금액" in str(col) and "금액" not in standardized_df.columns:
            standardized_df["금액"] = source_df[col]
        if "메모" in str(col) and "메모" not in standardized_df.columns:
            standardized_df["메모"] = source_df[col]
    for col in ("출결여부", "금액", "메모"):
        if col not in standardized_df.columns:
            standardized_df[col] = pd.NA
    return standardized_df.reindex(columns=FILE_GEN_OUTPUT_COLUMNS, fill_value=pd.NA)


def _build_region_files(overseas_df: pd.DataFrame, yy_mm: str, year_value: int, month_value: int) -> List[Tuple[str, bytes]]:
    region_files: List[Tuple[str, bytes]] = []
    for config in REGION_CONFIGS:
        if config.code == "CRM":
            continue
        filter_col = config.column
        keyword = "|".join(config.keywords)
        if filter_col not in overseas_df.columns:
            continue
        series = overseas_df[filter_col].astype(str)
        mask = series.str.contains(keyword, na=False)
        matched_values = sorted(series[mask].dropna().unique().tolist())
        if not matched_values:
            continue
        file_bytes = to_excel_bytes(
            overseas_df,
            sheet_name="tithe",
            autofilter={"column": filter_col, "value": matched_values},
            hide_rows=~mask,
        )
        region_files.append((f"CIS-TITHE-{config.code}-{yy_mm}.xlsx", file_bytes))

    crm_mask = overseas_df.get("팀", pd.Series([], dtype=object)).astype(str).str.contains("크림", na=False)
    if crm_mask.any():
        crm_text = build_crm_text(overseas_df[crm_mask].copy(), month_value, year_value)
        region_files.append((f"CIS-TITHE-CRM-{yy_mm}.txt", crm_text.encode("utf-8")))
    return region_files


def _save_region_files(region_files: List[Tuple[str, bytes]]) -> None:
    """
    Prompts the user to select a folder and saves all generated files there.
    Overwrites existing files without asking, to avoid Streamlit rerun issues.
    """
    target_folder = pick_folder_dialog()
    if not target_folder:
        st.info("저장할 폴더를 선택하지 않았습니다.")
        return

    saved_count = 0
    try:
        for filename, data_bytes in region_files:
            full_path = os.path.join(target_folder, filename)
            with open(full_path, "wb") as file:
                file.write(data_bytes)
            saved_count += 1
        st.success(f"총 {saved_count}개 파일을 저장했습니다: {target_folder}")
    except (OSError, IOError) as exc:
        st.error(f"저장 중 오류가 발생했습니다: {exc}")
        LOGGER.exception("Failed to save region files")


def _render_overseas_download(source_df: pd.DataFrame, yy_mm: str, year_value: int, month_value: int) -> None:
    overseas_df = build_overseas_output(source_df)
    region_files = _build_region_files(overseas_df, yy_mm, year_value, month_value)
    if not region_files:
        return
    if st.button("전체 저장"):
        _save_region_files(region_files)
    st.divider()
    label_map = {config.code: config.label for config in REGION_CONFIGS}
    order = ["KOR", "RUS", "YAK", "CRM", "KAZ", "UZB", "UKR"]
    items: List[Tuple[str, str, bytes]] = []
    for filename, data_bytes in region_files:
        code = filename.split("-")[2] if "-" in filename else ""
        items.append((code, filename, data_bytes))
    items.sort(key=lambda x: order.index(x[0]) if x[0] in order else 999)
    for idx, (code, filename, data_bytes) in enumerate(items):
        base_label = label_map.get(code, code)
        is_txt = filename.lower().endswith(".txt")
        suffix = "TXT 다운로드" if is_txt else "XLSX 다운로드"
        mime = "text/plain" if is_txt else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        st.download_button(f"{base_label} {suffix}", data=data_bytes, file_name=filename, mime=mime, key=f"region_download_{code}_{idx}_{yy_mm}")


def _render_domestic_text(standardized_df: pd.DataFrame) -> None:
    st.subheader("보고 자료 텍스트 생성")
    presets = load_header_presets()
    preset_choice = st.radio("머리글 기본값", ["기타", "십일조", "회비-청장년", "회비-부녀", "회비-청년"], horizontal=True, key="domestic_header_preset")
    if "domestic_header_text" not in st.session_state:
        st.session_state["domestic_header_text"] = presets.get(preset_choice, "")
    if "domestic_header_preset_last" not in st.session_state:
        st.session_state["domestic_header_preset_last"] = preset_choice
    if preset_choice != st.session_state["domestic_header_preset_last"]:
        st.session_state["domestic_header_text"] = presets.get(preset_choice, "")
        st.session_state["domestic_header_preset_last"] = preset_choice
        st.session_state["header_saved"] = False

    domestic_header = st.text_area("4) 머리글 설정", height=140, placeholder="머리글 또는 안내문을 입력해주세요.", key="domestic_header_text")
    gen_col, save_col = st.columns([1, 1])
    with gen_col:
        generate_domestic = st.button("문단 생성")
    with save_col:
        if preset_choice != "기타" and st.button("머리글 저장"):
            presets[preset_choice] = st.session_state["domestic_header_text"]
            save_header_presets(presets)
            st.session_state["header_saved"] = True
            st.session_state["domestic_header_saved_text"] = st.session_state["domestic_header_text"]

    domestic_df = standardized_df[standardized_df["지역"].astype(str).str.contains("국내", na=False)].copy()
    if generate_domestic:
        header_text = (domestic_header or "").strip()
        normalize_area = lambda value: re.sub(r"\s+", "", str(value))
        adult_text = build_domestic_text(domestic_df, {r"청장"}, header_text, "💙")
        women_text = build_domestic_text(domestic_df, {r"^[1-5]구역$", r"^신유구역$"}, header_text, "💖")
        youth_text = build_domestic_text(domestic_df, {r"청(?!장).*구역"}, header_text, "💛")
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            st.subheader("청장년부")
            st.text_area("", value=adult_text, height=240, key="domestic_adult")
        with col_b:
            st.subheader("부녀부")
            st.text_area("", value=women_text, height=240, key="domestic_women")
        with col_c:
            st.subheader("청년부")
            st.text_area("", value=youth_text, height=240, key="domestic_youth")


def _render_domestic_download(output_df: pd.DataFrame, yy_mm: str) -> None:
    hide_rows = ~output_df["지역"].astype(str).str.contains("국내", na=False)

    # KOR 파일에만 회비/체육회비/미납사유 3개 열 추가 (빈 데이터)
    kor_df = output_df.copy()
    kor_df["회비"] = pd.NA
    kor_df["체육회비"] = pd.NA
    kor_df["미납사유"] = pd.NA

    kor_bytes = to_excel_bytes(kor_df, sheet_name="tithe", autofilter={"column": "지역", "value": "국내"}, hide_rows=hide_rows)
    st.download_button("지역명 XLSX 다운로드", data=kor_bytes, file_name=f"CIS-TITHE-KOR-{yy_mm}.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", key=f"kor_template_{yy_mm}")


def render_file_generation() -> None:
    required_aliases = _build_aliases()
    left_col, right_col = st.columns([1, 2], gap="large")
    with left_col:
        source_df, rename_map, yy_mm, year_value, month_value, region_mode = _render_left_panel(required_aliases)
    with right_col:
        tabs = st.tabs(["결과", "미리보기", "원본 데이터"])
        if source_df is None or rename_map is None or yy_mm is None or region_mode is None:
            return
        output_df = _build_standardized_df(source_df, rename_map)
        with tabs[0]:
            st.subheader("다운로드")
            if region_mode == "해외":
                _render_overseas_download(source_df, yy_mm, year_value, month_value)
            else:
                _render_domestic_download(output_df, yy_mm)
                _render_domestic_text(output_df)
        with tabs[1]:
            st.write("미리보기")
            st.dataframe(output_df.head(50))
        with tabs[2]:
            st.write("원본 데이터")
            st.dataframe(source_df.head(50))
