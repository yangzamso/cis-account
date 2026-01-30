# -*- coding: utf-8 -*-
"""Merge UI."""
from __future__ import annotations

import logging
import os
from datetime import date
from typing import Optional, Tuple

import pandas as pd
import streamlit as st

from config import MERGE_OUTPUT_FILENAME_PATTERN
from services.file_service import set_folder_in_state
from services.merge_service import (
    build_merge_frames,
    build_merge_frames_from_paths,
    compute_merge_views,
    optimize_merge_df,
    run_subfolder_merge,
)
from services.translation_service import list_text_models, set_merge_translate_state, translate_memos
from utils.excel_utils import list_yyyymm_subfolders, to_excel_multi_bytes, write_excel_sheets

LOGGER = logging.getLogger(__name__)


def _init_merge_state() -> None:
    if "merge_source_folder" not in st.session_state:
        st.session_state["merge_source_folder"] = ""
    if "merge_output_folder" not in st.session_state:
        st.session_state["merge_output_folder"] = ""


def _sync_folder_picker_state() -> None:
    if st.session_state.get("merge_source_folder_picker"):
        st.session_state["merge_source_folder"] = st.session_state["merge_source_folder_picker"]
        st.session_state["merge_source_folder_picker"] = ""
    if st.session_state.get("merge_output_folder_picker"):
        st.session_state["merge_output_folder"] = st.session_state["merge_output_folder_picker"]
        st.session_state["merge_output_folder_picker"] = ""


def _render_input_mode() -> str:
    st.subheader("1) 입력 방식")
    return st.radio("입력 방식", ["폴더 지정", "파일 업로드"], horizontal=True, label_visibility="collapsed", index=0)


def _render_upload_mode() -> Optional[pd.DataFrame]:
    st.subheader("2) 파일 업로드")
    uploaded_files = st.file_uploader("엑셀 파일을 선택하세요.", type=["xlsx", "xls"], accept_multiple_files=True)
    if not uploaded_files:
        st.info("엑셀 파일을 업로드하면 결과가 표시됩니다.")
        return None
    file_items = [(file.name, file.getvalue()) for file in uploaded_files]
    frames = build_merge_frames(file_items)
    if not frames:
        return None
    merged = pd.concat(frames, ignore_index=True, copy=False)
    return optimize_merge_df(merged)


def _render_folder_inputs() -> Tuple[str, str, bool]:
    st.subheader("2) 폴더 지정")
    _init_merge_state()
    _sync_folder_picker_state()
    source_input, source_button = st.columns([4, 1], gap="small")
    with source_input:
        source_folder = st.text_input("소스 폴더 경로", key="merge_source_folder")
    with source_button:
        st.button("폴더 선택", key="pick_merge_source_folder", on_click=set_folder_in_state, args=("merge_source_folder_picker",))
    output_input, output_button = st.columns([4, 1], gap="small")
    with output_input:
        output_folder = st.text_input("결과물 저장 폴더 경로", key="merge_output_folder")
    with output_button:
        st.button("폴더 선택", key="pick_merge_output_folder", on_click=set_folder_in_state, args=("merge_output_folder_picker",))
    load_folder = st.button("폴더에서 불러오기")
    if load_folder:
        st.session_state["merge_load_clicked"] = True
    return source_folder, output_folder, load_folder


def _handle_folder_load(source_folder: str, output_folder: str, load_folder: bool) -> Tuple[Optional[pd.DataFrame], Optional[str], bool]:
    folder_output_dir = output_folder.strip() if output_folder else None
    if load_folder:
        if not source_folder.strip():
            st.error("소스 폴더 경로를 입력해주세요.")
            return None, folder_output_dir, False
        source_folder = os.path.abspath(source_folder.strip())
        raw_df = None
        from utils.excel_utils import list_excel_files
        excel_files = list_excel_files(source_folder)
        if excel_files:
            frames = build_merge_frames_from_paths(excel_files)
            if frames:
                raw_df = pd.concat(frames, ignore_index=True, copy=False)
                raw_df = optimize_merge_df(raw_df)
                st.session_state["folder_merge_raw_df"] = raw_df
                st.session_state["folder_merge_output_dir"] = folder_output_dir
                st.session_state["folder_merge_files"] = excel_files
                st.session_state["merge_subfolder_mode"] = False
            return raw_df, folder_output_dir, False

        subfolders = list_yyyymm_subfolders(source_folder)
        if not subfolders:
            st.session_state["merge_subfolder_mode"] = False
            st.error("소스 폴더에 엑셀 파일이 없고, YYYY.MM 하위 폴더도 없습니다.")
            return None, folder_output_dir, False
        st.session_state["merge_subfolders"] = sorted(subfolders)
        st.session_state["merge_subfolder_mode"] = True
        return None, folder_output_dir, True
    raw_df = st.session_state.get("folder_merge_raw_df")
    folder_output_dir = st.session_state.get("folder_merge_output_dir", folder_output_dir)
    folder_batch_mode = bool(st.session_state.get("merge_subfolder_mode"))
    if raw_df is None and not folder_batch_mode and not st.session_state.get("merge_load_clicked"):
        st.info("폴더 경로를 입력하고 '폴더에서 불러오기'를 눌러주세요.")
    return raw_df, folder_output_dir, folder_batch_mode


