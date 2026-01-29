# -*- coding: utf-8 -*-
"""Reusable UI components."""
from __future__ import annotations

import streamlit as st

from config import MENU_OPTIONS


def setup_page() -> None:
    """Configure Streamlit page and shared styles."""
    st.set_page_config(page_title="엑셀 병합 프로그램", layout="wide")
    st.title("엑셀 병합 프로그램")
    st.markdown(
        "<style>"
        "h1 { font-size: 24px !important; } "
        "h3 { font-size: 18px !important; } "
        ".stDownloadButton button { white-space: nowrap !important; width: auto !important; "
        "margin-right: 10px; margin-bottom: 10px; } "
        ".stDownloadButton { width: auto !important; }"
        "</style>",
        unsafe_allow_html=True,
    )


def render_menu() -> str:
    """Render top menu and return selected option."""
    return st.radio(
        "메뉴",
        MENU_OPTIONS,
        horizontal=True,
        label_visibility="collapsed",
    )
