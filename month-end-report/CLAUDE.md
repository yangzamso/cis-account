# month-end-report

CIS 교회 월말 재정 보고서 생성용 Streamlit 앱.

## 스택
Python 3.13 · Streamlit · Pandas · OpenPyXL · Pydantic

## 구조
app.py → config.py → services/ → ui/ → utils/ → models/
services/에 UI 없음. ui/에 비즈니스 로직 없음.

## 규칙
- 요청한 부분만 수정. 관련 없는 코드 금지.
- 기존 패턴 모방. 새 패턴·함수·변수 무분별 생성 금지.
- config.py 상수 활용. 하드코딩 금지.
- 상세 스타일: docs/ai-style.md

## 컨텍스트 복원 필요 시
docs/work-log.md 먼저 읽을 것.
