import requests
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
from .models import Loan
from .serializers import LoanSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.models import User
CATALOG_SERVICE_URL = "http://catalog-service:8081/api/catalog/books"
class BorrowBookView(APIView):
    permission_classes = [IsAuthenticated]        

    def post(self, request):
        book_id = request.data.get('book_id')
        user_id = request.user.username 
        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}

        try:
            response = requests.get(f"{CATALOG_SERVICE_URL}/{book_id}", headers=headers)
            if response.status_code != 200:
                return Response({"error": "Książka nie istnieje"}, status=status.HTTP_404_NOT_FOUND)
            
            book_data = response.json()
            if book_data.get('availableCopies', 0) <= 0:
                return Response({"error": "Brak wolnych egzemplarzy"}, status=status.HTTP_400_BAD_REQUEST)

        except requests.exceptions.RequestException:
            return Response({"error": "Błąd komunikacji z Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        loan = Loan.objects.create(
            user_id=user_id,
            book_id=book_id
        )

        book_data['availableCopies'] -= 1
        requests.put(f"{CATALOG_SERVICE_URL}/{book_id}", data=book_data, headers=headers)

        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)

class ReturnBookView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, loan_id):
        user_id = request.user.username
        
        # 1. Znajdujemy aktywne wypożyczenie upewniając się, że należy do osoby wysyłającej zapytanie!
        try:
            loan = Loan.objects.get(id=loan_id, status='ACTIVE', user_id=user_id)
        except Loan.DoesNotExist:
            return Response({"error": "Nie znaleziono aktywnego wypożyczenia dla tego użytkownika"}, status=status.HTTP_404_NOT_FOUND)

        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}

        # 2. Pytamy Javę o aktualny stan książki
        try:
            response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
            if response.status_code != 200:
                return Response({"error": "Książka nie istnieje w Catalog Service"}, status=status.HTTP_404_NOT_FOUND)
            
            book_data = response.json()
            
            # Zwiększamy liczbę dostępnych sztuk o 1 (bo książka wraca na półkę)
            book_data['availableCopies'] += 1
            
            # Wysyłamy aktualizację do Javy
            update_response = requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
            
            if update_response.status_code != 200:
                return Response({"error": "Nie udało się zaktualizować liczby książek w katalogu"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except requests.exceptions.RequestException:
            return Response({"error": "Błąd komunikacji z Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # 3. Jeśli udało się zaktualizować Javę, kończymy wypożyczenie u nas (w Django)
        loan.status = 'RETURNED'
        loan.return_date = now()
        loan.save()
        
        return Response({"message": "Książka zwrócona pomyślnie"}, status=status.HTTP_200_OK)
class UserLoansView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user_id = request.user.username
        loans = Loan.objects.filter(user_id=user_id)
        serializer = LoanSerializer(loans, many=True)
        return Response(serializer.data)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class LibrarianLoanListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_param = request.query_params.get('status', 'ALL')
        loans = Loan.objects.all().order_by('-borrow_date')
        
        if status_param and status_param != 'ALL':
            loans = loans.filter(status=status_param)
            
        paginator = StandardResultsSetPagination()
        paginated_loans = paginator.paginate_queryset(loans, request)
        serializer = LoanSerializer(paginated_loans, many=True)
        return paginator.get_paginated_response(serializer.data)

class LibrarianCreateLoanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('user_id')
        book_id = request.data.get('book_id')
        due_date = request.data.get('due_date')

        if not user_id or not book_id:
            return Response({"error": "user_id and book_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}

        try:
            response = requests.get(f"{CATALOG_SERVICE_URL}/{book_id}", headers=headers)
            if response.status_code != 200:
                return Response({"error": "Book does not exist in Catalog Service"}, status=status.HTTP_404_NOT_FOUND)
            
            book_data = response.json()
            if book_data.get('availableCopies', 0) <= 0:
                return Response({"error": "No available copies"}, status=status.HTTP_400_BAD_REQUEST)

        except requests.exceptions.RequestException:
            return Response({"error": "Error communicating with Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        loan = Loan.objects.create(
            user_id=user_id,
            book_id=book_id
        )
        if due_date:
            loan.due_date = due_date
            loan.save()

        book_data['availableCopies'] -= 1
        requests.put(f"{CATALOG_SERVICE_URL}/{book_id}", data=book_data, headers=headers)

        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)

class LibrarianUpdateLoanView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, loan_id):
        try:
            loan = Loan.objects.get(id=loan_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)
            
        action = request.data.get('action') 
        
        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}
        
        if action == 'return' and loan.status != 'RETURNED':
            try:
                response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
                if response.status_code == 200:
                    book_data = response.json()
                    book_data['availableCopies'] += 1
                    requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
            except requests.exceptions.RequestException:
                return Response({"error": "Error communicating with Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            loan.status = 'RETURNED'
            loan.return_date = now()
            loan.save()
            return Response(LoanSerializer(loan).data)
            
        new_status = request.data.get('status')
        new_due_date = request.data.get('due_date')
        
        if new_status:
            loan.status = new_status
        if new_due_date:
            loan.due_date = new_due_date
            
        loan.save()
        return Response(LoanSerializer(loan).data)

class LibrarianUserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # 1. Pobierz token admina z Keycloaka
        admin_user = os.environ.get('KEYCLOAK_ADMIN_USER', 'admin')
        admin_password = os.environ.get('KEYCLOAK_ADMIN_PASSWORD', 'twoje_tajne_haslo')
        keycloak_url = "http://keycloak:8080"
        
        token_url = f"{keycloak_url}/auth/realms/master/protocol/openid-connect/token"
        token_data = {
            'client_id': 'admin-cli',
            'username': admin_user,
            'password': admin_password,
            'grant_type': 'password'
        }
        
        try:
            token_res = requests.post(token_url, data=token_data)
            if token_res.status_code != 200:
                return Response({"error": "Failed to authenticate with Keycloak"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            access_token = token_res.json().get('access_token')
            
            # 2. Pobierz uzytkownikow o roli 'reader' dla realmu 'library-system'
            users_url = f"{keycloak_url}/auth/admin/realms/library-system/roles/reader/users"
            headers = {'Authorization': f'Bearer {access_token}'}
            
            users_res = requests.get(users_url, headers=headers)
            if users_res.status_code != 200:
                return Response({"error": "Failed to fetch users from Keycloak"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            keycloak_users = users_res.json()
            
            # 3. Zmapuj dane tak, abysmy zwrocili id oraz username (preferred_username) dla kazdego z nich
            users_list = []
            for u in keycloak_users:
                users_list.append({
                    'id': u.get('id'),
                    'username': u.get('username')
                })
                
            return Response(users_list)
            
        except requests.exceptions.RequestException as e:
            return Response({"error": f"Error communicating with Keycloak: {str(e)}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)