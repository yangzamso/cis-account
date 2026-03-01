# -*- coding: utf-8 -*-
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
    render_report_converter = cast(Callable[[], None], _load_callable("ui.report_converter", "render_report_converter"))
    render_manual = cast(Callable[[], None], _load_callable("ui.manual", "render_manual"))

    setup_page()
    title_placeholder = st.empty()
    menu = render_menu()
    title_placeholder.title(f"월말 보고서 - {menu}")

    if menu == "보고서 변환":
        render_report_converter()
    elif menu == "사용 매뉴얼":
        render_manual()


if __name__ == "__main__":
    main()
