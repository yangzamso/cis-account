# -*- coding: utf-8 -*-
"""Merge-related services."""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Sequence, Tuple

import pandas as pd
import streamlit as st

from config import MERGE_OUTPUT_FILENAME_PATTERN
from utils.excel_utils import (
    clean_amount_vectorized,
    list_excel_files,
    make_unique_columns,
    normalize_columns,
    read_excel_smart_bytes,
    read_excel_smart_path,
    write_excel_sheets,
)
from services.translation_service import translate_memos


def first_non_null(series: pd.Series) -> Any:
    """Return the first non-null value in a series."""
    for item in series:
        if pd.notna(item):
            return item
    return pd.NA


def pick_column(df: pd.DataFrame, candidates: Sequence[str]) -> Optional[str]:
    """Pick the first available column from candidates."""
    for name in candidates:
        if name in df.columns:
            return name
    return None


def build_view(df: pd.DataFrame, mapping: Sequence[Tuple[str, Sequence[str]]]) -> pd.DataFrame:
    """Build a display dataframe from a mapping of labels to candidate columns."""
    view: Dict[str, pd.Series] = {}
    for label, candidates in mapping:
        col = pick_column(df, candidates)
        if col:
            view[label] = df[col]
        else:
            view[label] = pd.Series([pd.NA] * len(df), index=df.index)
    return pd.DataFrame(view)


def _find_col_by_keyword(columns: Sequence[str], keyword: str) -> Optional[str]:
    for col in columns:
        if keyword in str(col):
            return col
    return None


def _normalize_o_markers(series: pd.Series) -> pd.Series:
    markers = {"o", "O", "○", "◯", "⭕", "〇", "ㅇ"}
    text = series.astype(str).str.strip()
    mask = text.isin(markers)
    if mask.any():
        series = series.copy()
        series.loc[mask] = 1
    return series


def _normalize_merge_df(df: pd.DataFrame) -> pd.DataFrame:
    amount_col = _find_col_by_keyword(df.columns, "금액") or _find_col_by_keyword(df.columns, "십일조")
    memo_col = _find_col_by_keyword(df.columns, "메모")
    attendance_col = _find_col_by_keyword(df.columns, "출결")
    team_col = pick_column(df, ["팀", "국가"])

    if amount_col and amount_col != "금액":
        df["금액"] = df[amount_col]
    if memo_col and memo_col != "메모":
        df["메모"] = df[memo_col]
    if attendance_col and attendance_col != "출결여부":
        df["출결여부"] = df[attendance_col]
    if team_col and team_col != "팀":
        df["팀"] = df[team_col]

    if "금액" not in df.columns:
        df["금액"] = pd.NA
    if "메모" not in df.columns:
        df["메모"] = pd.NA
    if "출결여부" not in df.columns:
        df["출결여부"] = pd.NA

    df["금액"] = _normalize_o_markers(df["금액"])
    df["금액"] = clean_amount_vectorized(df["금액"])
    return df


def _read_excel_maybe_chunked(file_path: str, chunksize: int = 1000) -> pd.DataFrame:
    try:
        chunk_iter = pd.read_excel(file_path, chunksize=chunksize)
    except (TypeError, ValueError):
        return read_excel_smart_path(file_path)
    if not hasattr(chunk_iter, "__iter__"):
        return read_excel_smart_path(file_path)
    chunks: List[pd.DataFrame] = []
    for chunk in chunk_iter:
        chunks.append(normalize_columns(chunk))
    if not chunks:
        return pd.DataFrame()
    return pd.concat(chunks, ignore_index=True, copy=False)


def build_merge_frames(file_items: Sequence[Tuple[str, bytes]]) -> List[pd.DataFrame]:
    """Parse Excel files into normalized dataframes for merge."""
    frames: List[pd.DataFrame] = []
    for file_name, file_bytes in file_items:
        try:
            df = read_excel_smart_bytes(file_bytes)
            df = make_unique_columns(df)
            df = _normalize_merge_df(df)
        except (ValueError, TypeError, KeyError, OSError, IOError) as exc:
            st.error(f"{file_name} 처리 중 오류가 발생했습니다: {exc}")
            continue
        df["__source"] = file_name
        if "금액" not in df.columns:
            st.warning(
                f"{file_name}: '금액' 컬럼이 없어 건너뜁니다. (현재 컬럼: {list(df.columns)})"
            )
        frames.append(df)
    return frames


