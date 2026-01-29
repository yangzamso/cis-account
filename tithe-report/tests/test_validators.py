import pandas as pd

from config import FILE_GEN_REQUIRED_COLUMNS
from utils.validators import build_rename_map


def test_validate_required_columns():
    df = pd.DataFrame(columns=["고유번호", "지역", "팀", "구역", "부서", "이름(KR)"])
    aliases = {col: [col] for col in FILE_GEN_REQUIRED_COLUMNS}

    _, _, missing = build_rename_map(df, FILE_GEN_REQUIRED_COLUMNS, aliases)
    assert "이름(RU)" in missing
