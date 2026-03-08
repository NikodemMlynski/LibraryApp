from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from fastapi_mail import MessageSchema, MessageType

from .database import engine, Base, get_db, SessionLocal
from .models import NotificationLog
from .schemas import NotificationRequest
from .mailer import fm

Base.metadata.create_all(bind=engine)

app = FastAPI(root_path="/api/notify") 

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "notify-service"}

async def send_email_background(notification_id: int, request: NotificationRequest):
    db = SessionLocal()
    try:
        message = MessageSchema(
            subject=request.subject,
            recipients=[request.recipient_email],
            body=request.message_body,
            subtype=MessageType.plain
        )
        
        await fm.send_message(message)
        
        log = db.query(NotificationLog).filter(NotificationLog.id == notification_id).first()
        if log:
            log.status = "SENT"
            log.sent_at = datetime.now(timezone.utc)
            db.commit()
    except Exception as e:
        log = db.query(NotificationLog).filter(NotificationLog.id == notification_id).first()
        if log:
            log.status = "FAILED"
            log.error_message = str(e)
            db.commit()
    finally:
        db.close()

@app.post("/notifications/send")
async def send_notification(request: NotificationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    log = NotificationLog(
        user_id=request.user_id,
        recipient_email=request.recipient_email,
        subject=request.subject,
        message_body=request.message_body,
        status="PENDING"
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    background_tasks.add_task(send_email_background, log.id, request)
    
    return {"message": "Notification queued", "log_id": log.id}