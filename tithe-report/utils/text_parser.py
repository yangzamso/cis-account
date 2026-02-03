# -*- coding: utf-8 -*-
"""Text file parser for tithe data."""
from __future__ import annotations

import re
from typing import List, Optional, Tuple, Dict, Any
import pandas as pd

# Regex patterns
# 2순위 패턴: (고유번호) (러시아어 이름) (금액) 순서
# 예: 1001 Иван 5 000
# 러시아어(키릴 문자) 또는 한국어가 포함된 이름 뒤에 숫자가 오는 패턴 검색
PATTERN_RUSSIAN_BOUNDARY = re.compile(r"(\d{8}-\d{5}|\d+)\s+([а-яА-ЯёЁa-zA-Z가-힣\s]+?)\s+([\d\s.,]+)$")

# 고유번호 검증 패턴: 00000000-00000
PATTERN_VALID_UID = re.compile(r"^\d{8}-\d{5}$")

def _clean_amount_str(val: str) -> float:
    """
    러시아식 숫자 표기(공백 포함)를 표준 float로 변환.
    예: '10 000' -> 10000.0
    예: '10 000,50' -> 10000.5
    """
    if not val:
        return 0.0
    
    # 1. 공백 제거 (천단위 구분자 등)
    val = val.replace(" ", "").replace("\xa0", "")
    
    # 2. 콤마를 점으로 변경 (소수점 처리)
    val = val.replace(",", ".")
    
    try:
        return float(val)
    except ValueError:
        return 0.0

def _is_valid_uid_format(uid: str) -> bool:
    """고유번호 형식이 00000000-00000 인지 확인."""
    if not uid:
        return False
    return bool(PATTERN_VALID_UID.match(uid))

def _parse_line_logic(line: str) -> Tuple[Optional[str], Optional[str], Optional[float]]:
    """
    단일 라인을 분석하여 (고유번호, 이름, 금액)을 추출.
    우선순위:
    1. '/' 구분자
    2. 러시아어/문자 종료 후 숫자 (Regex)
    3. 공백 구분
    """
    line = line.strip()
    if not line:
        return None, None, None

    # 전략 1: '/' 구분자 사용
    # 예: 1/1001/Ivan/5000
    if "/" in line:
        parts = [p.strip() for p in line.split("/")]
        # 보통 순번/고유번호/이름/금액 -> 4개
        if len(parts) >= 4:
            # 보수적으로 2번째를 고유번호, 마지막을 금액으로 간주
            # 단, 고유번호가 숫자인지 확인 (하이픈 포함 가능)
            uid_cand = parts[1]
            amt_cand = parts[-1]
            # 고유번호가 숫자 또는 하이픈 포함된 형태인지 간단 확인 (상세 검증은 별도)
            if any(c.isdigit() for c in uid_cand):
                return uid_cand, parts[2], _clean_amount_str(amt_cand)
        elif len(parts) == 3:
             # 고유번호/이름/금액 일 수도 있음
             if any(c.isdigit() for c in parts[0]):
                 return parts[0], parts[1], _clean_amount_str(parts[-2])

    # 전략 2: 러시아어(문자)와 숫자 경계 기반 Regex
    # 이름과 금액이 붙어있거나 공백이 불규칙한 경우
    match = PATTERN_RUSSIAN_BOUNDARY.search(line)
    if match:
        uid = match.group(1)
        name = match.group(2)
        amount_str = match.group(3)
        return uid, name.strip(), _clean_amount_str(amount_str)

    # 전략 3: 단순 공백 분리 (최후의 수단)
    # 최소 3덩어리 (고유번호, 이름, 금액) 가정
    # 예: 1001 Ivan 5000
    tokens = line.split()
    if len(tokens) >= 3:
        # 마지막 토큰이 금액이라고 가정 (숫자+구두점만 포함된 경우)
        last_token = tokens[-1]
        if re.match(r"^[\d\s.,]+$", last_token):
            # 첫번째나 두번째가 고유번호일 확률 높음 (순번이 있을 수 있으므로)
            # 2번째가 하이픈 포함된 고유번호일 가능성
            if len(tokens) >= 4 and any(c.isdigit() for c in tokens[1]):
                return tokens[1], " ".join(tokens[2:-1]), _clean_amount_str(last_token)
            elif any(c.isdigit() for c in tokens[0]):
                return tokens[0], " ".join(tokens[1:-1]), _clean_amount_str(last_token)

    return None, None, None

def parse_txt_to_df(file_bytes: bytes) -> pd.DataFrame:
    """TXT 파일 바이트를 읽어 DataFrame으로 반환."""
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        # UTF-8 실패 시 EUC-KR 등 시도, 여기서는 일단 무시하고 replace
        text = file_bytes.decode("utf-8", errors="replace")

    rows = []
    lines = text.splitlines()
    valid_format_found = False

    for line in lines:
        uid, name, amount = _parse_line_logic(line)
        if uid is not None:
            # 추출된 UID에 대해 형식 검증
            if _is_valid_uid_format(uid):
                valid_format_found = True
            
            rows.append({
                "고유번호": uid,
                "이름": name,
                "금액": amount
            })
    
    # 데이터가 아예 없거나, 하나라도 유효한 형식(00000000-00000)이 없으면 빈 DF 반환
    # (일부만 형식이 맞는 경우엔 일단 데이터는 반환하고 처리는 뒷단에 맡김, 
    #  여기서는 '전체 파일이 형식이 없는지'를 판단하기 위해 valid_format_found 체크)
    if not rows:
        return pd.DataFrame(columns=["고유번호", "이름", "금액"])
        
    if not valid_format_found:
        # 유효한 고유번호 형식이 하나도 발견되지 않음 -> 이 파일은 잘못된 파일로 간주
        return pd.DataFrame()

    return pd.DataFrame(rows)
