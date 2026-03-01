# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import re

try:
    import google.generativeai as genai
except (ImportError, ModuleNotFoundError):
    genai = None

from models.schemas import MonthEndReport

_PROMPT = """\
Parse this Russian financial report and return ONLY valid JSON (no markdown fences).

JSON schema:
{
  "date": "<Korean: M월 D일  e.g. 12월 27일>",
  "currency_blocks": [
    {
      "currency": "<KZT|RUB|USD|UZS>",
      "summary": {
        "type": "summary",
        "prev_balance": 0.0, "income": 0.0, "expense": 0.0, "balance": 0.0,
        "income_details": [], "expense_details": []
      },
      "accounts": [
        {
          "type": "<bank|cash>",
          "prev_balance": 0.0, "income": 0.0,
          "income_details": [{"label": "<Korean>", "amount": 0.0}],
          "expense": 0.0,
          "expense_details": [{"label": "<Korean>", "amount": 0.0}],
          "balance": 0.0
        }
      ]
    }
  ],
  "extra": ["<non-standard sections translated to Korean>"]
}

Rules:
- Currency mapping: тенге=KZT, рубль=RUB, доллар/$=USD, сум=UZS
- summary: top-level totals block (null if absent)
- bank: банк/счёт/вклад;  cash: наличные
- income_details/expense_details: only if explicitly listed as sub-items
- Translate all labels and extra text to Korean
- Russian number format: space=thousands separator, comma=decimal point
- extra: member-held funds tables, notes, etc. as Korean text
- If a section contains multiple currencies, split into separate currency_blocks

Report:
"""


def parse_report(api_key: str, model_name: str, text: str) -> MonthEndReport:
    if genai is None:
        raise RuntimeError("google-generativeai 라이브러리가 설치되어 있지 않습니다.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(_PROMPT + text)
    raw = (response.text or "").strip()
    if not raw:
        raise RuntimeError("응답이 비어있습니다.")
    raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"응답 파싱 실패: {exc}") from exc
        else:
            raise RuntimeError("JSON을 찾을 수 없습니다.")
    return MonthEndReport.model_validate(data)
