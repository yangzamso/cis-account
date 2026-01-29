# -*- coding: utf-8 -*-
"""Pydantic schemas for app data."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class MergeFileInput(BaseModel):
    name: str = Field(..., description="업로드된 파일명")
    size: int = Field(..., description="파일 크기")


class MergeResult(BaseModel):
    total_rows: int = Field(..., description="병합 결과 행 수")
    duplicate_rows: int = Field(..., description="중복 리포트 행 수")
    file_names: List[str] = Field(default_factory=list, description="생성된 파일 목록")


class TranslateConfig(BaseModel):
    enabled: bool = Field(default=False)
    model: Optional[str] = None
    api_key: Optional[str] = None
