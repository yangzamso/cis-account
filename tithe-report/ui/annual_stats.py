# -*- coding: utf-8 -*-
"""Annual stats UI."""
from __future__ import annotations

import os
from datetime import date
from typing import Optional, Tuple

import pandas as pd
import streamlit as st

from services.annual_stats_service import build_annual_region_table, build_annual_detail_table
from services.file_service import set_folder_in_state
from utils.excel_utils import list_excel_files, to_excel_bytes


def _render_inputs() -> Tuple[Optional[str], Optional[str], bool]:
    st.subheader("1) 파일 업로드")
    source_input, source_button = st.columns([4, 1], gap="small")
    with source_input:
        source_folder = st.text_input("소스 파일 경로", key="annual_source_folder")
    with source_button:
        st.button(
            "폴더 선택",
            key="pick_annual_source_folder",
            on_click=set_folder_in_state,
            args=("annual_source_folder",),
        )

    output_input, output_button = st.columns([4, 1], gap="small")
    with output_input:
        output_folder = st.text_input("결과물 저장 폴더 경로", key="annual_output_folder")
    with output_button:
        st.button(
            "폴더 선택",
            key="pick_annual_output_folder",
            on_click=set_folder_in_state,
            args=("annual_output_folder",),
        )
    load_clicked = st.button("폴더에서 불러오기")
    return source_folder, output_folder, load_clicked


def render_annual_stats() -> None:
    left_col, right_col = st.columns([1, 2], gap="large")
    source_folder: Optional[str] = None
    output_folder: Optional[str] = None
    load_clicked = False

    with left_col:
        source_folder, output_folder, load_clicked = _render_inputs()

    with right_col:
        st.subheader("다운로드")
        if not load_clicked:
            st.info("소스 파일 경로를 입력하고 '폴더에서 불러오기'를 눌러주세요.")
            return
        if not source_folder:
            st.error("소스 파일 경로를 입력해주세요.")
            return

        source_folder = os.path.abspath(source_folder.strip())
        file_paths = list_excel_files(source_folder)
        if not file_paths:
            st.error("폴더에 엑셀 파일이 없습니다.")
            return

        table_df, year_value, years = build_annual_region_table(file_paths)
        if table_df.empty:
            if years and len(years) > 1:
                st.warning("서로 다른 연도 파일이 섞여 있습니다. 연간 통계를 생성할 수 없습니다.")
            else:
                st.info("통계를 만들 수 있는 데이터가 없습니다.")
            return

        if year_value is None:
            year_value = date.today().year
        detail_df = build_annual_detail_table(file_paths, year_value)
        if not detail_df.empty:
            sort_cols = [c for c in ["지역", "팀"] if c in detail_df.columns]
            if sort_cols:
                detail_df = detail_df.sort_values(by=sort_cols, kind="stable")
            detail_bytes = to_excel_bytes(detail_df, sheet_name="연간현황")
            st.download_button(
                "연간현황-전체인원",
                data=detail_bytes,
                file_name=f"연간현황-전체인원-{year_value}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                key="annual_detail_download",
            )
            st.write("미리보기")
            st.dataframe(detail_df.head(200), use_container_width=True, hide_index=True)

        st.subheader("결과")
        st.write(f"{year_value}년 연간 통계")
        def _highlight_total(row: pd.Series) -> list[str]:
            if row.get("지역") == "합계":
                return ["background-color: #F2F2F2"] * len(row)
            return [""] * len(row)
        display_df = table_df.copy()
        month_cols = [str(m) for m in range(1, 13)]
        empty_months = []
        for col in month_cols:
            if col in display_df.columns and (display_df[col] == 0).all():
                empty_months.append(col)
        for col in month_cols + ["평균"]:
            if col in display_df.columns:
                if col in empty_months:
                    display_df[col] = "X"
                else:
                    display_df[col] = display_df[col].apply(lambda v: f"{v:.1f}%")

        def _highlight_empty_months(_: pd.Series) -> list[str]:
            styles = []
            for col in display_df.columns:
                if col in empty_months:
                    styles.append("background-color: #FDECEC")
                else:
                    styles.append("")
            return styles

        styled = display_df.style.apply(_highlight_total, axis=1).apply(_highlight_empty_months, axis=1)
        st.dataframe(styled, use_container_width=True, hide_index=True)
        st.write("- 출결제외 인원 제외")
