import pandas as pd

from utils.excel_utils import clean_amount, clean_amount_vectorized


def test_clean_amount():
    assert clean_amount("1,000") == 1000
    assert clean_amount("1.5") == 1.5
    assert pd.isna(clean_amount(""))
    assert pd.isna(clean_amount("-"))


def test_clean_amount_vectorized():
    series = pd.Series(["1,000", "1.5", "", "-", None])
    out = clean_amount_vectorized(series)
    assert out.iloc[0] == 1000
    assert out.iloc[1] == 1.5
    assert pd.isna(out.iloc[2])
    assert pd.isna(out.iloc[3])
    assert pd.isna(out.iloc[4])
