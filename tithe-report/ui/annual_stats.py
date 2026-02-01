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
from services.merge_service import run_subfolder_merge
from utils.excel_utils import list_excel_files, list_yyyymm_subfolders, to_excel_bytes

LOGGER = logging.getLogger(__name__)


def _extract_zip_to_temp(zip_file) -> str:
    """ZIP 파일을 임시 폴더에 압축 해제하고 경로 반환."""
    temp_dir = tempfile.mkdtemp()
    with zipfile.ZipFile(BytesIO(zip_file.getvalue()), "r") as zf:
        zf.extractall(temp_dir)
    return temp_dir


def _render_zip_upload(key_suffix: str) -> Tuple[Optional[str], List[str], List[str]]:
    """ZIP 파일 업로드 공통 UI (병합 모드용).

    Returns:
        (temp_dir, subfolders, excel_files)
    """
    st.subheader("1) ZIP 파일 업로드")
    uploaded_file = st.file_uploader(
        "ZIP 파일을 선택하세요",
        type=["zip"],
        accept_multiple_files=False,
        key=f"annual_zip_upload_{key_suffix}",
    )

    if not uploaded_file:
        st.info("월별 병합 파일이 들어있는 ZIP 파일을 업로드해주세요.")
        return None, [], []

    try:
        temp_dir = _extract_zip_to_temp(uploaded_file)

        # YYYY.MM 하위 폴더 검색
        subfolders = list_yyyymm_subfolders(temp_dir)

        # 엑셀 파일 직접 검색
        excel_files = list_excel_files(temp_dir)

        if subfolders:
            st.success(f"ZIP 파일에서 {len(subfolders)}개의 월별 폴더를 찾았습니다: {', '.join(subfolders)}")
        elif excel_files:
            st.success(f"ZIP 파일에서 {len(excel_files)}개의 엑셀 파일을 찾았습니다.")
        else:
            st.error("ZIP 파일에 엑셀 파일이 없고, YYYY.MM 형식의 하위 폴더도 없습니다.")
            return None, [], []

        return temp_dir, subfolders, excel_files

    except zipfile.BadZipFile:
        st.error("올바른 ZIP 파일이 아닙니다.")
        return None, [], []
    except Exception as exc:
        st.error(f"ZIP 파일 처리 중 오류: {exc}")
        LOGGER.exception("Failed to process ZIP file")
        return None, [], []


def _render_file_upload_stats() -> Tuple[Optional[str], List[str]]:
    """통계 모드용 파일 업로드 UI (ZIP 또는 개별 엑셀 파일).

    Returns:
        (temp_dir, excel_files): temp_dir은 임시 폴더 경로, excel_files는 파일 경로 목록
    """
    st.subheader("1) 파일 업로드")
    uploaded_files = st.file_uploader(
        "ZIP 파일 또는 엑셀 파일을 선택하세요",
        type=["zip", "xlsx", "xls"],
        accept_multiple_files=True,
        key="annual_stats_file_upload",
    )

    if not uploaded_files:
        st.info("ZIP 파일 또는 엑셀 파일을 업로드해주세요.")
        return None, []

    temp_dir = tempfile.mkdtemp()
    excel_files: List[str] = []

    for uploaded_file in uploaded_files:
        file_name = uploaded_file.name.lower()

        if file_name.endswith(".zip"):
            # ZIP 파일 처리
            try:
                with zipfile.ZipFile(BytesIO(uploaded_file.getvalue()), "r") as zf:
                    zf.extractall(temp_dir)
                # 압축 해제된 폴더에서 엑셀 파일 검색
                excel_files.extend(list_excel_files(temp_dir))
            except zipfile.BadZipFile:
                st.error(f"올바른 ZIP 파일이 아닙니다: {uploaded_file.name}")
        else:
            # 개별 엑셀 파일 처리 - 임시 폴더에 저장
            file_path = os.path.join(temp_dir, uploaded_file.name)
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getvalue())
            excel_files.append(file_path)

    if excel_files:
        st.success(f"{len(excel_files)}개의 엑셀 파일을 찾았습니다.")
    else:
        st.error("업로드된 파일에서 엑셀 파일을 찾을 수 없습니다.")

    return temp_dir, excel_files


