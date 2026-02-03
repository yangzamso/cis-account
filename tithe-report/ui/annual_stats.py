# -*- coding: utf-8 -*-
"""Annual stats UI."""
from __future__ import annotations

import logging
import os
import tempfile
import zipfile
from datetime import date
from io import BytesIO
from typing import List, Optional, Tuple

import pandas as pd
import streamlit as st

from services.annual_stats_service import build_annual_region_table, build_annual_detail_table
from utils.excel_utils import list_excel_files, to_excel_bytes

LOGGER = logging.getLogger(__name__)


def _extract_files_to_temp(uploaded_files: List[object]) -> Tuple[str, List[str]]:
    """업로드된 파일들을 임시 폴더에 해제/저장하고 엑셀 파일 목록 반환."""
    temp_dir = tempfile.mkdtemp()
    excel_files: List[str] = []

    for uploaded_file in uploaded_files:
        if uploaded_file.name.lower().endswith(".zip"):
            try:
                with zipfile.ZipFile(BytesIO(uploaded_file.getvalue()), "r") as zf:
                    zf.extractall(temp_dir)
                excel_files.extend(list_excel_files(temp_dir))
            except zipfile.BadZipFile:
                st.error(f"올바른 ZIP 파일이 아닙니다: {uploaded_file.name}")
        else:
            file_path = os.path.join(temp_dir, uploaded_file.name)
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getvalue())
            excel_files.append(file_path)
    
    return temp_dir, excel_files


def _display_summary_table(table_df: pd.DataFrame) -> None:
    """연간 통계 요약표 스타일링 및 출력."""
    def _highlight_total(row: pd.Series) -> list[str]:
        if row.get("지역") == "평균":
            return ["background-color: #F2F2F2; font-weight: bold"] * len(row)
        return [""] * len(row)

    display_df = table_df.copy()
    month_cols = [f"{m}월" for m in range(1, 13)]
    empty_months = []
    for col in month_cols:
        if col in display_df.columns and (display_df[col] == 0).all():
            empty_months.append(col)
    
    for col in month_cols + ["평균"]:
        if col in display_df.columns:
            if col in empty_months:
                display_df[col] = "-"
            else:
                display_df[col] = display_df[col].apply(lambda v: f"{v:.1f}%" if isinstance(v, (int, float)) else v)

    styled = display_df.style.apply(_highlight_total, axis=1)
    st.dataframe(styled, use_container_width=True, hide_index=True)
    st.caption("- 출결제외 인원 제외")


def _render_view_only_mode(uploaded_file) -> None:
    """연간 통계 파일(결과물) 단순 조회 모드."""
    st.success(f"연간 통계 파일('{uploaded_file.name}')을 확인합니다.")
    try:
        df = pd.read_excel(uploaded_file)
        st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as exc:
        st.error(f"파일을 읽는 중 오류가 발생했습니다: {exc}")


def _render_generation_mode(uploaded_files: List[object]) -> None:
    """파일 병합 및 통계 생성 모드."""
    temp_dir, excel_files = _extract_files_to_temp(uploaded_files)

    if not excel_files:
        st.error("업로드된 파일에서 엑셀 파일을 찾을 수 없습니다.")
        return

    try:
        # 요약표 생성
        table_df, year_value, years = build_annual_region_table(excel_files)
    except Exception as exc:
        st.error(f"데이터 분석 중 오류가 발생했습니다: {exc}")
        LOGGER.exception("Annual stats generation error")
        return

    if table_df.empty:
        if years and len(years) > 1:
            st.warning("서로 다른 연도 파일이 섞여 있어 통계를 생성할 수 없습니다.")
        else:
            st.info("통계를 산출할 데이터가 부족합니다.")
        return

    if year_value is None:
        year_value = date.today().year

    # 상세 데이터 생성 및 다운로드
    try:
        detail_df = build_annual_detail_table(excel_files, year_value)
    except Exception as exc:
        st.error(f"상세 데이터 생성 중 오류: {exc}")
        return

    if not detail_df.empty:
        sort_cols = [c for c in ["지역", "팀"] if c in detail_df.columns]
        if sort_cols:
            detail_df = detail_df.sort_values(by=sort_cols, kind="stable")
        
        file_name = f"CIS-십일조-연간통계-{year_value}년.xlsx"
        detail_bytes = to_excel_bytes(detail_df, sheet_name="연간현황")
        
        st.subheader("다운로드")
        st.download_button(
            file_name,
            data=detail_bytes,
            file_name=file_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            key="annual_stats_download_final"
        )

    # 화면에 요약표 출력
    st.subheader(f"{year_value}년 연간 통계")
    _display_summary_table(table_df)


def render_annual_stats() -> None:
    """연간 통계 메인 (통합)."""
    
    left_col, right_col = st.columns([1, 2], gap="large")

    with left_col:
        st.subheader("1) 파일 업로드")
        uploaded_files = st.file_uploader(
            "", 
            type=["zip", "xlsx", "xls"], 
            accept_multiple_files=True, 
            label_visibility="collapsed",
            key="annual_stats_uploader_main"
        )
        if not uploaded_files:
            st.info("ZIP 파일 또는 엑셀파일을 업로드해주세요.")
    
    with right_col:
        tabs = st.tabs(["결과"])
        with tabs[0]:
            if not uploaded_files:
                return

            # 모드 결정 로직
            # 조건: 파일 1개이고 이름에 '연간'이 포함된 엑셀 파일 -> 뷰어 모드
            is_view_mode = False
            target_file = None

            if len(uploaded_files) == 1:
                f = uploaded_files[0]
                fname = f.name
                if "연간" in fname and fname.lower().endswith((".xlsx", ".xls")):
                    is_view_mode = True
                    target_file = f

            if is_view_mode:
                _render_view_only_mode(target_file)
            else:
                _render_generation_mode(uploaded_files)
