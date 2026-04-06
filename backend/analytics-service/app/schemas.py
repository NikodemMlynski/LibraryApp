from pydantic import BaseModel
from enum import Enum
from typing import Dict, Any, Optional

class ActionType(str, Enum):
    LOAN_CREATED = "LOAN_CREATED"
    LOAN_RETURNED_ON_TIME = "LOAN_RETURNED_ON_TIME"
    LOAN_RETURNED_LATE = "LOAN_RETURNED_LATE"
    LOAN_OVERDUE_MARKED = "LOAN_OVERDUE_MARKED"
    BOOK_ADDED = "BOOK_ADDED"
    BOOK_LOST_OR_DAMAGED = "BOOK_LOST_OR_DAMAGED"
    PAYMENT_FEE_SUCCESS = "PAYMENT_FEE_SUCCESS"
    PAYMENT_PENALTY_SUCCESS = "PAYMENT_PENALTY_SUCCESS"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    LIBRARIAN_ADDED = "LIBRARIAN_ADDED"
    LIBRARIAN_DELETED = "LIBRARIAN_DELETED"
    USER_REGISTERED = "USER_REGISTERED"
    BOOK_RETURNED = "BOOK_RETURNED"
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS"

class Visibility(str, Enum):
    ADMIN = "ADMIN"
    LIBRARIAN = "LIBRARIAN"

class LogEvent(BaseModel):
    action_type: ActionType
    actor_id: str
    visibility: Visibility
    metadata: Dict[str, Any]

class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    action_type: ActionType
    actor_id: str
    visibility: Visibility
    metadata: Dict[str, Any]

class PaginatedAuditLogResponse(BaseModel):
    items: list[AuditLogResponse]
    next_skip: Optional[int] = None
    total: int
