# -*- coding: utf-8 -*-
from __future__ import annotations

from models.schemas import AccountData, CurrencyBlock, MonthEndReport
from config import (
    ACCOUNT_BALANCE_LABELS,
    ACCOUNT_TYPE_LABELS,
    CURRENCY_LABELS,
    CURRENCY_SYMBOLS,
)

_SEP = "———————————————————"


def _fmt(amount: float) -> str:
    if amount == int(amount):
        return f"{int(amount):,}"
    return f"{amount:,.2f}"


def _sym(amount: float, symbol: str) -> str:
    return f"{_fmt(amount)} {symbol}"


def _render_summary(acc: AccountData, symbol: str, date: str) -> str:
    lines = [f"📅 {date} 기준"]
    lines.append(f"① 전월 이월금: {_sym(acc.prev_balance, symbol)}")
    lines.append(f"② 월간 헌금: {_sym(acc.income, symbol)}")
    lines.append(f"③ 월간 지출: {_sym(acc.expense, symbol)}")
    lines.append(f"④ 계좌 잔액: {_sym(acc.balance, symbol)}")
    return "\n".join(lines)


def _render_account(acc: AccountData, symbol: str, currency_label: str) -> str:
    if acc.type == "bank":
        header = f"《{ACCOUNT_TYPE_LABELS['bank']}》"
    else:
        header = f"《{ACCOUNT_TYPE_LABELS['cash']}》 - {currency_label}"
    balance_label = ACCOUNT_BALANCE_LABELS.get(acc.type, "잔액")
    lines = [header, ""]
    lines.append(f"① 지난달 잔액: {_sym(acc.prev_balance, symbol)}")
    lines.append(f"② 월간 입금: {_sym(acc.income, symbol)}")
    for d in acc.income_details:
        lines.append(f"　- {d.label}: {_fmt(d.amount)}")
    lines.append(f"③ 월간 출금: {_sym(acc.expense, symbol)}")
    for d in acc.expense_details:
        lines.append(f"　- {d.label}: {_fmt(d.amount)}")
    lines.append(f"④ {balance_label}: {_sym(acc.balance, symbol)}")
    return "\n".join(lines)


def _render_currency_block(block: CurrencyBlock, date: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(block.currency, f"[{block.currency}]")
    label = CURRENCY_LABELS.get(block.currency, block.currency)
    parts = []

    if block.summary:
        parts.append(_render_summary(block.summary, symbol, date))
    else:
        parts.append(f"📅 {date} 기준")

    if block.accounts:
        parts.append(_SEP)
        parts.append("\n\n".join(_render_account(a, symbol, label) for a in block.accounts))

    return "\n\n".join(parts)


def format_report(report: MonthEndReport) -> str:
    blocks = [_render_currency_block(b, report.date) for b in report.currency_blocks]
    result = "\n\n\n".join(blocks)
    if report.extra:
        result += "\n\n" + _SEP + "\n\n" + "\n".join(report.extra)
    return result
