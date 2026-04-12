# Installation & Setup Guide

## 1. Prerequisites

- Docker and Docker Compose
- Node.js & npm (for local frontend development)
- Java 17 / Python 3.10+ (if developing without containers)
- Expo CLI (for mobile app development)

## 2. Clone the Repository

```bash
git clone https://github.com/NikodemMlynski/LibraryApp.git
cd LibraryApp
```

## 3. Environment Configuration (Infrastructure Backend)

Create a `.env` file referencing the `.env.example` structure inside the `infrastructure` directory.

### `.env.example`

```env
# ======== GLOBAL URL ROUTES ========
KEYCLOAK_URL=http://localhost/auth
NOTIFY_SERVICE_URL=http://notify-service:8000
CATALOG_SERVICE_URL=http://catalog-service:8081
PAYMENT_SERVICE_URL=http://payment-service:8082
KEYCLOAK_INTERNAL_URL=http://keycloak:8080/auth
ANALYTICS_SERVICE_URL=http://analytics-service:8000
API_URL=http://localhost/api
FRONTEND_API_URL=http://localhost/api

# ======== AWS ========
NOTIFY_DB_URL=
CATALOG_DB_URL=
CATALOG_DB_USER=
CATALOG_DB_PASSWORD=

LENDING_DB_URL=
LENDING_DB_USER=
LENDING_DB_PASSWORD=
LENDING_DB_PORT=

AWS_REGION=
AWS_BUCKET_NAME=
AWS_ACCESS_KEY=
AWS_SECRET_KEY=

DB_URL=
DB_USERNAME=
DB_PASSWORD=

ANALYTICS_SERVICE_ACCESS_KEY=
ANALYTICS_SERVICE_SECRET_ACCESS_KEY=
DYNAMODB_TABLE_NAME=


=============== KEYCLOAK ===============

KEYCLOAK_ADMIN_USER=
KEYCLOAK_ADMIN_PASSWORD=
KEYCLOAK_DB_URL=
KEYCLOAK_DB_USER=
KEYCLOAK_DB_PASSWORD=

========== MAIL ==========

MAIL_USERNAME=
MAIL_FROM=
MAIL_SERVER=
MAIL_PORT=
MAIL_PASSWORD=
MAIL_STARTTLS=False
MAIL_SSL_TLS=True


================ STRIPE =================

STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=


STRIPE_WEBHOOK_SECRET=

```

## 4. Spin Up the Stack

Initialize all polyglot services securely behind the Nginx proxy by running:

```bash
cd infrastructure
docker-compose up -d --build
```

> **Note**: Verify all core services report healthy statuses using `docker-compose ps` or `docker stats`.

## 5. Web Dashboard Setup (`library-web`)

### Environment Configuration

Navigate to the `frontend/library-web` directory and create a corresponding `.env` file:

```env
VITE_API_URL=http://localhost/api
VITE_KEYCLOAK_URL=http://localhost/auth
VITE_STRIPE_PUBLIC_KEY=
```

### Installation and Running

```bash
cd frontend/library-web
npm install
npm run dev
```

## 6. Mobile Application Setup (`library-mobile`)

The mobile application is built with React Native and Expo.

### Environment Configuration

Navigate to the `library-mobile` directory and create a specific `.env` file.
**Important**: When running on a physical device or emulator, `localhost` will not resolve to your computer's services. You MUST use your machine's local assigned network IP address (e.g., `192.168.1.50`).

```env
IP_ADDRESS=[IP_ADDRESS]
EXPO_PUBLIC_API_URL=http://[IP_ADDRESS]/api
EXPO_PUBLIC_KEYCLOAK_URL=http://[IP_ADDRESS]/auth/realms/library-system


# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_STRIPE_SECRET_KEY=
EXPO_STRIPE_WEBHOOK_SECRET=

```

### Installation and Running

1. Set up dependencies:

```bash
cd library-mobile
npm install
```

2. Start the Expo development server:

```bash
npx expo start
```

3. Once running, you can scan the generated QR code from your terminal using the **Expo Go** application on your physical Android device, or open the native iOS camera app to launch the experience natively. Alternatively, press `a` or `i` in the terminal to launch the Android Emulator or iOS Simulator respectively.
