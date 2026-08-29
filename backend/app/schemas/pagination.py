from typing import Annotated, Generic, Literal, TypeVar

from fastapi import Depends, Query
from pydantic import BaseModel

T = TypeVar("T")


class PageParams:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        sort_by: str | None = Query(None),
        sort_dir: Literal["asc", "desc"] = Query("asc"),
        q: str | None = Query(None),
    ):
        self.page = page
        self.page_size = page_size
        self.sort_by = sort_by
        self.sort_dir = sort_dir
        self.q = q

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


PageDep = Annotated[PageParams, Depends(PageParams)]
