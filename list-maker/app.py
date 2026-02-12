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
    /* 타이틀 및 제목 크기 원복 */
    h1 { font-size: 20px !important; }
    h2, h3, .stHeader { font-size: 18px !important; }
    
    /* 태블릿 환경: 4열 -> 2열 통일 (992px 이하) */
    @media (max-width: 992px) and (min-width: 601px) {
        /* 구역 리스트(Streamlit Columns) 보정 */
        div[data-testid="stHorizontalBlock"] > div[data-testid="column"] {
            flex: 1 1 calc(50% - 1rem) !important;
            min-width: calc(50% - 1rem) !important;
        }
        /* 팀 선택(Radio Grid) 보정 */
        div[data-testid="stRadio"] > div {
            grid-template-columns: repeat(2, 1fr) !important;
        }
    }

    /* 모바일 환경: 2열 -> 1열 통일 (600px 이하) */
    @media (max-width: 600px) {
        /* 구역 리스트 보정 */
        div[data-testid="stHorizontalBlock"] > div[data-testid="column"] {
            flex: 1 1 100% !important;
            min-width: 100% !important;
        }
        /* 팀 선택 보정 */
        div[data-testid="stRadio"] > div {
            grid-template-columns: 1fr !important;
        }
    }

    /* 기본 설정: PC 환경 (4열) */
    div[data-testid="stRadio"] > div {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        width: 100%;
    }
