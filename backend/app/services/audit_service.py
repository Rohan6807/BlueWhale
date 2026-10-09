from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    target_patient_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = "127.0.0.1",
) -> AuditLog:
    """
    Records an immutable audit event for compliance and security oversight.
    """
    log_entry = AuditLog(
        action=action,
        user_id=user_id,
        target_patient_id=target_patient_id,
        details_json=details or {},
        ip_address=ip_address,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
