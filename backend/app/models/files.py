from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import FileVisibility


class FileAsset(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Randomized on-disk filename (never the user-supplied name) to avoid path traversal /
    # collisions; original_filename is what's shown and downloaded-as.
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    uploaded_by_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    visibility: Mapped[FileVisibility] = mapped_column(
        Enum(FileVisibility, native_enum=True), nullable=False, default=FileVisibility.PRIVATE
    )
    # Only set when visibility == EMPLOYEE.
    shared_with_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
