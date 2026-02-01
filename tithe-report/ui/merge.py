# -*- coding: utf-8 -*-
"""Merge UI."""
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

from config import MERGE_OUTPUT_FILENAME_PATTERN
from services.merge_service import (
    build_merge_frames,
    build_merge_frames_from_paths,
    compute_merge_views,
    optimize_merge_df,
    run_subfolder_merge,
)
from services.translation_service import list_text_models, set_merge_translate_state, translate_memos
from utils.excel_utils import list_excel_files, list_yyyymm_subfolders, to_excel_multi_bytes, write_excel_sheets

LOGGER = logging.getLogger(__name__)


def _extract_zip_to_temp(zip_file) -> str:
    """ZIP 파일을 임시 폴더에 압축 해제하고 경로 반환."""
    temp_dir = tempfile.mkdtemp()
    with zipfile.ZipFile(BytesIO(zip_file.getvalue()), "r") as zf:
        zf.extractall(temp_dir)
    return temp_dir


def _render_file_upload() -> Tuple[Optional[pd.DataFrame], Optional[str], bool]:
    """통합 파일 업로드 UI - ZIP, XLSX, XLS 자동 처리."""
    st.subheader("1) 파일 업로드")
    uploaded_files = st.file_uploader(
        "파일을 선택하세요 (ZIP, XLSX, XLS)",
        type=["zip", "xlsx", "xls"],
        accept_multiple_files=True,
    )

    if not uploaded_files:
        st.info("ZIP 파일 또는 엑셀 파일을 업로드하면 결과가 표시됩니다.")
        return None, None, False

    # ZIP 파일이 있는지 확인
    zip_files = [f for f in uploaded_files if f.name.lower().endswith(".zip")]
    excel_files = [f for f in uploaded_files if f.name.lower().endswith((".xlsx", ".xls"))]

    if zip_files and excel_files:
        st.warning("ZIP 파일과 엑셀 파일을 동시에 업로드할 수 없습니다. 하나만 선택해주세요.")
        return None, None, False

    if zip_files:
        # ZIP 파일 처리 (폴더 모드)
        if len(zip_files) > 1:
            st.warning("ZIP 파일은 하나만 업로드해주세요.")
            return None, None, False
        return _handle_zip_upload(zip_files[0])
    else:
        # 엑셀 파일 처리 (파일 모드)
        return _handle_excel_upload(excel_files)


def _handle_zip_upload(zip_file) -> Tuple[Optional[pd.DataFrame], Optional[str], bool]:
    """ZIP 파일 업로드 처리 - 폴더 로직 적용."""
    try:
        temp_dir = _extract_zip_to_temp(zip_file)
        st.session_state["merge_temp_dir"] = temp_dir

        # 엑셀 파일 직접 검색
        excel_files = list_excel_files(temp_dir)
        if excel_files:
            frames = build_merge_frames_from_paths(excel_files)
            if frames:
                raw_df = pd.concat(frames, ignore_index=True, copy=False)
                raw_df = optimize_merge_df(raw_df)
                st.session_state["folder_merge_raw_df"] = raw_df
                st.session_state["merge_subfolder_mode"] = False
                st.success(f"ZIP 파일에서 {len(excel_files)}개의 엑셀 파일을 불러왔습니다.")
                return raw_df, temp_dir, False

        # YYYY.MM 하위 폴더 검색
        subfolders = list_yyyymm_subfolders(temp_dir)
        if subfolders:
            st.session_state["merge_subfolders"] = sorted(subfolders)
            st.session_state["merge_subfolder_mode"] = True
            st.session_state["merge_source_folder"] = temp_dir
            st.success(f"ZIP 파일에서 {len(subfolders)}개의 월별 폴더를 찾았습니다.")
            return None, temp_dir, True

        st.error("ZIP 파일에 엑셀 파일이 없고, YYYY.MM 형식의 하위 폴더도 없습니다.")
        return None, None, False

    except zipfile.BadZipFile:
        st.error("올바른 ZIP 파일이 아닙니다.")
        return None, None, False
    except Exception as exc:
        st.error(f"ZIP 파일 처리 중 오류: {exc}")
        LOGGER.exception("Failed to process ZIP file")
        return None, None, False


def _handle_excel_upload(excel_files: List) -> Tuple[Optional[pd.DataFrame], Optional[str], bool]:
    """엑셀 파일 업로드 처리."""
    file_items = [(file.name, file.getvalue()) for file in excel_files]
    frames = build_merge_frames(file_items)
    if not frames:
        return None, None, False
    merged = pd.concat(frames, ignore_index=True, copy=False)
    st.success(f"{len(excel_files)}개의 엑셀 파일을 불러왔습니다.")
    return optimize_merge_df(merged), None, False


def _render_date_selector(folder_batch_mode: bool, raw_df: Optional[pd.DataFrame]) -> Optional[str]:
    if raw_df is None and not folder_batch_mode:
        return None
    if raw_df is not None and "고유번호" not in raw_df.columns:
        st.error("모든 파일에 '고유번호' 컬럼이 필요합니다.")
        return None
    st.subheader("2) 날짜 선택")
    today = date.today()
    year_col, month_col = st.columns(2)
    with year_col:
        year_value = st.number_input("년도", min_value=2000, max_value=2100, value=today.year, step=1, disabled=folder_batch_mode)
    with month_col:
        month_value = st.selectbox("월", list(range(1, 13)), index=today.month - 1, disabled=folder_batch_mode)
    return f"{year_value}.{month_value:02d}"


