# -*- coding: utf-8 -*-
"""Tests for report_service."""
from __future__ import annotations

import pandas as pd

from services.report_service import (
    DEPT_FILTER_WOMEN,
    DEPT_FILTER_YOUTH_ELDER,
    TITLE_DEPT_WOMEN,
    TITLE_DEPT_YOUTH_ELDER,
    _resolve_report_columns,
    build_report_df,
    build_report_excel_bytes,
    report_df_to_rows,
)


def test_resolve_columns() -> None:
    df = pd.DataFrame({
        "부서": ["2장년"],
        "이름(KR)": ["A"],
        "고유번호": ["g1"],
        "회비": [""],
        "체육회비": [""],
        "미납사유": [""],
        "십일조(десятина)": [""],
        "메모(примечание)": [""],
    })
    m = _resolve_report_columns(df)
    assert m is not None
    assert m["부서"] == "부서"
    assert m["이름"] == "이름(KR)"
    assert m["고유번호"] == "고유번호"


def test_build_report_df_filter_and_tithe() -> None:
    df = pd.DataFrame({
        "부서": ["2장년", "4청년", "3부녀", "2장년"],
        "이름(KR)": ["A", "B", "C", "D"],
        "고유번호": ["g1", "g2", "g3", "g4"],
        "회비": ["10,000", "", "15,000", ""],
        "체육회비": ["2,000", "2,000", "", ""],
        "미납사유": ["", "출결제외", "", ""],
        "십일조(десятина)": ["1", "O", "", "1"],
        "메모(примечание)": ["", "", "재정", ""],
    })
    m = _resolve_report_columns(df)
    assert m is not None
    r1 = build_report_df(df, DEPT_FILTER_YOUTH_ELDER, m)
    r2 = build_report_df(df, DEPT_FILTER_WOMEN, m)
    assert len(r1) == 3
    assert len(r2) == 1
    assert r1["십일조"].iloc[0] == "O"
    assert r1["십일조"].iloc[2] == "O"
    rows = report_df_to_rows(r1)
    assert len(rows) == 3
    assert rows[0][7] == "O"


def test_build_report_excel_bytes() -> None:
    df = pd.DataFrame({
        "부서": ["2장년", "4청년"],
        "이름(KR)": ["A", "B"],
        "고유번호": ["g1", "g2"],
        "회비": ["10,000", ""],
        "체육회비": ["2,000", ""],
        "미납사유": ["", ""],
        "십일조(десятина)": ["1", "O"],
        "메모(примечание)": ["", ""],
    })
    m = _resolve_report_columns(df)
    assert m is not None
    b = build_report_excel_bytes(
        df, DEPT_FILTER_YOUTH_ELDER, TITLE_DEPT_YOUTH_ELDER, m, 2025, 1
    )
    assert len(b) > 0
