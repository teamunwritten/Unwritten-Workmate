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


class ComponentType(str, enum.Enum):
    EARNING = "EARNING"
    DEDUCTION = "DEDUCTION"


class CalculationType(str, enum.Enum):
    FIXED = "FIXED"
    PERCENTAGE_OF_BASIC = "PERCENTAGE_OF_BASIC"
    # Percentage of the employee's own annual_ctc (monthly_ctc = annual_ctc / 12) -- this is what
    # actually ties an assignment's CTC to the resolved paycheck; a structure built entirely out
    # of FIXED components never uses the CTC an admin enters at assignment time at all.
    PERCENTAGE_OF_CTC = "PERCENTAGE_OF_CTC"
    FORMULA = "FORMULA"


class PayrollRunStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"


class PayrollRunEntryStatus(str, enum.Enum):
    PENDING = "PENDING"
    INCLUDED = "INCLUDED"
    EXCLUDED = "EXCLUDED"


class PayslipStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"


class PayslipDesign(str, enum.Enum):
    CLASSIC = "CLASSIC"
    MODERN = "MODERN"
    MINIMAL = "MINIMAL"
    FORMAL = "FORMAL"
    COMPACT = "COMPACT"
    BOLD = "BOLD"
    ELEGANT = "ELEGANT"
    FINTECH = "FINTECH"
    SPLIT = "SPLIT"
    TABULAR = "TABULAR"
    EXECUTIVE = "EXECUTIVE"
