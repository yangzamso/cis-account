# Work Log — month-end-report

---

## 현재 상태 (2026-03-01)

### 메뉴 구성
1. 보고서 변환 → `ui/report_converter.py`
2. 사용 매뉴얼 → `ui/manual.py`

### 구현된 기능

#### 보고서 변환
- 러시아어 월말 재정 보고서 텍스트 → 한국어 포맷 텍스트 변환
- Gemini API로 구조화 JSON 추출 → Python 템플릿으로 한국어 렌더링
- 다중 화폐 지원: KZT(텡게), RUB(루블), USD($), UZS(숨)
- 화폐별 분리 출력: 화폐마다 독립 블록 (총계 → 예금 → 현금 순)
- UI: 좌측(API설정 + 원문 입력) / 우측(변환 결과)

### 데이터 흐름
```
러시아어 원문
  → services/report_parser_service.py (Gemini API → MonthEndReport JSON)
  → services/report_formatter_service.py (→ 한국어 텍스트)
  → ui/report_converter.py (Streamlit 표시)
```

### 스키마 구조 (models/schemas.py)
```
MonthEndReport
  date: str                    # "12월 27일"
  currency_blocks: List[CurrencyBlock]
    currency: str              # "KZT" | "RUB" | "USD" | "UZS"
    summary: Optional[AccountData]  # 총계 (없으면 null)
    accounts: List[AccountData]     # bank / cash
      type: str                # "bank" | "cash"
      prev_balance, income, expense, balance: float
      income_details, expense_details: List[DetailItem]
  extra: List[str]             # 비정형 추가 정보
```

### 미구현 예정 기능
- Excel 출력

---

## 변경 이력

### 프로젝트 골격 생성 (2026-03-01)
- app.py, config.py, models/schemas.py, services/, ui/components.py, ui/manual.py, utils/, tests/ 생성

### CLAUDE.md 축약 + work-log.md 도입 (2026-03-01)
- CLAUDE.md 최소화, docs/work-log.md 신설

### 보고서 변환 기능 구현 (2026-03-01)
- config.py: CURRENCY_LABELS, CURRENCY_SYMBOLS, ACCOUNT_TYPE_LABELS, ACCOUNT_BALANCE_LABELS 추가
- models/schemas.py: DetailItem, AccountData, CurrencyBlock, MonthEndReport 추가
- services/report_parser_service.py: Gemini API 호출, JSON 파싱, Pydantic 검증
- services/report_formatter_service.py: 한국어 템플릿 렌더링
- ui/report_converter.py: Streamlit UI
- app.py: "보고서 변환" 메뉴 추가
- requirements.txt: google-generativeai 추가
