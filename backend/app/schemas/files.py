from datetime import datetime

from pydantic import BaseModel

from app.enums import FileVisibility


class FileOut(BaseModel):
    id: int
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_by_employee_id: int
    uploaded_by_name: str
    visibility: FileVisibility
    shared_with_employee_id: int | None = None
    shared_with_employee_name: str | None = None
    created_at: datetime
