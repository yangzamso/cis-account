# month-end-report 프로젝트 가이드

> 전역 규칙(`~/.claude/CLAUDE.md`)을 상속하며, 아래 규칙이 충돌 시 이 파일이 우선한다.

## 프로젝트 개요

CIS(구소련 지역) 교회 월말 재정 보고서 생성용 Streamlit(웹 앱 프레임워크) 앱.

## 실행 환경

```bash
# Python 가상환경(의존성 격리 공간) 위치
.venv/Scripts/python.exe        # Windows
.venv/Scripts/streamlit.exe     # Streamlit 실행

# 앱 실행
.venv/Scripts/streamlit.exe run app.py

# 테스트 실행
.venv/Scripts/python.exe -m pytest tests/
```

## 파일 구조

```
app.py                  # 진입점 - 메뉴 라우팅만 담당
config.py               # 상수, 설정값 모음 (여기서 수치/문자열 관리)
models/schemas.py       # Pydantic(데이터 검증 도구) 스키마
services/               # 비즈니스 로직 (순수 함수, UI 없음)
ui/                     # Streamlit UI 레이어 (services 호출만)
  components.py         # 공통 컴포넌트 (메뉴, 페이지 설정)
  manual.py             # 사용 매뉴얼 화면
utils/                  # 범용 유틸리티
tests/                  # pytest 테스트
docs/ai-style.md        # AI 코딩 스타일 가이드 (권위 문서)
```

## 핵심 코딩 규칙

이 프로젝트의 **절대 원칙**은 `docs/ai-style.md`를 따른다. 요약:

1. **요청한 부분만 수정한다.** 관련 없는 코드는 절대 건드리지 않는다.
2. **기존 패턴을 그대로 모방한다.** 새 패턴 도입 금지.
3. **주석·docstring을 새로 추가하지 않는다.** 기존 것도 수정하지 않는다.
4. **타입 힌트·에러 핸들링을 임의로 추가하지 않는다.**
5. **리팩토링, 이름 변경, 포맷 변경은 명시적으로 요청받지 않으면 하지 않는다.**
6. **`config.py`의 상수를 활용한다.** 하드코딩 금지.
7. **`services/`에 UI 코드를 넣지 않는다.** `ui/`에 비즈니스 로직을 넣지 않는다.

## 현재 스택 (변경 금지)

| 도구 | 버전 | 역할 |
|------|------|------|
| Python | 3.13 | 언어 |
| Streamlit | ≥1.20 | 웹 UI |
| Pandas | ≥2.0 | 데이터 처리 |
| OpenPyXL | ≥3.1 | Excel 읽기/쓰기 |
| Pydantic | ≥2.0 | 데이터 검증 |
