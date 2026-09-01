from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminEmployee, DbSession
from app.models import (
    Employee,
    EmployeeSalaryAssignment,
    SalaryComponent,
    SalaryStructure,
    SalaryStructureComponent,
)
from app.schemas.compensation import (
    EmployeeSalaryAssignmentCreate,
    EmployeeSalaryAssignmentOut,
    EmployeeSalaryAssignmentSummaryOut,
    ResolvedComponentValueOut,
    SalaryComponentCreate,
    SalaryComponentOut,
    SalaryComponentUpdate,
    SalaryStructureComponentCreate,
    SalaryStructureComponentOut,
    SalaryStructureCreate,
    SalaryStructureOut,
    SalaryStructureUpdate,
)
from app.services.payroll_service import get_resolved_component_values, resolve_assignment_components

router = APIRouter(prefix="/compensation", tags=["compensation"])


# ---------- Salary components ----------


@router.get("/components", response_model=list[SalaryComponentOut])
def list_salary_components(db: DbSession, _: AdminEmployee):
    return db.execute(select(SalaryComponent)).scalars().all()


@router.post("/components", response_model=SalaryComponentOut, status_code=status.HTTP_201_CREATED)
def create_salary_component(payload: SalaryComponentCreate, db: DbSession, _: AdminEmployee):
    if db.execute(select(SalaryComponent).where(SalaryComponent.code == payload.code)).scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Component code already in use")
    component = SalaryComponent(**payload.model_dump())
    db.add(component)
    db.commit()
    db.refresh(component)
    return component


@router.patch("/components/{component_id}", response_model=SalaryComponentOut)
def update_salary_component(component_id: int, payload: SalaryComponentUpdate, db: DbSession, _: AdminEmployee):
    component = db.get(SalaryComponent, component_id)
    if component is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary component not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(component, field, value)
    db.commit()
    db.refresh(component)
    return component


# ---------- Salary structures ----------


def _structure_out(db: DbSession, structure: SalaryStructure) -> SalaryStructureOut:
    # Deactivated components drop out of the structure's effective line items -- the underlying
    # SalaryStructureComponent link isn't deleted, so reactivating the component brings it (and
    # its configured default_value) straight back with no re-entry needed.
    rows = db.execute(
        select(SalaryStructureComponent, SalaryComponent)
        .join(SalaryComponent, SalaryStructureComponent.salary_component_id == SalaryComponent.id)
        .where(SalaryStructureComponent.salary_structure_id == structure.id, SalaryComponent.is_active.is_(True))
        .order_by(SalaryStructureComponent.display_order)
    ).all()
    components = [
        SalaryStructureComponentOut(
            id=sc.id,
            salary_component_id=sc.salary_component_id,
            component_code=c.code,
            component_name=c.name,
            component_type=c.component_type,
            calculation_type=c.calculation_type,
            default_value=sc.default_value,
            display_order=sc.display_order,
        )
        for sc, c in rows
    ]
    return SalaryStructureOut(
        id=structure.id,
        name=structure.name,
        description=structure.description,
        is_active=structure.is_active,
        components=components,
    )


@router.get("/structures", response_model=list[SalaryStructureOut])
def list_salary_structures(db: DbSession, _: AdminEmployee):
    structures = db.execute(select(SalaryStructure)).scalars().all()
    return [_structure_out(db, s) for s in structures]


@router.get("/structures/{structure_id}", response_model=SalaryStructureOut)
def get_salary_structure(structure_id: int, db: DbSession, _: AdminEmployee):
    structure = db.get(SalaryStructure, structure_id)
    if structure is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary structure not found")
    return _structure_out(db, structure)


@router.post("/structures", response_model=SalaryStructureOut, status_code=status.HTTP_201_CREATED)
def create_salary_structure(payload: SalaryStructureCreate, db: DbSession, _: AdminEmployee):
    if db.execute(select(SalaryStructure).where(SalaryStructure.name == payload.name)).scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Structure name already in use")
    structure = SalaryStructure(**payload.model_dump())
    db.add(structure)
    db.commit()
    db.refresh(structure)
    return _structure_out(db, structure)


@router.patch("/structures/{structure_id}", response_model=SalaryStructureOut)
def update_salary_structure(structure_id: int, payload: SalaryStructureUpdate, db: DbSession, _: AdminEmployee):
    structure = db.get(SalaryStructure, structure_id)
    if structure is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary structure not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(structure, field, value)
    db.commit()
    db.refresh(structure)
    return _structure_out(db, structure)


