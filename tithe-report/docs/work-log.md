# Work Log — tithe-report

---

## 현재 상태 (2026-03-01)

### 메뉴 구성
1. 취합 파일 생성 → `ui/file_generation.py` + `services/file_generation_service.py`
2. 파일 병합 → `ui/merge.py` + `services/merge_service.py`
3. 보고 자료 생성 → `ui/report.py` + `services/report_service.py`
4. 연간 통계 → `ui/annual_stats.py` + `services/annual_stats_service.py`
5. 사용 매뉴얼 → `ui/manual.py`

### 지역 코드 (config.py REGION_CONFIGS)
KOR(국내) · RUS(러시아/모스크바) · YAK(야쿠츠크) · CRM(크림) · KAZ(카자흐스탄) · UZB(우즈베키스탄) · UKR(우크라이나)

### 주요 설계 결정
- 파일 업로드: xlsx 단건 또는 ZIP 묶음 모두 지원
- 번역: Google AI (google-generativeai), 배치 크기 20 (config.py TRANSLATION_BATCH_SIZE)
- 헤더 프리셋: domestic_header_presets.json 로컬 저장

---

## 변경 이력

### 연간 통계 개선 (commit e538754)
- 개별 연간 통계에 총납부율·6개월 납부율 열 추가
- `annual_stats_service.py` 수정

### 국내 텍스트 출력 방식 변경 (commit 4b847b8)
- text_area → code 블록으로 변경
- `ui/annual_stats.py` 수정

### 연간 통계 UI 개선 + CLAUDE.md 추가 (commit 53bf11b)
- 연간 통계 화면 UI 개선
- 프로젝트 가이드(CLAUDE.md) 최초 작성

### CLAUDE.md 축약 + work-log.md 도입 (2026-03-01)
- CLAUDE.md를 최소화하여 매 대화 토큰 절약
- docs/work-log.md 신설 — 컨텍스트 복원용
