import enum


class EmploymentStatus(str, enum.Enum):
    PROBATION = "PROBATION"
    ACTIVE = "ACTIVE"
    NOTICE_PERIOD = "NOTICE_PERIOD"
    TERMINATED = "TERMINATED"


class EmployeeRole(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    HR_ADMIN = "HR_ADMIN"


class AccrualMode(str, enum.Enum):
    UPFRONT = "UPFRONT"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"


class RecalculationMode(str, enum.Enum):
    PROSPECTIVE_ONLY = "PROSPECTIVE_ONLY"
    RETROSPECTIVE_RECALC = "RETROSPECTIVE_RECALC"


class YearEndBehavior(str, enum.Enum):
    LAPSE_ALL = "LAPSE_ALL"
    CARRY_FORWARD_CAPPED = "CARRY_FORWARD_CAPPED"
    CARRY_FORWARD_ALL = "CARRY_FORWARD_ALL"


class ZeroBalanceAction(str, enum.Enum):
    BLOCK = "BLOCK"
    CONVERT_TO_LOP = "CONVERT_TO_LOP"


class RestrictionAdjacency(str, enum.Enum):
    IMMEDIATELY_BEFORE = "IMMEDIATELY_BEFORE"
    IMMEDIATELY_AFTER = "IMMEDIATELY_AFTER"
    SAME_DAY = "SAME_DAY"


class HolidayType(str, enum.Enum):
    STATUTORY = "STATUTORY"
    OPTIONAL = "OPTIONAL"


class RequestKind(str, enum.Enum):
    LEAVE = "LEAVE"
    WFH = "WFH"
    OD = "OD"


class DayRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class SessionType(str, enum.Enum):
    FIRST_HALF = "FIRST_HALF"
    SECOND_HALF = "SECOND_HALF"
    FULL_DAY = "FULL_DAY"


class ResolutionType(str, enum.Enum):
    APPROVED = "APPROVED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    BLOCKED = "BLOCKED"
    LOP_CONVERTED = "LOP_CONVERTED"


class ApprovalActionType(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ESCALATED = "ESCALATED"


class CheckOutcome(str, enum.Enum):
    PASS = "PASS"
    BLOCK = "BLOCK"
    CONVERT_TO_LOP = "CONVERT_TO_LOP"


class FileVisibility(str, enum.Enum):
    PRIVATE = "PRIVATE"
    EMPLOYEE = "EMPLOYEE"
    ORGANIZATION = "ORGANIZATION"