def build_merge_frames_from_paths(file_paths: Sequence[str]) -> List[pd.DataFrame]:
    """Parse Excel files from paths with chunking for large files."""
    frames: List[pd.DataFrame] = []
    for file_path in file_paths:
        try:
            file_size = os.path.getsize(file_path)
            if file_size >= 10 * 1024 * 1024:
                df = _read_excel_maybe_chunked(file_path)
            else:
                df = read_excel_smart_path(file_path)
            df = make_unique_columns(df)
            df = _normalize_merge_df(df)
        except (ValueError, TypeError, KeyError, OSError, IOError) as exc:
            st.error(f"{os.path.basename(file_path)} 처리 중 오류가 발생했습니다: {exc}")
            continue
        df["__source"] = os.path.basename(file_path)
        if "금액" not in df.columns:
            st.warning(
                f"{os.path.basename(file_path)}: '금액' 컬럼이 없어 건너뜁니다. (현재 컬럼: {list(df.columns)})"
            )
        frames.append(df)
    return frames


def optimize_merge_df(df: pd.DataFrame) -> pd.DataFrame:
    """Reduce memory usage with categorical columns."""
    dtype_map = {col: "category" for col in ("고유번호", "지역", "팀") if col in df.columns}
    if dtype_map:
        df = df.astype(dtype_map, copy=False)
    return df


