# Security Architecture

## OIDC Integration
Centralized identity management is handled natively by **Keycloak**, delivering a battle-tested OpenID Connect (OIDC) implementation. The full system leans upon short-lived JWT workflows injected via the `/auth/` edge context.

## Flexible Issuer Validation (The `localhost` / `192.168.x.x` Conflict)
> **Insight**: Developing dual-interface (Web/Mobile) systems locally poses an architectural risk regarding JWT "iss" validation since endpoints address the authority differently based on host physics.

We addressed this challenge via:
- Ignoring strict host validations of the authority hostname.
- Matching only the **realm suffix**.
- Enforcing zero-trust rules strictly at the cryptographic tier: Relying fully on Keycloak's `.well-known/openid-configuration` explicitly mapped inside Docker DNS (`http://keycloak:8080`). Provided the asymmetric block solves the RS256 puzzle, we prove provenance entirely independent of network framing.

## Role-Based Access Control (RBAC)
Authorizations traverse languages securely mapping claims directly from Keycloak down to service implementations:
- **Java (Spring Boot)**: JWT decoders unwrap `.realm_access.roles` injecting natively into `GrantedAuthority` abstractions.
- **Python (FastAPI & Django)**: Leveraging custom middlewares verifying `Roles` lists. We restrict write behaviors explicitly to **Librarian** roles while segmenting **Administrator** overlays.
