# -*- coding: utf-8 -*-
"""Annual stats service."""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any
import os
import re

import pandas as pd

from services.report_service import load_report_source, _resolve_report_columns, _parse_paid_amount
from utils.excel_utils import find_col_by_keyword

# Pre-compiled regex pattern for date parsing
_YYYYMM_RE = re.compile(r"(\d{2}|\d{4})\.(\d{2})")


def _parse_yyyymm_from_name(filename: str) -> Optional[Tuple[int, int]]:
    stem = os.path.splitext(os.path.basename(filename))[0]
    match = _YYYYMM_RE.search(stem)
    if not match:
        return None
    year_text = match.group(1)
    year = int(year_text)
    if len(year_text) == 2:
        year += 2000
    month = int(match.group(2))
    if month < 1 or month > 12:
        return None
    return (year, month)


def _collect_annual_person_data(file_paths: List[str]) -> Tuple[Dict[str, Any], Optional[int], List[int]]:
    """
    모든 파일을 읽어 인원별(Key)로 데이터를 병합합니다.
    소속 정보는 '가장 마지막 월'을 기준으로 업데이트하며,
    납부 내역은 월별로 기록합니다.
    
    Returns:
        (persons_dict, target_year, all_years)
    """
    year_counts: Dict[int, int] = defaultdict(int)
    parsed_items: List[Tuple[str, int, int]] = []

    for file_path in file_paths:
        parsed = _parse_yyyymm_from_name(file_path)
        if not parsed:
            continue
        year, month = parsed
        parsed_items.append((file_path, year, month))
        year_counts[year] += 1

    if not parsed_items:
        return {}, None, []

    years = sorted(year_counts.keys())
    target_year = years[0] if len(years) == 1 else None # 단일 연도가 아니면 None 처리 (호출측에서 경고)
    
    # 만약 연도가 섞여있다면, 가장 파일이 많은 연도를 쓰거나 None 반환.
    # 기존 로직: target_year 없으면 빈 리턴. 하지만 여기선 데이터 수집이 목적.
    # 우선 target_year만 필터링해서 처리.
    if target_year is None:
        # 연도가 여러 개면 로직 중단 (UI에서 경고)
        return {}, None, years

    # Key -> Person Data
    # Person Data structure:
    # {
    #   'base_info': {지역, 팀, 부서, 이름, ...},
    #   'last_updated_month': 0,
    #   'monthly_data': { 1: {'tithe':.., 'memo':.., 'paid': bool}, ... }
    # }
    persons: Dict[str, Any] = {}

    # 날짜순 정렬 (월 오름차순) - 사실 last_updated_month 체크하므로 순서 상관 없으나 디버깅 용이성을 위해
    parsed_items.sort(key=lambda x: x[2])

    for file_path, year, month in parsed_items:
        if year != target_year:
            continue

        with open(file_path, "rb") as file:
            df = load_report_source(file.read())
        if df is None or df.empty:
            continue

        cols = list(df.columns)
        # 컬럼 매핑 찾기
        id_col = find_col_by_keyword(cols, "고유번호")
        region_col = find_col_by_keyword(cols, "지역")
        team_col = find_col_by_keyword(cols, "팀")
        dept_col = find_col_by_keyword(cols, "부서")
        name_kr_col = find_col_by_keyword(cols, "이름(KR)") or find_col_by_keyword(cols, "이름")
        name_ru_col = find_col_by_keyword(cols, "이름(RU)") or find_col_by_keyword(cols, "이름(ru)")
        attend_col = find_col_by_keyword(cols, "출결여부") or find_col_by_keyword(cols, "출결")
        tithe_col = find_col_by_keyword(cols, "십일조") or find_col_by_keyword(cols, "금액")
        memo_col = find_col_by_keyword(cols, "메모") or find_col_by_keyword(cols, "미납사유")

        for idx, row in df.iterrows():
            # Key 생성: 고유번호 우선, 없으면 이름
            raw_id = str(row.get(id_col, "")).strip() if id_col else ""
            raw_name = str(row.get(name_kr_col, "")).strip() if name_kr_col else ""
            
            if raw_id:
                key = raw_id
            elif raw_name:
                key = raw_name
            else:
                continue # 식별 불가
            
            # Init Record
            if key not in persons:
                persons[key] = {
                    "base_info": {},
                    "last_updated_month": 0,
                    "monthly_data": {}
                }
            
            # Update Base Info (최신 월 기준)
            if month >= persons[key]["last_updated_month"]:
                persons[key]["base_info"] = {
                    "고유번호": raw_id,
                    "지역": str(row.get(region_col, "")).strip() if region_col else "",
                    "팀": str(row.get(team_col, "")).strip() if team_col else "",
                    "부서": str(row.get(dept_col, "")).strip() if dept_col else "",
                    "이름(KR)": raw_name,
                    "이름(RU)": str(row.get(name_ru_col, "")).strip() if name_ru_col else "",
                    "출결여부": str(row.get(attend_col, "")).strip() if attend_col else "",
                }
                persons[key]["last_updated_month"] = month
            
            # Monthly Data
            tithe_val = row.get(tithe_col, "") if tithe_col else ""
            memo_val = row.get(memo_col, "") if memo_col else ""
            
            # 납부 여부 파싱
            is_paid, _ = _parse_paid_amount(tithe_val)
            
            persons[key]["monthly_data"][month] = {
                "tithe": tithe_val if not pd.isna(tithe_val) else "",
                "memo": memo_val if not pd.isna(memo_val) else "",
                "is_paid": is_paid
            }

    return persons, target_year, years


