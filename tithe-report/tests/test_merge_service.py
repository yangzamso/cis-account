import pandas as pd

from services.merge_service import compute_merge_views


def test_compute_merge_views():
    raw_df = pd.DataFrame(
        {
            "고유번호": ["A", "A", "B"],
            "금액": [1000, 2000, 3000],
            "메모": ["m1", "m2", "m3"],
            "지역": ["국내", "국내", "해외"],
            "팀": ["팀1", "팀1", "팀2"],
            "구역": ["1구역", "1구역", "2구역"],
            "부서": ["부1", "부1", "부2"],
            "이름(KR)": ["홍길동", "홍길동", "김철수"],
            "이름(RU)": ["RU1", "RU1", "RU2"],
            "출결여부": ["O", "O", "X"],
            "__source": ["f1.xlsx", "f2.xlsx", "f3.xlsx"],
        }
    )

    duplicate_view, merged_view = compute_merge_views(raw_df)

    assert len(duplicate_view) == 2
    assert set(duplicate_view["고유번호"].tolist()) == {"A"}
    assert "원본파일" in duplicate_view.columns

    assert len(merged_view) == 2
    assert set(merged_view["고유번호"].tolist()) == {"A", "B"}
    assert merged_view.loc[merged_view["고유번호"] == "A", "금액"].iloc[0] in (1000, 2000)
