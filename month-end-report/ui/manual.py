# -*- coding: utf-8 -*-
from __future__ import annotations

import streamlit as st


def render_manual() -> None:
    st.markdown("### 사용 매뉴얼")
    st.info("기능이 추가되면 사용 방법이 여기에 표시됩니다.")
