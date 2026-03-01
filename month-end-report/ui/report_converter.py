# -*- coding: utf-8 -*-
from __future__ import annotations

import streamlit as st

from services.report_parser_service import parse_report
from services.report_formatter_service import format_report

_REGIONS = [
    "11. 러시아 모스크바",
    "15. 러시아 크림공화국",
    "18. 러시아 야쿠츠크",
    "13. 카자흐스탄 알마티",
    "17. 카자흐스탄 아토베",
    "16. 우즈베키스탄 타슈켄트",
    "14. 우크라이나 키이우",
]


def render_report_converter() -> None:
    left, right = st.columns([1, 1], gap="large")

    with left:
        st.subheader("1) API 설정")
        api_key = st.text_input("Gemini API 키", type="password", key="conv_api_key")
        model_name = st.text_input("모델명", value="gemini-2.0-flash", key="conv_model")

        st.subheader("2) 국가 선택")
        region = st.selectbox("국가", options=_REGIONS, index=None, placeholder="국가를 선택하세요", key="conv_region", label_visibility="collapsed")

        st.subheader("3) 러시아어 원문")
        raw_text = st.text_area("원문을 붙여넣으세요", height=360, key="conv_input", label_visibility="collapsed")

        run = st.button("변환", key="conv_run", disabled=not (api_key and raw_text))

    with right:
        st.subheader("변환 결과")
        if run:
            with st.spinner("변환 중..."):
                try:
                    report = parse_report(api_key, model_name, raw_text)
                    body = format_report(report)
                    result = f"{region}\n\n{body}" if region else body
                    st.session_state["conv_result"] = result
                except Exception as exc:
                    st.error(f"변환 중 오류가 발생했습니다: {exc}")

        result = st.session_state.get("conv_result", "")
        if result:
            st.text_area("결과", value=result, height=500, key="conv_output", label_visibility="collapsed")
