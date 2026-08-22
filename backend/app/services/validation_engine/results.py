from dataclasses import dataclass, field
from decimal import Decimal

from app.enums import CheckOutcome
from app.schemas.leave import SessionInput


@dataclass
class CheckResult:
    check_name: str
    outcome: CheckOutcome
    reason_code: str | None = None
    message: str | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class ValidationDecision:
    outcome: CheckOutcome
    results: list[CheckResult]
    is_lop: bool
    total_deducted_days: Decimal
    sandwich_days_added: Decimal
    policy_version_id: int
    working_sessions: list[SessionInput] = field(default_factory=list)
    requires_hr_admin_approval: bool = False

    @property
    def violations(self) -> list[CheckResult]:
        return [r for r in self.results if r.outcome != CheckOutcome.PASS]
