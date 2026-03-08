from pydantic import BaseModel, EmailStr

class NotificationRequest(BaseModel):
    user_id: str
    recipient_email: EmailStr
    subject: str
    message_body: str
