# -*- coding: utf-8 -*-
"""Translation-related services."""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List

import pandas as pd
import streamlit as st

try:
    import google.generativeai as genai
except (ImportError, ModuleNotFoundError):  # pragma: no cover
    genai = None


def needs_translation(text: Any) -> bool:
    """Detect whether a string contains Cyrillic characters."""
    if not isinstance(text, str) or not text.strip():
        return False
    return re.search(r"[Ѐ-ӿ]", text) is not None


@st.cache_data(show_spinner=False)
def list_text_models(api_key: str) -> List[str]:
    """Fetch available text generation models from Gemini API."""
    if genai is None:
        raise RuntimeError("google-generativeai 라이브러리가 설치되어 있지 않습니다.")
    genai.configure(api_key=api_key)
    models: List[str] = []
    for model in genai.list_models():
        if "generateContent" in getattr(model, "supported_generation_methods", []):
            models.append(model.name.replace("models/", ""))
    return models


@st.cache_data(show_spinner=False)
def translate_batch(api_key: str, model_name: str, items: List[str]) -> List[str]:
    """Translate a batch of Russian texts into Korean using Gemini."""
    if genai is None:
        raise RuntimeError("google-generativeai 라이브러리가 설치되어 있지 않습니다.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    prompt = (
        "Translate the following Russian texts into Korean.\n"
        "Return ONLY a JSON array of translated strings in the same order.\n"
        "Do not add extra keys or commentary.\n\n"
        f"Texts:\n{json.dumps(items, ensure_ascii=False)}"
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", text, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError as exc:
                raise ValueError("번역 결과 JSON 파싱에 실패했습니다.") from exc
        raise


def translate_memos(
    df: pd.DataFrame,
    api_key: str,
    model_name: str,
    *,
    use_progress: bool = True,
) -> pd.DataFrame:
    """Translate memo column in a dataframe when Cyrillic is detected."""
    memo_series = df.get("메모")
    if memo_series is None:
        return df

    targets = [memo for memo in memo_series.fillna("").astype(str) if needs_translation(memo)]
    unique_targets = list(dict.fromkeys(targets))
    if not unique_targets:
        df["메모"] = memo_series
        return df

    translations: Dict[str, str] = {}
    progress = st.progress(0.0, text="번역 중...") if use_progress else None
    total = len(unique_targets)
    for start in range(0, total, 20):
        batch = unique_targets[start : start + 20]
        translated = translate_batch(api_key, model_name, batch)
        for src, dst in zip(batch, translated):
            translations[src] = dst
        if progress is not None:
            progress.progress(min((start + len(batch)) / total, 1.0))
    if progress is not None:
        progress.empty()

    df["메모"] = memo_series.apply(
        lambda x: translations.get(x, x) if needs_translation(x) else x
    )
    return df


def set_merge_translate_state(model_state_key: str, api_state_key: str) -> None:
    """Store translation settings for batch merge."""
    st.session_state["merge_translate"] = True
    st.session_state["merge_translate_model_value"] = st.session_state.get(model_state_key)
    st.session_state["merge_translate_api_key"] = st.session_state.get(api_state_key)
