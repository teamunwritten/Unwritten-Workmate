from pydantic import BaseModel


class Pagination(BaseModel):
    page: int = 1
    page_size: int = 20
    total: int = 0


class ErrorResponse(BaseModel):
    detail: str


class CheckResultOut(BaseModel):
    check_name: str
    outcome: str
    reason_code: str | None = None
    message: str | None = None
    metadata: dict = {}


class ValidationErrorResponse(BaseModel):
    outcome: str
    violations: list[CheckResultOut]