@router.post("/structures/{structure_id}/components", response_model=SalaryStructureOut, status_code=status.HTTP_201_CREATED)
def add_structure_component(structure_id: int, payload: SalaryStructureComponentCreate, db: DbSession, _: AdminEmployee):
    structure = db.get(SalaryStructure, structure_id)
    if structure is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary structure not found")
    component = db.get(SalaryComponent, payload.salary_component_id)
    if component is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary component not found")
    if not component.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add an inactive component to a structure")
    if db.execute(
        select(SalaryStructureComponent).where(
            SalaryStructureComponent.salary_structure_id == structure_id,
            SalaryStructureComponent.salary_component_id == payload.salary_component_id,
        )
    ).scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Component already added to this structure")

    link = SalaryStructureComponent(salary_structure_id=structure_id, **payload.model_dump())
    db.add(link)
    db.commit()
    return _structure_out(db, structure)


# ---------- Employee assignment ----------


@router.get("/assignments", response_model=list[EmployeeSalaryAssignmentSummaryOut])
def list_active_assignments(db: DbSession, _: AdminEmployee):
    rows = db.execute(
        select(EmployeeSalaryAssignment, Employee, SalaryStructure)
        .join(Employee, EmployeeSalaryAssignment.employee_id == Employee.id)
        .join(SalaryStructure, EmployeeSalaryAssignment.salary_structure_id == SalaryStructure.id)
        .where(EmployeeSalaryAssignment.is_active.is_(True))
        .order_by(Employee.full_name)
    ).all()
    return [
        EmployeeSalaryAssignmentSummaryOut(
            employee_id=employee.id,
            employee_name=employee.full_name,
            employee_code=employee.employee_code,
            salary_structure_id=structure.id,
            salary_structure_name=structure.name,
            annual_ctc=float(assignment.annual_ctc),
            effective_from=assignment.effective_from,
        )
        for assignment, employee, structure in rows
    ]


@router.get("/employees/{employee_id}/assignment", response_model=EmployeeSalaryAssignmentOut | None)
def get_employee_assignment(employee_id: int, db: DbSession, _: AdminEmployee):
    if db.get(Employee, employee_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    assignment = db.execute(
        select(EmployeeSalaryAssignment).where(
            EmployeeSalaryAssignment.employee_id == employee_id,
            EmployeeSalaryAssignment.is_active.is_(True),
        )
    ).scalars().first()
    if assignment is None:
        return None
    return _assignment_out(db, assignment)


def _assignment_out(db: DbSession, assignment: EmployeeSalaryAssignment) -> EmployeeSalaryAssignmentOut:
    structure = db.get(SalaryStructure, assignment.salary_structure_id)
    values = get_resolved_component_values(db, assignment.id)
    components_by_id = {c.id: c for c in db.execute(select(SalaryComponent)).scalars().all()}
    component_values = [
        ResolvedComponentValueOut(
            salary_component_id=v.salary_component_id,
            component_code=components_by_id[v.salary_component_id].code,
            component_name=components_by_id[v.salary_component_id].name,
            component_type=components_by_id[v.salary_component_id].component_type,
            resolved_value=float(v.resolved_value),
        )
        for v in values
        if v.salary_component_id in components_by_id
    ]
    return EmployeeSalaryAssignmentOut(
        id=assignment.id,
        employee_id=assignment.employee_id,
        salary_structure_id=assignment.salary_structure_id,
        salary_structure_name=structure.name if structure else "",
        effective_from=assignment.effective_from,
        effective_to=assignment.effective_to,
        annual_ctc=float(assignment.annual_ctc),
        is_active=assignment.is_active,
        component_values=component_values,
    )


@router.post(
    "/employees/{employee_id}/assignment", response_model=EmployeeSalaryAssignmentOut, status_code=status.HTTP_201_CREATED
)
def assign_salary_structure(employee_id: int, payload: EmployeeSalaryAssignmentCreate, db: DbSession, _: AdminEmployee):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if db.get(SalaryStructure, payload.salary_structure_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary structure not found")
    if payload.effective_from < employee.date_of_joining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Effective date can't be before the employee's date of joining ({employee.date_of_joining}).",
        )

    existing = db.execute(
        select(EmployeeSalaryAssignment).where(
            EmployeeSalaryAssignment.employee_id == employee_id,
            EmployeeSalaryAssignment.is_active.is_(True),
        )
    ).scalars().first()
    if existing is not None:
        if payload.effective_from <= existing.effective_from:
            # Closing the existing row at payload.effective_from would set effective_to before
            # its own effective_from -- an inverted interval that get_assignment_as_of could never
            # match, silently making this new row resolve for periods that belonged to a
            # different (possibly already-paid) assignment. A true historical correction isn't
            # what this endpoint does -- it only ever supersedes going forward.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Effective date must be after the current assignment's effective date ({existing.effective_from}).",
            )
        existing.is_active = False
        existing.effective_to = payload.effective_from

    assignment = EmployeeSalaryAssignment(employee_id=employee_id, **payload.model_dump())
    db.add(assignment)
    db.flush()
    resolve_assignment_components(db, assignment)
    db.commit()
    db.refresh(assignment)
    return _assignment_out(db, assignment)
