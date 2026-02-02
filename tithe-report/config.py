# -*- coding: utf-8 -*-

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

HEADER_PRESET_FILE = "domestic_header_presets.json"

DEFAULT_HEADER_PRESETS = {
    "기타": "",
    "십일조": "",
    "회비-청장년": "",
    "회비-부녀": "",
    "회비-청년": "",
}

NAME_KR_WIDTH = 25
NAME_RU_WIDTH = 35

MENU_OPTIONS = [
    "취합 파일 생성",
    "파일 병합",
    "보고 자료 생성",
    "연간 통계",
    "사용 매뉴얼",
]

FILE_GEN_REQUIRED_COLUMNS = [
    "고유번호",
    "지역",
    "팀",
    "구역",
    "부서",
    "이름(KR)",
    "이름(RU)",
]

FILE_GEN_OUTPUT_COLUMNS = [
    "번호",
    "고유번호",
    "지역",
    "팀",
    "구역",
    "부서",
    "이름(KR)",
    "이름(RU)",
    "출결여부",
    "금액(десятина)",
    "메모(примечание)",
]

COLUMN_ALIASES = {
    "이름(KR)": ["이름(kr)", "이름(KR)", "이름(Kr)"],
    "이름(RU)": ["이름(ru)", "이름(RU)", "이름(Ru)"],
}


@dataclass(frozen=True)
class RegionConfig:
    code: str
    column: str
    keywords: List[str]
    label: str


REGION_CONFIGS = [
    RegionConfig("KOR", "지역", ["국내"], "KOR-국내"),
    RegionConfig("RUS", "팀", ["러시아", "모스크바"], "RUS-러시아(모스크바)"),
    RegionConfig("YAK", "팀", ["야쿠츠크"], "YAK-러시아(야쿠츠크)"),
    RegionConfig("CRM", "팀", ["크림"], "CRM-러시아(크림지역)"),
    RegionConfig("KAZ", "팀", ["카자흐스탄"], "KAZ-카자흐스탄"),
    RegionConfig("UZB", "팀", ["우즈베키스탄"], "UZB-우즈베키스탄"),
    RegionConfig("UKR", "팀", ["우크라이나"], "UKR-우크라이나"),
]

EXCEL_CONFIG: Dict[str, int] = {
    "name_kr_width": NAME_KR_WIDTH,
    "name_ru_width": NAME_RU_WIDTH,
}

MERGE_OUTPUT_FILENAME_PATTERN = "전체-CIS-TITHE-{yy_mm}.xlsx"

# Processing thresholds
LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024  # 10MB
TRANSLATION_BATCH_SIZE = 20
