import jwt
from jwt import PyJWKClient
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User

class KeycloakJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        
        # Jeśli nie ma nagłówka Authorization lub nie zaczyna się od Bearer, odrzucamy
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        import os
        
        # Odbieramy adresy z .env
        internal_url = os.environ.get('KEYCLOAK_INTERNAL_URL', 'http://keycloak:8080/auth').rstrip('/')
        external_url = os.environ.get('KEYCLOAK_URL', 'http://localhost:8080/auth').rstrip('/')
        
        # Oczekujemy tokenów z frontendu (web) oraz od aplikacji mobilnej
        # Web używa http://localhost/auth (bez portu 8080) a mobilka może używać 8080.
        acceptable_issuers = [
            f"{external_url}/realms/library-system",
            f"{external_url.replace(':8080', '')}/realms/library-system"
        ]
        
        # Adres, pod którym Keycloak trzyma klucze publiczne do weryfikacji tokenów (używamy wewnętrznego)
        jwks_url = f"{internal_url}/realms/library-system/protocol/openid-connect/certs"
        jwk_client = PyJWKClient(jwks_url)
        
        try:
            # Pobieramy klucz publiczny pasujący do tego konkretnego tokena
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            
            # Dekodujemy token! 
            # Weryfikujemy 'iss' używając zewnętrznego adresu Keycloak (z którego frontend dostał token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=acceptable_issuers,
                options={"verify_aud": False, "verify_iss": True}
            )
        except Exception as e:
            raise AuthenticationFailed(f"Nieprawidłowy lub wygasły token: {str(e)}")
        
        # Sukces! Wyciągamy czytelną nazwę użytkownika (pole 'preferred_username')
        keycloak_username = payload.get('preferred_username')
        if not keycloak_username:
            raise AuthenticationFailed("Brak preferred_username w tokenie")
        
        # Tworzymy lokalnego usera w Django w locie, żeby framework był "szczęśliwy"
        user, created = User.objects.get_or_create(username=keycloak_username)
        
        email = payload.get('email')
        if email and user.email != email:
            user.email = email
            user.save(update_fields=['email'])

        
        # Zwracamy tuple: (użytkownik, token) - tego wymaga Django REST Framework
        return (user, token)