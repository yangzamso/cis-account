import streamlit as st
import pandas as pd
import re

# 페이지 설정
st.set_page_config(page_title="명단 생성기", layout="wide")

# 스타일 설정
st.markdown("""
<style>
    .stApp {
        max-width: 100%;
        margin: 0 auto;
    }
    /* 타이틀(명단 생성기) 크기 조정 */
    h1 {
        font-size: 20px !important;
    }
    /* 소제목(H2, H3) 크기 조정 */
    h2, h3, .stHeader {
        font-size: 18px !important;
    }
    .stTextArea textarea {
        font-family: monospace;
    }
</style>
""", unsafe_allow_html=True)

def generate_roster(df, team_names, header_text):
    """명단 텍스트 생성 로직"""
    output = []
    
    # 1. 사용자 작성 머리글 (전체 최상단에 1회 표시)
    if header_text:
        output.append(header_text.strip())
        output.append("")  # 공백 라인

    # 선택된 각 팀에 대해 반복 처리
    for team_name in team_names:
        # 2. 팀명
        output.append(f"[{team_name}]")

        # 팀 이름에 "국내"가 포함되면 국내 모드 적용
        is_korea = "국내" in team_name

        # 데이터 필터링
        team_df = df[df['팀'] == team_name]
        
        # 구역 목록 추출 (원본 순서 유지)
        # unique()는 발견 순서를 유지합니다
        zones = team_df['구역'].unique()
        
        for zone in zones:
            zone_df = team_df[team_df['구역'] == zone]
            
            # 3. 구역명
            if is_korea:
                # 국내 팀: 기존 표기 유지
                output.append(f"[{zone}]")
            else:
                # 해외 팀: 러시아어 표기 (Ячейка + 숫자 이모지)
                # 정규식으로 숫자만 추출
                numbers = re.findall(r'\d+', str(zone))
                if numbers:
                    num_str = numbers[0]
                    # 숫자를 이모지로 1:1 매핑
                    num_map = {'0':'0️⃣','1':'1️⃣','2':'2️⃣','3':'3️⃣','4':'4️⃣','5':'5️⃣','6':'6️⃣','7':'7️⃣','8':'8️⃣','9':'9️⃣'}
                    emoji_str = "".join([num_map.get(c, c) for c in num_str])
                    output.append(f"[Ячейка {emoji_str}]")
                else:
                    # 숫자가 없으면 원본 그대로 출력하거나 예외 처리
                    output.append(f"[{zone}]")
            
            # 5. 명단 데이터
            for idx, (_, row) in enumerate(zone_df.iterrows(), start=1):
                # 출결 여부 확인
                attendance = str(row['출결여부']).strip() if pd.notna(row['출결여부']) else ""
                mark = "X" if attendance == "출결제외" else ""
                
                # 이름 추출 (국내 모드면 KR, 아니면 RU 우선, 없으면 기본 '이름')
                if is_korea:
                    name = row.get('이름(KR)', row.get('이름', ''))
                else:
                    name = row.get('이름(RU)', row.get('이름', ''))
                
                # 데이터 라인 생성
                if is_korea:
                    # 국내: 고유번호 제외
                    line = f"{idx}/{name}/{mark}"
                else:
                    # 해외: 고유번호 포함 (없으면 빈값 처리)
                    uniq_num = row.get('고유번호', '')
                    line = f"{idx}/{uniq_num}/{name}/{mark}"
                
                output.append(line)
            
            output.append("")  # 구역 간 공백 라인
        
        output.append("")  # 팀 간 공백 라인

    return "\n".join(output)