</style>
""", unsafe_allow_html=True)

def generate_roster(df, selected_category, selected_zones, header_text, target_type="all"):
    """필터링된 데이터로 명단 텍스트 생성
    
    Args:
        target_type: "all" (모든 구역원) 또는 "cis" (사명자)
    """
    output = []
    
    # 1. 사용자 작성 머리글
    if header_text:
        output.append(header_text.strip())
        output.append("")

    # 선택된 카테고리가 포함된 팀들 필터링
    matched_teams = sorted(df[df['팀'].str.contains(selected_category, na=False)]['팀'].unique())
    
    # 팀 이름에 "국내"가 포함되면 국내 모드 적용
    is_korea = "국내" in selected_category

    # 모든 팀의 데이터를 합쳐서 구역별로 정리
    all_data = []
    for team_name in matched_teams:
        team_df = df[df['팀'] == team_name]
        all_data.append(team_df)
    
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
    else:
        return "\n".join(output)
    
    # 대상 선택에 따른 필터링
    if target_type == "cis":
        # "CIS" 열이 존재하는지 확인
        cis_col = None
        for col in combined_df.columns:
            if "CIS" in str(col).upper():
                cis_col = col
                break
        
        if cis_col:
            # CIS 열에서 빈 셀이 아닌 행만 필터링
            combined_df = combined_df[combined_df[cis_col].notna() & (combined_df[cis_col] != "")]
        else:
            # CIS 열이 없으면 빈 결과 반환
            output.append("※ 'CIS' 열을 찾을 수 없습니다.")
            return "\n".join(output)
    
    elif target_type == "admin":
        # "행정" 열이 존재하는지 확인
        admin_col = None
        for col in combined_df.columns:
            if "행정" in str(col):
                admin_col = col
                break
        
        if admin_col:
            # 행정 열에서 빈 셀이 아닌 행만 필터링
            combined_df = combined_df[combined_df[admin_col].notna() & (combined_df[admin_col] != "")]
        else:
            # 행정 열이 없으면 빈 결과 반환
            output.append("※ '행정' 열을 찾을 수 없습니다.")
            return "\n".join(output)
    
    # 선택된 구역들만 필터링하고 오름차순 정렬
    filtered_zones = [z for z in selected_zones if z in combined_df['구역'].unique()]
    sorted_zones = sorted(filtered_zones)
    
    # "새" 키워드가 있는 구역을 위한 헤더 출력 여부 플래그
    new_believer_header_printed = False
    
    for zone in sorted_zones:
        zone_df = combined_df[combined_df['구역'] == zone]
        
        # 구역 이름에 "새"가 포함되어 있는지 확인
        if "새" in str(zone) and not new_believer_header_printed:
            output.append("[Новые верующие]")
            output.append("")  # 빈 줄
            new_believer_header_printed = True
        
        # 구역명 표기
        if is_korea:
            output.append(f"[{zone}]")
        else:
            # 숫자 이모지 매핑
            num_map = {'0':'0️⃣','1':'1️⃣','2':'2️⃣','3':'3️⃣','4':'4️⃣','5':'5️⃣','6':'6️⃣','7':'7️⃣','8':'8️⃣','9':'9️⃣'}
            
            # 구역명에서 숫자와 구분기호(-, /)만 추출
            zone_str = str(zone)
            filtered_zone = ""
            for char in zone_str:
                if char.isdigit() or char in ['-', '/']:
                    filtered_zone += char
            
            # 숫자를 이모지로 변환
            emoji_zone = ""
            for char in filtered_zone:
                if char.isdigit():
                    emoji_zone += num_map.get(char, char)
                else:
                    emoji_zone += char  # -, / 등은 그대로 유지
            
            # 숫자가 포함되어 있으면 이모지 버전 사용, 아니면 원본 유지
            if emoji_zone:
                output.append(f"[Ячейка {emoji_zone}]")
            else:
                output.append(f"[{zone}]")
        
        # 명단 데이터 (엑셀 순서 유지)
        for idx, (_, row) in enumerate(zone_df.iterrows(), start=1):
            attendance = str(row['출결여부']).strip() if pd.notna(row['출결여부']) else ""
            mark = "X" if attendance == "출결제외" else ""
            
            if is_korea:
                name = row.get('이름(KR)', row.get('이름', ''))
                line = f"{idx}/{name}/{mark}"
            else:
                name = row.get('이름(RU)', row.get('이름', ''))
                uniq_num = row.get('고유번호', '')
                line = f"{idx}/{uniq_num}/{name}/{mark}"
            
            output.append(line)
        
        output.append("")  # 구역 간 공백

    return "\n".join(output)

def main():
    st.title("📋 명단 생성기")

    # 세션 상태 초기화
    if 'current_step' not in st.session_state:
        st.session_state.current_step = 1
    if 'generated_roster' not in st.session_state:
        st.session_state.generated_roster = ""

    # 레이아웃 분할 (1:1 비율)
    left_col, right_col = st.columns([1, 1])

    with left_col:
        st.header("1. 파일 업로드")
        uploaded_file = st.file_uploader("엑셀 파일을 업로드하세요", type=['xlsx', 'xls'])

        if uploaded_file:
            try:
                df = pd.read_excel(uploaded_file)
                df.columns = df.columns.str.strip()
                
                # 열 매핑 및 검증
                if '출결여부' not in df.columns:
                    attendance_col = next((col for col in df.columns if '출결' in col), None)
                    if attendance_col:
                        df = df.rename(columns={attendance_col: '출결여부'})

                base_required = ['팀', '구역', '출결여부']
                missing_cols = [col for col in base_required if col not in df.columns]
                has_name_col = any(col in df.columns for col in ['이름', '이름(KR)', '이름(RU)'])

                if missing_cols or not has_name_col:
                    st.error("필수 열이 부족합니다. (팀, 구역, 출결, 이름 등)")
                    return


                # 2. 팀 선택 (카테고리)
                st.header("2. 팀 선택")
                
                # 고정된 카테고리 목록
                categories = ["국내", "러시아", "야쿠츠크", "크림공화국", "카자흐스탄", "우즈베키스탄", "우크라이나"]
                
                # 3열 반응형 레이아웃으로 표시
                selected_cat = st.radio("항목을 선택하세요", categories, index=0, label_visibility="collapsed")
                
                # 팀 선택이 변경되었는지 확인
                if 'previous_category' not in st.session_state:
                    st.session_state.previous_category = selected_cat
                
                if st.session_state.previous_category != selected_cat:
                    # 팀이 변경되면 모든 구역 체크 해제 및 명단 초기화
                    # 기존 구역 체크박스 상태 모두 제거 (안전하게 리스트로 복사 후 삭제)
                    keys_to_remove = [key for key in list(st.session_state.keys()) if key.startswith('zone_')]
                    for key in keys_to_remove:
                        if key in st.session_state:
                            del st.session_state[key]
                    
                    # 생성된 명단 초기화
                    st.session_state.generated_roster = ""
                    st.session_state.current_step = 1
                    
                    # 현재 선택된 팀을 저장
                    st.session_state.previous_category = selected_cat
                
                # 선택된 카테고리가 포함된 데이터 필터링
                filtered_df = df[df['팀'].str.contains(selected_cat, na=False)]
                
                if filtered_df.empty:
                    st.warning(f"'{selected_cat}' 항목을 포함하는 팀이 없습니다.")
                    return

                # 3. 구역 선택
                st.header("3. 구역 선택")
                # 구역 데이터를 문자열로 변환 후 정렬 (타입 불일치 오류 방지)
                available_zones = sorted([str(z) for z in filtered_df['구역'].unique()])
                
                # 팀 선택 시 자동으로 모든 구역 선택
                if 'auto_select_zones' not in st.session_state or st.session_state.get('previous_category') != selected_cat:
                    for zone in available_zones:
                        st.session_state[f"zone_{zone}"] = True
                    st.session_state.auto_select_zones = True
                
                # 전체 선택/해제 버튼 (2개 나란히 배치)
                btn_col1, btn_col2 = st.columns(2)
                with btn_col1:
                    if st.button("✅ 전체 선택", use_container_width=True):
                        for zone in available_zones:
                            st.session_state[f"zone_{zone}"] = True
                        st.rerun()
                with btn_col2:
                    if st.button("⬜ 전체 해제", use_container_width=True):
                        for zone in available_zones:
                            st.session_state[f"zone_{zone}"] = False
                        st.rerun()
                
                # 구역 리스트를 4열로 배치 (CSS로 태블릿 2열, 모바일 1열 보정)
                selected_zones = []
                zone_cols = st.columns(4)
                for i, zone in enumerate(available_zones):
                    with zone_cols[i % 4]:
                        if st.checkbox(zone, key=f"zone_{zone}"):
                            selected_zones.append(zone)

                # 구역이 선택되면 자동으로 세션에 저장
                if selected_zones:
                    st.session_state.selected_zones = selected_zones
                
                # 4. 대상 선택 (구역이 하나라도 선택되면 표시)
                if selected_zones:
                    st.header("4. 대상 선택")
                    target_type = st.radio(
                        "대상 선택",
                        options=["모든 구역원", "행정 직책", "CIS 직책"],
                        index=0,
                        key="target_type_radio",
                        label_visibility="collapsed"
                    )
                    
                    # 대상 선택을 세션에 자동 저장
                    if target_type == "CIS 직책":
                        st.session_state.target_type = "cis"
                    elif target_type == "행정 직책":
                        st.session_state.target_type = "admin"
                    else:
                        st.session_state.target_type = "all"

            except Exception as e:
                st.error(f"오류 발생: {e}")

    with right_col:
        # 구역이 선택되면 명단 생성 화면 표시
        if uploaded_file and 'selected_zones' in st.session_state and st.session_state.selected_zones:
            st.header("5. 머리글 및 명단 생성")
            
            header_text = st.text_area(
                "머리글 입력",
                height=150,
                placeholder="명단 상단에 들어갈 내용을 입력하세요 (예: 2024년 2월 출석부)"
            )
            
            if st.button("🚀 명단 생성", use_container_width=True):
                # 세션에 저장된 구역과 대상 타입 사용
                saved_zones = st.session_state.get('selected_zones', selected_zones)
                saved_target = st.session_state.get('target_type', 'all')
                roster = generate_roster(df, selected_cat, saved_zones, header_text, saved_target)
                st.session_state.generated_roster = roster

            if st.session_state.generated_roster:
                st.subheader("결과 확인")
                st.info("💡 **아래의 텍스트를 직접 수정 할 수 있습니다.**  \n수정 완료 후 전체 선택(Ctrl+A) → 복사(Ctrl+C)하여 사용하세요.")
                st.text_area(
                    "생성된 명단",
                    value=st.session_state.generated_roster,
                    height=500,
                    label_visibility="collapsed"
                )
                
                if st.button("⬅️ 처음부터 다시 설정"):
                    st.session_state.current_step = 1
                    st.session_state.generated_roster = ""
                    st.rerun()
        else:
            st.info("👈 왼쪽에서 파일 업로드와 구역 선택을 완료한 후 '다음' 버튼을 눌러주세요.")

if __name__ == "__main__":
    main()
