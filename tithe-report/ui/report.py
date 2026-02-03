# -*- coding: utf-8 -*-
"""Report UI."""
from __future__ import annotations

import logging
from datetime import date
import os
import re
from typing import Optional

import pandas as pd
import streamlit as st
import altair as alt

from services.report_service import (
    DEPT_FILTER_WOMEN,
    DEPT_FILTER_YOUTH_ELDER,
    TITLE_DEPT_ALL,
    TITLE_DEPT_WOMEN,
    TITLE_DEPT_YOUTH_ELDER,
    _report_year,
    _resolve_report_columns,
    build_region_summary,
    build_report_stats_lines_for_key,
    build_report_stats_df,
    build_report_excel_bytes,
    filter_domestic_by_region,
    load_report_source,
)

LOGGER = logging.getLogger(__name__)


def render_report_placeholder() -> None:
    """Render placeholder for report mode."""
    left_col, right_col = st.columns([1, 2], gap="large")
    region: Optional[str] = None
    year_val: int = date.today().year
    month_val: int = date.today().month

    with left_col:
        st.subheader("1) 파일 업로드")
        upload = st.file_uploader(
            "엑셀 파일을 선택하세요.",
            type=["xlsx", "xls"],
            accept_multiple_files=False,
        )
        if upload is None:
            st.info("엑셀 파일을 업로드하면 결과가 표시됩니다.")

        if upload is not None:
            st.subheader("2) 날짜 선택")
            today = date.today()
            default_year = today.year
            default_month = today.month
            stem = os.path.splitext(upload.name)[0]
            match = re.search(r"(\d{4})\.(\d{2})$", stem)
            if match:
                try:
                    y = int(match.group(1))
                    m = int(match.group(2))
                    if 1 <= m <= 12:
                        default_year = y
                        default_month = m
                except (TypeError, ValueError):
                    pass
            yc, mc = st.columns(2)
            with yc:
                year_val = st.number_input(
                    "연도",
                    min_value=2000,
                    max_value=2100,
                    value=default_year,
                    step=1,
                    key="report_year",
                )
            with mc:
                month_val = st.selectbox(
                    "월",
                    list(range(1, 13)),
                    index=default_month - 1,
                    key="report_month",
                )

            st.subheader("3) 국내 / 해외 선택")
            region = st.radio(
                "",
                ["국내", "해외"],
                horizontal=True,
                index=None,
                key="report_region",
            )

    raw_df: Optional[pd.DataFrame] = None
    if upload is not None:
        try:
            raw_df = load_report_source(upload.getvalue())
        except (ValueError, TypeError, KeyError, OSError, IOError) as exc:
            st.error(f"파일을 읽는 중 오류가 발생했습니다: {exc}")
            LOGGER.exception("파일 읽기 오류")
            raw_df = None

    with right_col:
        tabs = st.tabs(["결과", "미리보기", "원본데이터"])
        with tabs[0]:
            if upload is None:
                pass
            elif region is None:
                st.info("국내 또는 해외를 선택해주세요.")
            elif region == "해외":
                col_map = _resolve_report_columns(raw_df)
                if col_map is None:
                    st.error("필수 열(부서, 이름, 고유번호)을 찾을 수 없습니다. 업로드 파일 형식을 확인해주세요.")
                else:
                    summary_df = build_region_summary(raw_df, col_map, "십일조", exclude_attendance=True)
                    if not summary_df.empty:
                        st.subheader(f"십일조 현황 - {year_val}년 {month_val}월")
                        display_df = summary_df.copy()
                        def _ratio_bar(val: float) -> str:
                            blocks = 10
                            filled = max(0, min(blocks, int(round(val / 10))))
                            bar = "█" * filled + "░" * (blocks - filled)
                            return f"{bar} {val:.1f}%"
                        display_df["비율"] = display_df["비율"].apply(_ratio_bar)
                        def _highlight_total(row: pd.Series) -> list[str]:
                            if row.get("지역") == "합계":
                                return ["background-color: #F2F2F2"] * len(row)
                            return [""] * len(row)
                        styled = display_df.style.apply(_highlight_total, axis=1)
                        st.dataframe(styled, use_container_width=True, hide_index=True)
                        st.write("- 출결제외 인원은 포함되지 않았습니다.")
                    st.subheader("십일조 보고 양식")
                    st.write("부서/총인원/납부자/미납자/비율")
                    st.write("출결 제외한 통계입니다.")
                    region_col = col_map.get("지역")
                    if not region_col or region_col not in raw_df.columns:
                        st.info("지역 컬럼을 찾을 수 없습니다.")
                    else:
                        attend_col = col_map.get("출결여부")
                        region_series = raw_df[region_col].astype(str).str.strip()
                        region_values = [v for v in region_series.dropna().unique().tolist() if v and v.lower() != "nan"]
                        region_values.sort()
                        region_items = []
                        for region_value in region_values:
                            mask = region_series == region_value
                            region_df = raw_df.loc[mask].copy()
                            if attend_col and attend_col in region_df.columns:
                                attend_mask = ~region_df[attend_col].astype(str).str.contains("출결제외", na=False)
                                region_df = region_df.loc[attend_mask].copy()
                            lines = build_report_stats_lines_for_key(region_df, col_map, "십일조")
                            region_items.append((region_value, lines))

                        for i in range(0, len(region_items), 3):
                            cols = st.columns(3)
                            for j, col in enumerate(cols):
                                idx = i + j
                                if idx >= len(region_items):
                                    break
                                label, lines = region_items[idx]
                                with col:
                                    st.subheader(label)
                                    st.text_area(
                                        "",
                                        value="\n".join(lines),
                                        height=200,
                                        key=f"stats_overseas_{idx}",
                                    )
            elif raw_df is None:
                st.error("엑셀 파일을 읽을 수 없습니다.")
            else:
                col_map = _resolve_report_columns(raw_df)
                if col_map is None:
                    st.error("필수 열(부서, 이름, 고유번호)을 찾을 수 없습니다. 업로드 파일 형식을 확인해주세요.")
                else:
                    domestic_df = filter_domestic_by_region(raw_df, col_map)
                    ny = _report_year(year_val)
                    base = "CIS-십일조회비 통합"
                    month_text = f"{month_val:02d}"
                    fn_all = f"{base}-{TITLE_DEPT_ALL}-{ny}.{month_text}.xlsx"
                    fn_ye = f"{base}-{TITLE_DEPT_YOUTH_ELDER}-{ny}.{month_text}.xlsx"
                    fn_w = f"{base}-{TITLE_DEPT_WOMEN}-{ny}.{month_text}.xlsx"

                    st.subheader("다운로드")
                    b_all = build_report_excel_bytes(
                        domestic_df, None, TITLE_DEPT_ALL, col_map, year_val, month_val
                    )
                    st.download_button(
                        "국내전체 XLSX 다운로드",
                        data=b_all,
                        file_name=fn_all,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        key="report_all",
                    )
                    b_ye = build_report_excel_bytes(
                        domestic_df,
                        DEPT_FILTER_YOUTH_ELDER,
                        TITLE_DEPT_YOUTH_ELDER,
                        col_map,
                        year_val,
                        month_val,
                    )
                    st.download_button(
                        "장년, 청년 XLSX 다운로드",
                        data=b_ye,
                        file_name=fn_ye,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        key="report_youth_elder",
                    )
                    b_w = build_report_excel_bytes(
                        domestic_df,
                        DEPT_FILTER_WOMEN,
                        TITLE_DEPT_WOMEN,
                        col_map,
                        year_val,
                        month_val,
                    )
                    st.download_button(
                        "부녀 XLSX 다운로드",
                        data=b_w,
                        file_name=fn_w,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        key="report_women",
                    )
                    st.divider()
                    st.subheader(f"국내 현황 - {year_val}년 {month_val}월")
                    st.caption("- 자문회는 회비/체육회비 납부대상이 아닙니다.")
                    # 데이터 및 텍스트 미리 준비
                    tithe_df = build_report_stats_df(domestic_df, col_map, "십일조")
                    tithe_lines = build_report_stats_lines_for_key(domestic_df, col_map, "십일조")
                    
                    fee_df = build_report_stats_df(domestic_df, col_map, "회비")
                    fee_lines = build_report_stats_lines_for_key(domestic_df, col_map, "회비")
                    
                    sports_df = build_report_stats_df(domestic_df, col_map, "체육회비")
                    sports_lines = build_report_stats_lines_for_key(domestic_df, col_map, "체육회비")

                    col_tithe, col_fee, col_sports = st.columns(3)
                    
                    prog_config = {
                        "비율": st.column_config.ProgressColumn(
                            "비율",
                            format="%.1f%%",
                            min_value=0,
                            max_value=100,
                        )
                    }

                    # 1. 통계 표 (상단)
                    with col_tithe:
                        st.subheader("십일조")
                        if not tithe_df.empty:
                            st.dataframe(
                                tithe_df,
                                column_config=prog_config,
                                hide_index=True,
                                use_container_width=True
                            )

                    with col_fee:
                        st.subheader("회비")
                        if not fee_df.empty:
                            st.dataframe(
                                fee_df,
                                column_config=prog_config,
                                hide_index=True,
                                use_container_width=True
                            )

                    with col_sports:
                        st.subheader("체육회비")
                        if not sports_df.empty:
                            st.dataframe(
                                sports_df,
                                column_config=prog_config,
                                hide_index=True,
                                use_container_width=True
                            )

                    # 2. 텍스트 보고 양식 (하단)
                    st.markdown("###### 텍스트 보고 양식")
                    t1, t2, t3 = st.columns(3)
                    with t1:
                        st.text_area("십일조", value="\n".join(tithe_lines), height=200, key="stats_tithe", label_visibility="collapsed")
                    with t2:
                        st.text_area("회비", value="\n".join(fee_lines), height=200, key="stats_fee", label_visibility="collapsed")
                    with t3:
                        st.text_area("체육회비", value="\n".join(sports_lines), height=200, key="stats_sports", label_visibility="collapsed")

        with tabs[1]:
            if raw_df is not None:
                st.dataframe(raw_df.head(100))
            else:
                st.write("미리보기")

        with tabs[2]:
            if raw_df is not None:
                st.dataframe(raw_df)
            else:
                st.write("원본데이터")
