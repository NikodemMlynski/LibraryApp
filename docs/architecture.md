# Architecture Deep Dive

## Service Discovery
Microservice resolution and internal communication are heavily streamlined through **Docker internal DNS**.
- No reliance on brittle static IP addressing.
- Each service seamlessly identifies siblings via their canonical `docker-compose` container names (e.g., `http://catalog-service:8081` or `http://notify-service:8000`).
- The entire network sits safely behind our Nginx reverse proxy, protecting backend ports.

## Polyglot Persistence Strategy
Our persistence tier leverages specialized databases to optimally service discrete patterns of read/write workflows:
- **PostgreSQL**: Used for all core transactional boundaries (`catalog_db`, `lending_db`, `payment_db`, `notify_db`, `keycloak_db`). Highly normalized storage ensures ACID compliance for users, loans, stock inventory, and finances.
- **AWS DynamoDB (Audit Logs)**: Employed explicitly by the `analytics-service` as an immutable append-only event source. Real-time system behavior relies heavily on its schema-less scale to absorb high-velocity read/write logs.

## Reverse Proxy (Nginx)
Nginx operates as an API Gateway and single point of entry for the system interface.
- **API Unification**: Combines discrete paths into cohesive facades. (e.g., `/api/lending/` maps internally to Django, `/api/payments/` triggers Spring Boot).
- **CORS Management**: Normalizes headers (`X-Real-IP`, `X-Forwarded-For`), stripping complexity away from backend processors.
- **WebSocket Handovers**: Empowers dynamic frontend compilation strategies (Vite Hot Reloads via `Upgrade $http_upgrade`).