def _render_date_selector(folder_batch_mode: bool, raw_df: Optional[pd.DataFrame]) -> Optional[str]:
    if raw_df is None and not folder_batch_mode:
        return None
    if raw_df is not None and "고유번호" not in raw_df.columns:
        st.error("모든 파일에 '고유번호' 컬럼이 필요합니다.")
        return None
    st.subheader("3) 날짜 선택")
    today = date.today()
    year_col, month_col = st.columns(2)
    with year_col:
        year_value = st.number_input("년도", min_value=2000, max_value=2100, value=today.year, step=1, disabled=folder_batch_mode)
    with month_col:
        month_value = st.selectbox("월", list(range(1, 13)), index=today.month - 1, disabled=folder_batch_mode)
    return f"{year_value}.{month_value:02d}"


def _render_translation(raw_df: Optional[pd.DataFrame], folder_batch_mode: bool, input_mode: str) -> Optional[pd.DataFrame]:
    st.subheader("4) 번역 설정 (선택)")
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
                    if input_mode == "폴더 지정":
                        st.session_state["folder_merge_raw_df"] = raw_df
                    st.success("번역을 완료했습니다.")
            except (RuntimeError, ValueError, TypeError) as exc:
                st.error(f"번역 실패: {exc}")
                LOGGER.exception("Translation failed")
    elif raw_df is not None and not memo_available:
        st.info("'메모' 컬럼이 없어 번역을 건너뜁니다.")
    return raw_df


def _render_download_tab(input_mode: str, yy_mm: Optional[str], folder_output_dir: Optional[str], merged_view: Optional[pd.DataFrame], duplicate_report_view: Optional[pd.DataFrame]) -> None:
    st.subheader("다운로드")
    if input_mode != "폴더 지정":
        merged_bytes = to_excel_multi_bytes([("병합결과", merged_view), ("중복리포트", duplicate_report_view)])
        st.download_button("병합결과 다운로드", data=merged_bytes, file_name=MERGE_OUTPUT_FILENAME_PATTERN.format(yy_mm=yy_mm), mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        return
    if not folder_output_dir:
        st.info("결과물 저장 폴더 경로를 입력해주세요.")
        return
    overwrite_checked = st.checkbox("덮어쓰기", key="merge_overwrite")
    if not st.button("폴더에 병합 파일 저장"):
        return
    source_folder = st.session_state.get("merge_source_folder", "").strip()
    if not source_folder:
        st.error("소스 폴더 경로를 입력해주세요.")
        return
    try:
        os.makedirs(folder_output_dir, exist_ok=True)
        source_folder = os.path.abspath(source_folder)
        subfolders = st.session_state.get("merge_subfolders") or list_yyyymm_subfolders(source_folder)
        if not subfolders:
            if merged_view is None or duplicate_report_view is None or yy_mm is None:
                st.error("병합 결과가 없어 저장할 수 없습니다.")
                return
            output_name = MERGE_OUTPUT_FILENAME_PATTERN.format(yy_mm=yy_mm)
            output_path = os.path.join(folder_output_dir, output_name)
            if os.path.exists(output_path) and not overwrite_checked:
                st.warning("이미 파일이 존재합니다.")
            else:
                write_excel_sheets(output_path, [("병합결과", merged_view), ("중복리포트", duplicate_report_view)])
                st.success(f"저장완료(1개) : {folder_output_dir}")
                st.session_state["last_saved_folder"] = folder_output_dir
            return
        translate_model = st.session_state.get("merge_translate_model_value")
        translate_api_key = st.session_state.get("merge_translate_api_key")
        saved, per_folder_results = run_subfolder_merge(source_folder, folder_output_dir, subfolders, overwrite_checked, translate_model, translate_api_key)
        st.success(f"저장완료({saved}개) : {folder_output_dir}")
        st.session_state["last_saved_folder"] = folder_output_dir
        if per_folder_results:
            st.text("\n".join(per_folder_results))
    except (OSError, IOError) as exc:
        st.error(f"저장 실패: {exc}")
        LOGGER.exception("Failed to save merged workbook")


def render_merge() -> None:
    left_col, right_col = st.columns([1, 2], gap="large")
    raw_df: Optional[pd.DataFrame] = None
    yy_mm: Optional[str] = None
    duplicate_report_view: Optional[pd.DataFrame] = None
    merged_view: Optional[pd.DataFrame] = None
    input_mode = "폴더 지정"
    folder_output_dir: Optional[str] = None

    with left_col:
        input_mode = _render_input_mode()
        if input_mode == "파일 업로드":
            raw_df = _render_upload_mode()
            folder_batch_mode = False
        else:
            source_folder, output_folder, load_folder = _render_folder_inputs()
            raw_df, folder_output_dir, folder_batch_mode = _handle_folder_load(source_folder, output_folder, load_folder)
        yy_mm = _render_date_selector(folder_batch_mode, raw_df)
        raw_df = _render_translation(raw_df, folder_batch_mode, input_mode)
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
            _render_download_tab(input_mode, yy_mm, folder_output_dir, merged_view, duplicate_report_view)
            if input_mode != "폴더 지정" and duplicate_report_view is not None and merged_view is not None:
                st.subheader("중복리포트")
                st.write(f"중복 리포트 건수: {len(duplicate_report_view)}")
                st.dataframe(duplicate_report_view)
                st.subheader("병합결과")
                st.write(f"병합 결과 건수: {len(merged_view)}")
                st.dataframe(merged_view)
        with tabs[1]:
            st.write("원본 데이터")
            st.dataframe(raw_df.head(50) if raw_df is not None else pd.DataFrame())