def main():
    st.title("명단 생성기")

    # 레이아웃 분할 (좌측 1 : 우측 2)
    left_col, right_col = st.columns([1, 2])

    # 상태 관리를 위한 초기화
    if 'generated_roster' not in st.session_state:
        st.session_state.generated_roster = ""

    with left_col:
        st.header("1. 파일 업로드")
        uploaded_file = st.file_uploader("엑셀 파일을 업로드하세요", type=['xlsx', 'xls'])

        selected_teams = []
        df = None

        if uploaded_file:
            try:
                df = pd.read_excel(uploaded_file)
                
                # 열 이름 공백 제거 (안전장치)
                df.columns = df.columns.str.strip()
                
                # [수정] '출결'이 포함된 열을 찾아 '출결여부'로 매핑 (유연한 처리)
                if '출결여부' not in df.columns:
                    attendance_col = next((col for col in df.columns if '출결' in col), None)
                    if attendance_col:
                        df = df.rename(columns={attendance_col: '출결여부'})

                # 필수 열 검증
                # 기본 필수: 팀, 구역, 출결여부
                base_required = ['팀', '구역', '출결여부']
                missing_cols = [col for col in base_required if col not in df.columns]
                
                # 이름 관련 열이 하나라도 있는지 확인
                has_name_col = any(col in df.columns for col in ['이름', '이름(KR)', '이름(RU)'])
                
                if missing_cols:
                    st.error(f"필수 열이 누락되었습니다: {', '.join(missing_cols)}")
                    df = None
                elif not has_name_col:
                    st.error("이름 관련 열(이름, 이름(KR), 이름(RU)) 중 하나는 반드시 포함되어야 합니다.")
                    df = None
                else:
                    st.success("파일 로드 성공!")
                    
                    # 팀 목록 추출 (중복 제거 및 정렬)
                    team_list = sorted(df['팀'].dropna().unique())
                    
                    st.header("2. 팀 선택")
                    
                    # 전체 선택/해제 버튼
                    col_chk1, col_chk2 = st.columns(2)
                    if col_chk1.button("✅ 전체 선택", use_container_width=True):
                        for team in team_list:
                            st.session_state[f"chk_{team}"] = True
                        st.rerun()
                            
                    if col_chk2.button("⬜ 전체 해제", use_container_width=True):
                        for team in team_list:
                            st.session_state[f"chk_{team}"] = False
                        # 생성된 명단 결과 초기화
                        st.session_state.generated_roster = ""
                        st.rerun()

                    selected_teams = []
                    # 전체 팀 리스트 표시 (2열 레이아웃)
                    with st.container():
                        # 2열로 나누기
                        col1, col2 = st.columns(2)
                        
                        # 팀을 반으로 나누어 배치
                        mid_point = (len(team_list) + 1) // 2
                        left_teams = team_list[:mid_point]
                        right_teams = team_list[mid_point:]
                        
                        # 왼쪽 열
                        with col1:
                            for team in left_teams:
                                key = f"chk_{team}"
                                if key not in st.session_state:
                                    st.session_state[key] = False
                                    
                                if st.checkbox(team, key=key):
                                    selected_teams.append(team)
                        
                        # 오른쪽 열
                        with col2:
                            for team in right_teams:
                                key = f"chk_{team}"
                                if key not in st.session_state:
                                    st.session_state[key] = False
                                    
                                if st.checkbox(team, key=key):
                                    selected_teams.append(team)

            except Exception as e:
                st.error(f"파일을 읽는 중 오류가 발생했습니다: {e}")

    with right_col:
        if selected_teams and df is not None:
            st.header("3. 머리글 및 명단 생성")
            
            # 머리글 입력
            header_text = st.text_area(
                "머리글 설정 (선택사항)",
                height=150,
                placeholder="안내문구를 작성한 후, 명단 생성을 클릭해주세요."
            )
            
            # 명단 생성 버튼
            if st.button("📋 명단 생성"):
                roster_text = generate_roster(df, selected_teams, header_text)
                st.session_state.generated_roster = roster_text
            
            # 결과 출력 영역
            if st.session_state.generated_roster:
                st.subheader("생성 결과")
                
                # 도구 모음 (복사 버튼 안내)
                st.info("↗️ 우측 상단의 '복사' 아이콘을 누르면 전체 복사가 가능합니다.")

                # 복사하기 편한 코드 블록 형태로 표시 (우측 상단 복사 버튼 포함)
                st.code(st.session_state.generated_roster, language="text")


                
        else:
            if not uploaded_file:
                st.info("👈 좌측에서 엑셀 파일을 먼저 업로드해주세요.")
            elif not selected_teams:
                st.info("👈 좌측에서 하나 이상의 팀을 선택해주세요.")

if __name__ == "__main__":
    main()
