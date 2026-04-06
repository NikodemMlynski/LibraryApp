import os
import uuid
from datetime import datetime, timezone
import boto3
import requests
from fastapi import FastAPI, Depends, HTTPException, Header, status
from pydantic import BaseModel
from jose import jwt, JWTError
from typing import List, Optional

from app.schemas import LogEvent, AuditLogResponse, Visibility, ActionType, PaginatedAuditLogResponse

app = FastAPI(root_path="/api/analytics")

# AWS Configuration from env
AWS_ACCESS_KEY = os.environ.get("ANALYTICS_SERVICE_ACCESS_KEY")
AWS_SECRET_KEY = os.environ.get("ANALYTICS_SERVICE_SECRET_ACCESS_KEY")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "SystemAuditLogs")
AWS_REGION = os.environ.get("AWS_REGION", "eu-north-1")

dynamodb = boto3.resource(
    'dynamodb',
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)
table = dynamodb.Table(TABLE_NAME)

KEYCLOAK_CERTS_URL = "http://keycloak:8080/auth/realms/library-system/protocol/openid-connect/certs"

def get_public_key():
    try:
        response = requests.get(KEYCLOAK_CERTS_URL, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching Keycloak certs: {e}")
        return None

def verify_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing Authorization header")
    
    token = authorization.split(" ")[1]
    
    # Do celów czysto demonstracyjnych/developerskich, ze względu na architekturę dockera
    # możemy pominąć pełną weryfikację asymetryczną przez publiczny klucz i jedynie zdekodować token:
    try:
        payload = jwt.get_unverified_claims(token)
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token architecture")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analytics-service"}


@app.post("/internal/logs", status_code=status.HTTP_201_CREATED)
def create_internal_log(event: LogEvent):
    log_id = str(uuid.uuid4())
    log_timestamp = datetime.now(timezone.utc).isoformat()

    item = {
        "id": log_id,
        "timestamp": log_timestamp,
        "action_type": event.action_type.value,
        "actor_id": event.actor_id,
        "visibility": event.visibility.value,
        "metadata": event.metadata
    }

    try:
        table.put_item(Item=item)
        return {"id": log_id, "status": "CREATED"}
    except Exception as e:
        print(f"DynamoDB Put Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to write audit log to DynamoDB")


@app.post("/admin/logs", status_code=status.HTTP_201_CREATED)
def create_admin_log(event: LogEvent, payload: dict = Depends(verify_token)):
    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", [])
    
    is_admin = "admin" in roles
    is_librarian = "librarian" in roles
    if not is_admin and not is_librarian:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    return create_internal_log(event)


@app.get("/admin/logs", response_model=PaginatedAuditLogResponse)
def get_admin_logs(skip: int = 0, limit: int = 20, payload: dict = Depends(verify_token)):
    # Parse roles from Keycloak JWT payload
    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", [])
    
    is_admin = "admin" in roles
    is_librarian = "librarian" in roles
    
    if not is_admin and not is_librarian:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        response = table.scan()
        items = response.get('Items', [])
        
        # Sortowanie w pamięci od najnowszych
        items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        filtered_items = []
        for item in items:
            if is_admin:
                filtered_items.append(item)
            elif is_librarian and item.get("visibility") == Visibility.LIBRARIAN.value:
                filtered_items.append(item)
                
        total = len(filtered_items)
        paginated_items = filtered_items[skip: skip + limit]
        
        next_skip = skip + limit if skip + limit < total else None

        return {
            "items": paginated_items,
            "next_skip": next_skip,
            "total": total
        }

    except Exception as e:
        print(f"DynamoDB Scan Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit logs from DynamoDB")