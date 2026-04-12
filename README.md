# Polyglot Microservices Library Management System

![Dev/Prod Readiness](https://img.shields.io/badge/Status-Dev%2FProd_Ready-success)
![Environment](https://img.shields.io/badge/Environment-Agnostic-blue)

A production-ready, highly scalable library management system engineered with a polyglot microservice architecture. It features asymmetric JWT-based authentication, an externalized and environment-agnostic configuration system, and asynchronous task management.

## 📚 Documentation
- [⚙️ Architecture & Design](./docs/architecture.md)
- [🔒 Security Considerations](./docs/security.md)
- [💻 Installation Guide](./docs/installation.md)

## 🏗 Architecture

```mermaid
graph TD
    User([User Context - Web/Mobile]) --> Nginx[Nginx Reverse Proxy]
    
    subgraph Microservices
        Nginx --> CatalogService[Catalog Service<br/>Java Spring Boot 3]
        Nginx --> LendingService[Lending Service<br/>Python Django]
        Nginx --> PaymentService[Payment Service<br/>Java Spring Boot 3]
        Nginx --> NotifyService[Notify Service<br/>Python FastAPI]
        Nginx --> AnalyticsService[Analytics Service<br/>Python FastAPI]
    end
    
    subgraph Core Infra
        Nginx --> Keycloak[Keycloak IAM]
        LendingService -- async tasks --> Celery[Celery + Redis]
        Celery --> NotifyService
    end

    subgraph Persistence Layer
        CatalogService --> PostgresDB[(PostgreSQL)]
        LendingService --> PostgresDB
        PaymentService --> PostgresDB
        Keycloak --> PostgresDB
        AnalyticsService --> DynamoDB[(AWS DynamoDB)]
        CatalogService --> S3[(AWS S3)]
    end

    PaymentService --> Stripe[Stripe API]
    NotifyService --> SMTP[SMTP Email]
```

## 🛠 Tech Stack

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=java&logoColor=white) ![Spring Boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot) ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white) 
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white) ![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) ![DynamoDB](https://img.shields.io/badge/AWS%20DynamoDB-4053D6?style=for-the-badge&logo=Amazon%20DynamoDB&logoColor=white) ![Keycloak](https://img.shields.io/badge/Keycloak-logo?style=for-the-badge&logo=keycloak&logoColor=fff&color=cyan)

## ✨ Key Features
- **Asymmetric JWT Authentication**: Secure identity distribution via Keycloak utilizing RS256 signatures and strict realm validation.
- **Asynchronous Penalty Processing**: Real-time evaluation of book overdues leveraging Django, Celery, and Redis for distributed background processing.
- **Polyglot Persistence**: Separation of heavily transactional state into unified PostgreSQL, whilst channeling high-throughput write-heavy log interactions into AWS DynamoDB.

## 📸 Application Preview

### 💻 Web Interface (Librarians & Admins)
**Admin Control Center** ![Admin Panel](./docs/images/admin_web_panel.png)

**Librarian Management Dashboard** ![Librarian Panel](./docs/images/librarian_panel.png)

### 📱 Mobile Experience (Readers)
**Book Discovery & Lending** ![Mobile Lending](./docs/images/mobile_lending.jpeg)

**Integrated Stripe Payments** ![Mobile Payment](./docs/images/mobile_payment.jpeg)

## 🚀 Technical Challenges & Solutions

**Challenge 1: Cross-device JWT Validation (Local IP vs Localhost)**
- **Context:** When developing mobile apps against a local stack, authentication issuer strings (`iss`) differed dynamically—mobile bridged through `192.168.x.x` while web resolved `localhost`. This led to token validation failures for the mobile client.
- **Solution:** Engineered a Custom Flexible Issuer Validator across Spring Boot and Python contexts. The logic safely validates only the strict realm suffix structure, while enforcing mathematically rigorous RSA signature verification directly using our internal Keycloak JWKS endpoints.

**Challenge 2: Environment Portability**
- **Context:** Legacy references and rigid configurations were causing massive friction between dev, staging, and prod deployment cycles.
- **Solution:** Extracted 100% of hardcoded URLs into an environment dictionary (`.env`) leveraging Docker Compose interpolation. This yielded an isolated application state resilient to physical host shifting.