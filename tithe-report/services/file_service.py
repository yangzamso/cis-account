# -*- coding: utf-8 -*-
"""File-handling services."""
from __future__ import annotations

import json
from typing import Dict, Optional

import streamlit as st

from config import DEFAULT_HEADER_PRESETS, HEADER_PRESET_FILE


def pick_folder_dialog() -> Optional[str]:
    """Open a native folder picker dialog and return the selected path."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        selected = filedialog.askdirectory()
        root.destroy()
        return selected or None
    except (ImportError, OSError, RuntimeError):
        return None


def set_folder_in_state(state_key: str) -> None:
    """Pick a folder and store it in session state under the given key."""
    selected = pick_folder_dialog()
    if selected:
        st.session_state[state_key] = selected


def load_header_presets() -> Dict[str, str]:
    """Load saved domestic header presets from disk."""
    try:
        with open(HEADER_PRESET_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
        presets = DEFAULT_HEADER_PRESETS.copy()
        if isinstance(data, dict):
            for key in presets:
                if isinstance(data.get(key), str):
                    presets[key] = data[key]
            legacy_fee = data.get("회비")
            if isinstance(legacy_fee, str):
                for key in ("회비-청장년", "회비-부녀", "회비-청년"):
                    if not presets.get(key):
                        presets[key] = legacy_fee
        return presets
    except (FileNotFoundError, json.JSONDecodeError, OSError, IOError):
        return DEFAULT_HEADER_PRESETS.copy()


def save_header_presets(presets: Dict[str, str]) -> None:
    """Persist domestic header presets to disk."""
    with open(HEADER_PRESET_FILE, "w", encoding="utf-8") as file:
        json.dump(presets, file, ensure_ascii=False, indent=2)
