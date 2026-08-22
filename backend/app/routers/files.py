import os
import uuid

from fastapi import APIRouter, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.config import settings
from app.deps import AdminEmployee, CurrentEmployee, DbSession
from app.enums import EmployeeRole, FileVisibility
from app.models import Employee, FileAsset
from app.schemas.files import FileOut
from app.services.audit_service import write_audit_entry

router = APIRouter(prefix="/files", tags=["files"])


def _file_out(file: FileAsset, uploader_name: str, shared_with_name: str | None) -> FileOut:
    return FileOut(
        id=file.id,
        original_filename=file.original_filename,
        content_type=file.content_type,
        size_bytes=file.size_bytes,
        uploaded_by_employee_id=file.uploaded_by_employee_id,
        uploaded_by_name=uploader_name,
        visibility=file.visibility,
        shared_with_employee_id=file.shared_with_employee_id,
        shared_with_employee_name=shared_with_name,
        created_at=file.created_at,
    )


def _hydrate(db: DbSession, files: list[FileAsset]) -> list[FileOut]:
    if not files:
        return []
    employee_ids = {f.uploaded_by_employee_id for f in files} | {f.shared_with_employee_id for f in files if f.shared_with_employee_id}
    names = {e.id: e.full_name for e in db.execute(select(Employee).where(Employee.id.in_(employee_ids))).scalars().all()}
    return [
        _file_out(f, names.get(f.uploaded_by_employee_id, "Unknown"), names.get(f.shared_with_employee_id) if f.shared_with_employee_id else None)
        for f in files
    ]


def _can_access(file: FileAsset, current: Employee) -> bool:
    if current.role == EmployeeRole.HR_ADMIN:
        return True
    if file.uploaded_by_employee_id == current.id:
        return True
    if file.visibility == FileVisibility.ORGANIZATION:
        return True
    if file.visibility == FileVisibility.EMPLOYEE and file.shared_with_employee_id == current.id:
        return True
    return False


@router.post("", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    db: DbSession,
    current: AdminEmployee,
    file: UploadFile,
    visibility: FileVisibility = Form(FileVisibility.PRIVATE),
    shared_with_employee_id: int | None = Form(None),
):
    if visibility == FileVisibility.EMPLOYEE and not shared_with_employee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="shared_with_employee_id is required when visibility is EMPLOYEE")
    if shared_with_employee_id:
        if shared_with_employee_id == current.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot share a file with yourself")
        target = db.get(Employee, shared_with_employee_id)
        if target is None or not target.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target employee not found")

    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_size_bytes // (1024 * 1024)}MB limit",
        )

    os.makedirs(settings.uploads_dir, exist_ok=True)
    original_name = file.filename or "upload"
    extension = os.path.splitext(original_name)[1][:20]
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    with open(os.path.join(settings.uploads_dir, stored_filename), "wb") as f:
        f.write(content)

    file_asset = FileAsset(
        stored_filename=stored_filename,
        original_filename=original_name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        uploaded_by_employee_id=current.id,
        visibility=visibility,
        shared_with_employee_id=shared_with_employee_id if visibility == FileVisibility.EMPLOYEE else None,
    )
    db.add(file_asset)
    db.flush()
    write_audit_entry(
        db,
        entity_type="file",
        entity_id=file_asset.id,
        action="FILE_UPLOADED",
        actor_employee_id=current.id,
        after_value={"original_filename": original_name, "visibility": visibility.value},
    )
    db.commit()
    db.refresh(file_asset)

    shared_with_name = db.get(Employee, shared_with_employee_id).full_name if shared_with_employee_id else None
    return _file_out(file_asset, current.full_name, shared_with_name)


@router.get("/mine", response_model=list[FileOut])
def list_my_files(db: DbSession, current: CurrentEmployee):
    files = db.execute(
        select(FileAsset).where(FileAsset.uploaded_by_employee_id == current.id).order_by(FileAsset.created_at.desc())
    ).scalars().all()
    return _hydrate(db, list(files))


@router.get("/shared-with-me", response_model=list[FileOut])
def list_shared_with_me(db: DbSession, current: CurrentEmployee):
    files = db.execute(
        select(FileAsset)
        .where(FileAsset.visibility == FileVisibility.EMPLOYEE, FileAsset.shared_with_employee_id == current.id)
        .order_by(FileAsset.created_at.desc())
    ).scalars().all()
    return _hydrate(db, list(files))


@router.get("/organization", response_model=list[FileOut])
def list_organization_files(db: DbSession, _: CurrentEmployee):
    files = db.execute(
        select(FileAsset).where(FileAsset.visibility == FileVisibility.ORGANIZATION).order_by(FileAsset.created_at.desc())
    ).scalars().all()
    return _hydrate(db, list(files))


@router.get("/{file_id}/download")
def download_file(file_id: int, db: DbSession, current: CurrentEmployee):
    file_asset = db.get(FileAsset, file_id)
    if file_asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if not _can_access(file_asset, current):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    disk_path = os.path.join(settings.uploads_dir, file_asset.stored_filename)
    if not os.path.exists(disk_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content missing on server")

    return FileResponse(disk_path, media_type=file_asset.content_type, filename=file_asset.original_filename)


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(file_id: int, db: DbSession, current: CurrentEmployee):
    file_asset = db.get(FileAsset, file_id)
    if file_asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if file_asset.uploaded_by_employee_id != current.id and current.role != EmployeeRole.HR_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the uploader or HR admin can delete this file")

    disk_path = os.path.join(settings.uploads_dir, file_asset.stored_filename)
    if os.path.exists(disk_path):
        os.remove(disk_path)

    write_audit_entry(
        db,
        entity_type="file",
        entity_id=file_asset.id,
        action="FILE_DELETED",
        actor_employee_id=current.id,
        before_value={"original_filename": file_asset.original_filename},
    )
    db.delete(file_asset)
    db.commit()