def _render_translation(raw_df: Optional[pd.DataFrame], folder_batch_mode: bool) -> Optional[pd.DataFrame]:
    st.subheader("3) 번역 설정 (선택)")
    api_key_input = st.text_input("Gemini API 키", type="password", key="merge_api_key").strip()
    model_name: Optional[str] = None
    model_state_key = "merge_translate_model"
    if api_key_input:
        try:
            available_models = list_text_models(api_key_input)
        except (RuntimeError, ValueError, TypeError, AttributeError) as exc:
            st.error(f"모델 목록 조회 실패: {exc}")
            LOGGER.exception("Failed to list models")
            available_models = []
        if available_models:
            model_name = st.selectbox("번역 모델 선택", available_models, index=0, key="merge_translate_model")
        else:
            model_state_key = "merge_translate_model_input"
            model_name = st.text_input("번역 모델명 직접 입력", value="gemini-2.5-flash", help="모델 목록을 가져오지 못했으면 직접 입력하세요.", key="merge_translate_model_input")
    memo_available = raw_df is not None and "메모" in raw_df.columns
    if api_key_input and (memo_available or folder_batch_mode):
        if st.button("번역 실행", on_click=set_merge_translate_state, args=(model_state_key, "merge_api_key")):
            try:
                if not model_name:
                    raise RuntimeError("사용 가능한 모델을 찾지 못했습니다.")
                if folder_batch_mode:
                    st.success("번역 설정이 저장되었습니다. 저장 시 반영됩니다.")
                else:
                    with st.spinner("번역 중..."):
                        raw_df = translate_memos(raw_df, api_key_input, model_name)
                    st.session_state["folder_merge_raw_df"] = raw_df
                    st.success("번역을 완료했습니다.")
            except (RuntimeError, ValueError, TypeError) as exc:
                st.error(f"번역 실패: {exc}")
                LOGGER.exception("Translation failed")
    elif raw_df is not None and not memo_available:
        st.info("'메모' 컬럼이 없어 번역을 건너뜁니다.")
    return raw_df


def _render_download_tab(
    yy_mm: Optional[str],
    folder_batch_mode: bool,
    temp_dir: Optional[str],
    merged_view: Optional[pd.DataFrame],
    duplicate_report_view: Optional[pd.DataFrame],
) -> None:
    st.subheader("다운로드")

    if not folder_batch_mode:
        # 단일 파일 다운로드
        if merged_view is None or duplicate_report_view is None:
            return
        merged_bytes = to_excel_multi_bytes([("병합결과", merged_view), ("중복리포트", duplicate_report_view)])
        st.download_button(
            "병합결과 다운로드",
            data=merged_bytes,
            file_name=MERGE_OUTPUT_FILENAME_PATTERN.format(yy_mm=yy_mm),
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        return

    # ZIP 폴더 배치 모드 - 결과물을 ZIP으로 다운로드
    source_folder = st.session_state.get("merge_source_folder") or temp_dir
    if not source_folder:
        st.info("ZIP 파일을 업로드해주세요.")
        return

    if st.button("병합 실행 및 다운로드"):
        try:
            subfolders = st.session_state.get("merge_subfolders") or list_yyyymm_subfolders(source_folder)
            if not subfolders:
                st.error("처리할 하위 폴더가 없습니다.")
                return

            # 임시 출력 폴더 생성
            output_temp_dir = tempfile.mkdtemp()
            translate_model = st.session_state.get("merge_translate_model_value")
            translate_api_key = st.session_state.get("merge_translate_api_key")

            with st.spinner("병합 처리 중..."):
                saved, per_folder_results = run_subfolder_merge(
                    source_folder, output_temp_dir, subfolders, True, translate_model, translate_api_key
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
                file_name="병합결과.zip",
                mime="application/zip",
            )

        except (OSError, IOError) as exc:
            st.error(f"병합 실패: {exc}")
            LOGGER.exception("Failed to merge and create ZIP")


def render_merge() -> None:
    left_col, right_col = st.columns([1, 2], gap="large")
    raw_df: Optional[pd.DataFrame] = None
    yy_mm: Optional[str] = None
    duplicate_report_view: Optional[pd.DataFrame] = None
    merged_view: Optional[pd.DataFrame] = None
    temp_dir: Optional[str] = None
    folder_batch_mode: bool = False

    with left_col:
        raw_df, temp_dir, folder_batch_mode = _render_file_upload()
        yy_mm = _render_date_selector(folder_batch_mode, raw_df)
        raw_df = _render_translation(raw_df, folder_batch_mode)
        if not folder_batch_mode and raw_df is not None:
            try:
                duplicate_report_view, merged_view = compute_merge_views(raw_df)
            except (KeyError, ValueError, TypeError) as exc:
                st.error(f"병합 처리 중 오류가 발생했습니다: {exc}")
                LOGGER.exception("Failed to compute merge views")

    with right_col:
        tabs = st.tabs(["병합결과", "원본데이터"])
        if (duplicate_report_view is None or merged_view is None or yy_mm is None) and not folder_batch_mode:
            with tabs[0]:
                st.info("파일 업로드와 날짜/번역 설정을 완료해주세요.")
            return
        with tabs[0]:
            _render_download_tab(yy_mm, folder_batch_mode, temp_dir, merged_view, duplicate_report_view)
            if not folder_batch_mode and duplicate_report_view is not None and merged_view is not None:
                st.subheader("중복리포트")
                st.write(f"중복 리포트 건수: {len(duplicate_report_view)}")
                st.dataframe(duplicate_report_view)
                st.subheader("병합결과")
                st.write(f"병합 결과 건수: {len(merged_view)}")
                st.dataframe(merged_view)
        with tabs[1]:
            st.write("원본 데이터")
            st.dataframe(raw_df.head(50) if raw_df is not None else pd.DataFrame())
