# -*- coding: utf-8 -*-
"""Streamlit app entrypoint."""
from __future__ import annotations

import importlib
import streamlit as st
from typing import Callable, cast


def _load_callable(module_name: str, attr_name: str) -> Callable[[], object]:
    module = importlib.import_module(module_name)
    func = getattr(module, attr_name)
    return cast(Callable[[], object], func)


def main() -> None:
    setup_page = cast(Callable[[], None], _load_callable("ui.components", "setup_page"))
    render_menu = cast(Callable[[], str], _load_callable("ui.components", "render_menu"))
    render_file_generation = cast(
        Callable[[], None], _load_callable("ui.file_generation", "render_file_generation")
    )
    render_merge = cast(Callable[[], None], _load_callable("ui.merge", "render_merge"))
    render_report_placeholder = cast(
        Callable[[], None], _load_callable("ui.report", "render_report_placeholder")
    )
    render_annual_stats = cast(
        Callable[[], None], _load_callable("ui.annual_stats", "render_annual_stats")
    )
    render_manual = cast(
        Callable[[], None], _load_callable("ui.manual", "render_manual")
    )

    setup_page()
    title_placeholder = st.empty()
    menu = render_menu()
    title_placeholder.title(f"회계처리 - {menu}")

    if menu == "취합 파일 생성":
        render_file_generation()
    elif menu == "파일 병합":
        render_merge()
    elif menu == "보고 자료 생성":
        render_report_placeholder()
    elif menu == "연간 통계":
        render_annual_stats()
    elif menu == "사용 매뉴얼":
        render_manual()


if __name__ == "__main__":
    main()
