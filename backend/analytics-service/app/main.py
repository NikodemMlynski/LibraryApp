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

# --- JWT VERIFICATION CONFIGURATION ---
# Zewnętrzny URL - tego używamy do weryfikacji pola 'iss' (issuer) w tokenie
KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://localhost:8080/auth").rstrip('/')
EXPECTED_ISSUER = f"{KEYCLOAK_URL}/realms/library-system"

# Wewnętrzny URL - tego używamy TYLKO do pobrania kluczy publicznych po sieci Dockera
KEYCLOAK_INTERNAL_URL = os.environ.get("KEYCLOAK_INTERNAL_URL", "http://keycloak:8080/auth").rstrip('/')
KEYCLOAK_CERTS_URL = f"{KEYCLOAK_INTERNAL_URL}/realms/library-system/protocol/openid-connect/certs"

# Prosty cache na klucze publiczne, żeby nie odpytywać Keycloaka przy każdym zapytaniu
JWKS_CACHE = {}

def get_jwks():
    global JWKS_CACHE
    if not JWKS_CACHE:
        try:
            response = requests.get(KEYCLOAK_CERTS_URL, timeout=5)
            response.raise_for_status()
            JWKS_CACHE = response.json()
        except Exception as e:
            print(f"Error fetching Keycloak certs: {e}")
            return None
    return JWKS_CACHE

def verify_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing Authorization header")
    
    token = authorization.split(" ")[1]
    
    try:
        # Wyciągamy nagłówek tokenu (nie weryfikując go jeszcze), żeby znaleźć 'kid' (Key ID)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header: missing kid")
        
        jwks = get_jwks()
        if not jwks:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to fetch public keys from IdP")
        
        # Szukamy klucza publicznego, który pasuje do podpisu w tokenie
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break
        
        if not rsa_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Public key not found. Token signed by unknown source.")
        
        # OSTATECZNA WERYFIKACJA KRYPTOGRAFICZNA
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            issuer=EXPECTED_ISSUER,
            options={"verify_aud": False} 
        )
        return payload

    except jwt.ExpiredSignatureError as e:
        print(f"DEBUG AUTH: Token expired - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.JWTClaimsError as e:
        print(f"DEBUG AUTH: Claims mismatch - {e}")
        print(f"DEBUG AUTH: Expected Issuer: {EXPECTED_ISSUER}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Incorrect claims: {e}")
    except JWTError as e:
        print(f"DEBUG AUTH: JWT Verification failed - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token signature: {e}")
    except Exception as e:
        print(f"DEBUG AUTH: Unknown auth error - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {e}")


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