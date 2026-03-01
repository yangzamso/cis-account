# -*- coding: utf-8 -*-
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class DetailItem(BaseModel):
    label: str
    amount: float


class AccountData(BaseModel):
    type: str  # "summary" | "bank" | "cash"
    prev_balance: float
    income: float
    income_details: List[DetailItem] = Field(default_factory=list)
    expense: float
    expense_details: List[DetailItem] = Field(default_factory=list)
    balance: float


class CurrencyBlock(BaseModel):
    currency: str  # "KZT" | "RUB" | "USD" | "UZS"
    summary: Optional[AccountData] = None
    accounts: List[AccountData]


class MonthEndReport(BaseModel):
    date: str
    currency_blocks: List[CurrencyBlock]
    extra: List[str] = Field(default_factory=list)