def build_annual_region_table(file_paths: List[str]) -> Tuple[pd.DataFrame, Optional[int], List[int]]:
    """Build annual stats table: 지역 x 1..12 based on MERGED person info."""
    persons, target_year, years = _collect_annual_person_data(file_paths)
    
    if not persons:
        return pd.DataFrame(), target_year, years

    totals: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    paid_counts: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    
    for key, data in persons.items():
        base_info = data["base_info"]
        monthly_data = data["monthly_data"]
        
        region = base_info.get("지역", "")
        if not region or region.lower() == "nan":
            continue
        
        # 출결제외 필터링 (최신 기준)
        attend = base_info.get("출결여부", "")
        if "출결제외" in attend:
            continue
            
        for m in range(1, 13):
            # 그 달에 데이터가 있었는지 여부? 
            # 연간 통계의 '총원'은 현재 재적인원을 기준으로 할 것인지, 그 달의 재적인원을 할 것인지 이슈.
            # 사용자 요청: "마지막 10월달 데이터의 값을 기준으로 통계를 내면 됨"
            # -> 즉, 이 사람은 "국내" 사람임. 1월에도 "국내"로 카운트되어야 함.
            # 다만, 1월에 데이터가 아예 없었다면(입사 전)? 
            # 그래도 연간 재적 인원에는 포함되는 것이 일반적 (혹은 monthly_data가 있는 달만 카운트 할수도)
            # 여기서는 '데이터가 있는 달'만 카운트 하는 것이 안전함. (중도 입사자 등)
            # 하지만 user request implies changing history based on current status.
            # "김세진이 1~8월 우크라이나 ... 10월 국내 ... 통계 내면 됨"
            # -> 1~8월 납부 내역도 국내 실적으로 잡혀야 함.
            
            # Case 1: 해당 월에 데이터가 있었던 경우만 카운트 (중도 입사자 고려)
            # if m in monthly_data:
            #     totals[region][m] += 1
            #     if monthly_data[m]["is_paid"]:
            #         paid_counts[region][m] += 1
            
            # Case 2: 연간 고정 인원으로 간주 (모든 달 분모 포함)
            # 하지만 1월에 없었던 사람을 1월 분모에 넣으면 납부율이 떨어짐.
            # 따라서 "해당 월에 데이터(기록)가 존재하는 사람"만 분모로 잡는 것이 타당.
            
            if m in monthly_data:
                totals[region][m] += 1
                if monthly_data[m]["is_paid"]:
                    paid_counts[region][m] += 1

    regions = sorted(totals.keys())
    data_rows = []
    
    for region in regions:
        row = {"지역": region}
        ratio_sum = 0.0
        ratio_count = 0
        for m in range(1, 13):
            total = int(totals[region].get(m, 0))
            paid = int(paid_counts[region].get(m, 0))
            ratio = round((paid / total * 100), 1) if total else 0.0
            row[f"{m}월"] = ratio
            if total:
                ratio_sum += ratio
                ratio_count += 1
        row["평균"] = round((ratio_sum / ratio_count), 1) if ratio_count else 0.0
        data_rows.append(row)

    if not data_rows:
        return pd.DataFrame(), target_year, years

    columns = ["지역"] + [f"{m}월" for m in range(1, 13)] + ["평균"]
    df = pd.DataFrame(data_rows, columns=columns)
    
    # 합계 행 계산 (이름을 '평균'으로 변경)
    total_row = {"지역": "평균"}
    for m in range(1, 13):
        col_name = f"{m}월"
        values = [v for v in df[col_name] if isinstance(v, (int, float))] 
        # 주의: 0.0도 포함. (데이터가 없어서 0인 경우는?)
        # 분모가 0이라서 0.0인 경우는 평균에서 제외? 아니면 포함?
        # 기존 로직: values 리스트 전체 평균.
        if values:
             total_row[col_name] = round(sum(values) / len(values), 1)
        else:
             total_row[col_name] = 0.0
             
    valid_avgs = [v for v in df["평균"] if isinstance(v, (int, float))]
    total_row["평균"] = round(sum(valid_avgs) / len(valid_avgs), 1) if valid_avgs else 0.0
    
    df = pd.concat([df, pd.DataFrame([total_row])], ignore_index=True)
    return df, target_year, years


def build_annual_detail_table(file_paths: List[str], target_year: int) -> pd.DataFrame:
    """Build annual detail table based on MERGED person info."""
    persons, _, _ = _collect_annual_person_data(file_paths)
    
    if not persons:
        return pd.DataFrame()

    rows = []
    months = list(range(1, 13))
    
    for key, data in persons.items():
        base = data["base_info"]
        monthly = data['monthly_data']
        
        row = {
            "고유번호": base.get("고유번호", ""),
            "지역": base.get("지역", ""),
            "팀": base.get("팀", ""),
            "부서": base.get("부서", ""),
            "이름(KR)": base.get("이름(KR)", ""),
            "이름(RU)": base.get("이름(RU)", ""),
            "출결여부": base.get("출결여부", ""),
        }
        
        for m in months:
            m_data = monthly.get(m, {})
            row[f"{m}월 십일조"] = m_data.get("tithe", "")
            row[f"{m}월 메모"] = m_data.get("memo", "")
            
        rows.append(row)

    columns = [
        "고유번호", "지역", "팀", "부서", "이름(KR)", "이름(RU)", "출결여부"
    ]
    for m in months:
        columns.append(f"{m}월 십일조")
        columns.append(f"{m}월 메모")
        
    return pd.DataFrame(rows, columns=columns)
