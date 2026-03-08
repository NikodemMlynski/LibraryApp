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
        
        # Adres, pod którym Keycloak trzyma klucze publiczne do weryfikacji tokenów
        jwks_url = "http://keycloak:8080/auth/realms/library-system/protocol/openid-connect/certs"
        jwk_client = PyJWKClient(jwks_url)
        
        try:
            # Pobieramy klucz publiczny pasujący do tego konkretnego tokena
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            
            # Dekodujemy token! 
            # Wyłączamy sprawdzanie 'iss' (issuera), bo React dostaje token z "http://localhost", 
            # a Django siedzi w Dockerze i widzi "http://keycloak:8080", co powodowałoby fałszywy błąd.
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"verify_aud": False, "verify_iss": False}
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