def compute_merge_views(raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Compute duplicate and merged views for merge mode."""
    amount_counts = raw_df.groupby("고유번호")["금액"].apply(lambda s: s.notna().sum())
    duplicate_ids = amount_counts[amount_counts >= 2].index
    duplicate_report = raw_df[raw_df["고유번호"].isin(duplicate_ids)].copy()

    if "__source" in duplicate_report.columns:
        duplicate_report["원본파일"] = duplicate_report["__source"]

    duplicate_report_view = build_view(
        duplicate_report,
        [
            ("지역", ["지역"]),
            ("원본파일", ["원본파일"]),
            ("고유번호", ["고유번호"]),
            ("팀", ["팀"]),
            ("이름(KR)", ["이름(KR)", "이름(kr)"]),
            ("금액", ["금액"]),
            ("메모", ["메모"]),
        ],
    )

    grouped = raw_df.groupby("고유번호", dropna=False)
    merged_df = grouped.aggregate(first_non_null).reset_index()
    merged_view = build_view(
        merged_df,
        [
            ("지역", ["지역"]),
            ("고유번호", ["고유번호"]),
            ("팀", ["팀"]),
            ("구역", ["구역"]),
            ("부서", ["부서"]),
            ("이름(KR)", ["이름(KR)", "이름(kr)"]),
            ("이름(RU)", ["이름(RU)", "이름(ru)"]),
            ("출결여부", ["출결여부"]),
            ("십일조", ["금액"]),
            ("메모", ["메모"]),
        ],
    )

    return duplicate_report_view, merged_view


def read_folder_files(folder_path: str) -> Tuple[List[Tuple[str, bytes]], List[str]]:
    """Read Excel files from a folder into memory."""
    file_items: List[Tuple[str, bytes]] = []
    errors: List[str] = []
    files = list_excel_files(folder_path)
    for path_item in files:
        try:
            with open(path_item, "rb") as file:
                file_items.append((path_item, file.read()))
        except (OSError, IOError) as exc:
            errors.append(f"파일 읽기 실패: {os.path.basename(path_item)} ({exc})")
    return file_items, errors


def merge_file_items(file_items: Sequence[Tuple[str, bytes]]) -> Optional[pd.DataFrame]:
    """Build merged dataframe from file bytes."""
    frames = build_merge_frames([(os.path.basename(name), data) for name, data in file_items])
    if not frames:
        return None
    merged = pd.concat(frames, ignore_index=True, copy=False)
    return optimize_merge_df(merged)


def init_progress_rows(subfolders: Sequence[str]) -> Dict[str, Tuple[Any, Any]]:
    """Initialize progress rows for batch merge."""
    progress_rows: Dict[str, Tuple[Any, Any]] = {}
    with st.container():
        for folder_name in sorted(subfolders):
            name_col, bar_col, status_col = st.columns([2, 4, 2])
            name_col.write(folder_name)
            bar = bar_col.progress(0)
            status = status_col.empty()
            status.write("대기")
            progress_rows[folder_name] = (bar, status)
    return progress_rows


def process_subfolder_merge(
    source_folder: str,
    folder_name: str,
    output_path: str,
    overwrite_checked: bool,
    translate_model: Optional[str],
    translate_api_key: Optional[str],
) -> Tuple[str, Optional[pd.DataFrame], Optional[pd.DataFrame], List[str]]:
    """Process a single subfolder merge and return status."""
    if os.path.exists(output_path) and not overwrite_checked:
        return "skip", None, None, [f"[{folder_name}] 이미 파일이 존재합니다."]

    folder_path = os.path.join(source_folder, folder_name)
    files = list_excel_files(folder_path)
    if not files:
        return "skip", None, None, [f"[{folder_name}] 엑셀 파일 없음"]

    file_items: List[Tuple[str, bytes]] = []
    errors: List[str] = []
    for p in files:
        try:
            with open(p, "rb") as file:
                file_items.append((os.path.basename(p), file.read()))
        except (OSError, IOError) as exc:
            errors.append(f"[{folder_name}] 파일 읽기 실패: {os.path.basename(p)} ({exc})")
    if errors:
        return "error", None, None, errors

    frames = build_merge_frames_from_paths(files)
    if not frames:
        return "skip", None, None, [f"[{folder_name}] 병합 대상 없음"]
    raw_df = pd.concat(frames, ignore_index=True, copy=False)
    raw_df = optimize_merge_df(raw_df)
    if "고유번호" not in raw_df.columns:
        return "error", None, None, [f"[{folder_name}] '고유번호' 컬럼 없음"]

    if translate_model and translate_api_key:
        raw_df = translate_memos(
            raw_df,
            translate_api_key,
            translate_model,
            use_progress=False,
        )

    dup_view, merge_view = compute_merge_views(raw_df)
    write_excel_sheets(output_path, [("병합결과", merge_view), ("중복리포트", dup_view)])
    return "saved", merge_view, dup_view, []


def run_subfolder_merge(
    source_folder: str,
    folder_output_dir: str,
    subfolders: Sequence[str],
    overwrite_checked: bool,
    translate_model: Optional[str],
    translate_api_key: Optional[str],
    max_workers: int = 4,
) -> Tuple[int, List[str]]:
    """Run batch merge for subfolders and return summary."""
    progress_rows = init_progress_rows(subfolders)
    saved = 0
    results: List[str] = []
    max_workers = max(1, min(max_workers, len(subfolders)))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for folder_name in sorted(subfolders):
            output_name = MERGE_OUTPUT_FILENAME_PATTERN.format(yy_mm=folder_name)
            output_path = os.path.join(folder_output_dir, output_name)
            futures[executor.submit(
                process_subfolder_merge,
                source_folder,
                folder_name,
                output_path,
                overwrite_checked,
                translate_model,
                translate_api_key,
            )] = folder_name

        for future in as_completed(futures):
            folder_name = futures[future]
            bar, status = progress_rows.get(folder_name, (None, None))
            if status is not None:
                status.write("처리중")
            try:
                status_key, _, _, messages = future.result()
            except (KeyError, ValueError, TypeError, OSError, IOError, RuntimeError) as exc:
                status_key = "error"
                messages = [f"[{folder_name}] 병합 실패: {exc}"]

            if bar is not None:
                bar.progress(100)
            if status is not None:
                status.write("✅ 완료" if status_key == "saved" else "스킵" if status_key == "skip" else "오류")

            if status_key == "saved":
                saved += 1
            results.extend(messages)
    return saved, results
