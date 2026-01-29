# -*- coding: utf-8 -*-
"""Report UI."""
from __future__ import annotations

import streamlit as st


def render_report_placeholder() -> None:
    """Render placeholder for report mode."""
    left_col, right_col = st.columns([1, 2], gap="large")
    with left_col:
        st.subheader("국내 / 전체")
        st.radio("", ["국내", "전체"], horizontal=True)
        st.subheader("1) 파일 업로드")
        st.file_uploader(
            "엑셀 파일을 선택하세요.",
            type=["xlsx", "xls"],
            accept_multiple_files=False,
        )

    with right_col:
        tabs = st.tabs(["결과", "미리보기", "원본데이터"])
        with tabs[0]:
            st.info("보고 자료 생성은 추후 업데이트 예정입니다.")
