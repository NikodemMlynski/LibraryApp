# Installation & Setup Guide

## 1. Prerequisites
- Docker and Docker Compose
- Node.js & npm (for local frontend development)
- Java 17 / Python 3.10+ (if developing without containers)

## 2. Clone the Repository
```bash
git clone https://github.com/NikodemMlynski/LibraryApp.git
cd LibraryApp
```

## 3. Environment Configuration
Create a `.env` file referencing the `.env.example` structure inside the `infrastructure` directory. 

### `.env.example`
```env
# ======== GLOBAL URL ROUTES ========
KEYCLOAK_URL=http://localhost/auth
KEYCLOAK_INTERNAL_URL=http://keycloak:8080/auth
API_URL=http://localhost/api
FRONTEND_API_URL=http://localhost/api

# ======== INTERNAL SERVICE URLS ========
NOTIFY_SERVICE_URL=http://notify-service:8000
CATALOG_SERVICE_URL=http://catalog-service:8081
PAYMENT_SERVICE_URL=http://payment-service:8082
ANALYTICS_SERVICE_URL=http://analytics-service:8000

# ======== DATABASE: POSTGRES ========
CATALOG_DB_URL=jdbc:postgresql://<your_rds>:5432/catalog_db
CATALOG_DB_USER=postgres
CATALOG_DB_PASSWORD=your_password

LENDING_DB_URL=<your_rds>
LENDING_DB_USER=postgres
LENDING_DB_PASSWORD=your_password
LENDING_DB_PORT=5432

DB_URL=jdbc:postgresql://<your_rds>:5432/payment_db
DB_USERNAME=postgres
DB_PASSWORD=your_password

KEYCLOAK_DB_URL=jdbc:postgresql://<your_rds>:5432/keycloak_db
KEYCLOAK_DB_USER=postgres
KEYCLOAK_DB_PASSWORD=your_password

NOTIFY_DB_URL=postgresql://postgres:your_password@<your_rds>:5432/notify_db

# ======== CLOUD: AWS (S3 & DynamoDB) ========
AWS_REGION=eu-north-1
AWS_BUCKET_NAME=your_bucket_name
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key

ANALYTICS_SERVICE_ACCESS_KEY=your_aws_access_key
ANALYTICS_SERVICE_SECRET_ACCESS_KEY=your_aws_secret_key
DYNAMODB_TABLE_NAME=SystemAuditLogs

# ======== IAM: KEYCLOAK ========
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# ======== EXTERNAL: SMTP MAIL ========
MAIL_USERNAME=your_email@gmail.com
MAIL_FROM=your_email@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=465
MAIL_PASSWORD=your_app_password
MAIL_STARTTLS=False
MAIL_SSL_TLS=True

# ======== EXTERNAL: STRIPE API ========
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 4. Spin Up the Stack
Initialize all polyglot services securely behind the Nginx proxy by running:
```bash
cd infrastructure
docker-compose up -d --build
```

> **Note**: Verify all core services report healthy statuses using `docker-compose ps` or `docker stats`.