def _render_merge_mode() -> None:
    """병합 모드: ZIP 업로드 -> YYYY.MM 폴더 배치 병합."""
    left_col, right_col = st.columns([1, 2], gap="large")

    with left_col:
        temp_dir, subfolders, _ = _render_zip_upload("merge")

        if temp_dir and subfolders:
            st.session_state["annual_merge_temp_dir"] = temp_dir
            st.session_state["annual_merge_subfolders"] = subfolders

    with right_col:
        st.subheader("병합 결과")

        temp_dir = st.session_state.get("annual_merge_temp_dir")
        subfolders = st.session_state.get("annual_merge_subfolders", [])

        if not temp_dir or not subfolders:
            st.info("YYYY.MM 형식의 하위 폴더가 포함된 ZIP 파일을 업로드해주세요.")
            return

        if st.button("병합 실행 및 다운로드", key="annual_merge_execute"):
            try:
                output_temp_dir = tempfile.mkdtemp()

                with st.spinner("병합 처리 중..."):
                    saved, per_folder_results = run_subfolder_merge(
                        temp_dir, output_temp_dir, subfolders, True, None, None
                    )

                if saved == 0:
                    st.error("병합된 파일이 없습니다.")
                    return

                # 결과물을 ZIP으로 압축
                zip_buffer = BytesIO()
                with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                    for root, _, files in os.walk(output_temp_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, output_temp_dir)
                            zf.write(file_path, arcname)
                zip_buffer.seek(0)

                st.success(f"병합 완료: {saved}개 파일 생성")
                if per_folder_results:
                    st.text("\n".join(per_folder_results))

                st.download_button(
                    "결과 ZIP 다운로드",
                    data=zip_buffer.getvalue(),
                    file_name="연간_병합결과.zip",
                    mime="application/zip",
                    key="annual_merge_download",
                )

            except (OSError, IOError) as exc:
                st.error(f"병합 실패: {exc}")
                LOGGER.exception("Failed to merge and create ZIP")


def _render_stats_mode() -> None:
    """통계 모드: 파일 업로드 -> 연간 통계 생성."""
    left_col, right_col = st.columns([1, 2], gap="large")

    with left_col:
        temp_dir, excel_files = _render_file_upload_stats()
        load_clicked = st.button("통계 생성", key="annual_stats_generate")

    with right_col:
        st.subheader("다운로드")

        if not load_clicked:
            st.info("파일을 업로드하고 '통계 생성'을 눌러주세요.")
            return

        if not excel_files:
            st.error("엑셀 파일을 업로드해주세요.")
            return

        file_paths = excel_files

        try:
            table_df, year_value, years = build_annual_region_table(file_paths)
        except (ValueError, TypeError, KeyError, OSError, IOError) as exc:
            st.error(f"연간 통계 생성 중 오류가 발생했습니다: {exc}")
            LOGGER.exception("연간 통계 생성 오류")
            return

        if table_df.empty:
            if years and len(years) > 1:
                st.warning("서로 다른 연도 파일이 섞여 있습니다. 연간 통계를 생성할 수 없습니다.")
            else:
                st.info("통계를 만들 수 있는 데이터가 없습니다.")
            return

        if year_value is None:
            year_value = date.today().year

        try:
            detail_df = build_annual_detail_table(file_paths, year_value)
        except (ValueError, TypeError, KeyError, OSError, IOError) as exc:
            st.error(f"상세 테이블 생성 중 오류가 발생했습니다: {exc}")
            LOGGER.exception("상세 테이블 생성 오류")
            return

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


def render_annual_stats() -> None:
    """연간 통계 메인 - 메뉴 선택 후 해당 모드 렌더링."""
    st.subheader("1) 메뉴 선택")
    menu_mode = st.radio(
        "메뉴 선택",
        ["병합", "통계"],
        horizontal=True,
        key="annual_stats_menu",
        label_visibility="collapsed",
    )

    st.divider()

    if menu_mode == "병합":
        _render_merge_mode()
    else:
        _render_stats_mode()
