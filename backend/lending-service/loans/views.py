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
from django.db.models import Case, When, Value, IntegerField
from .audit import send_audit_log

# --- ADRESY ZEWNĘTRZNYCH MIKROSERWISÓW ---
CATALOG_BASE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://catalog-service:8081").rstrip('/')
CATALOG_SERVICE_URL = f"{CATALOG_BASE_URL}/api/catalog/books"

PAYMENT_BASE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://payment-service:8082").rstrip('/')
PAYMENT_INTENT_URL = f"{PAYMENT_BASE_URL}/api/payments/create-intent"
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
                return Response({"error": "Book does not exist"}, status=status.HTTP_404_NOT_FOUND)
            
            book_data = response.json()
            if book_data.get('availableCopies', 0) <= 0:
                return Response({"error": "No available copies"}, status=status.HTTP_400_BAD_REQUEST)

        except requests.exceptions.RequestException:
            return Response({"error": "Error communicating with Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        loan = Loan.objects.create(
            user_id=user_id,
            book_id=book_id
        )

        book_data['availableCopies'] -= 1
        requests.put(f"{CATALOG_SERVICE_URL}/{book_id}", data=book_data, headers=headers)

        # --- ZMIANA TUTAJ: Przygotowanie pełnego payloadu dla Payment Service ---
        book_title = book_data.get('title', f"Book #{book_id}")
        payment_payload = {
            "loanId": loan.id,
            "amount": 2.00,
            "userName": user_id,
            "bookTitle": book_title
        }

        client_secret = None
        try:
            # Używamy payment_payload zamiast twardo wpisanego słownika
            payment_res = requests.post(PAYMENT_INTENT_URL, json=payment_payload, headers=headers, timeout=5)
            if payment_res.status_code == 200:
                if 'application/json' in payment_res.headers.get('Content-Type', ''):
                    client_secret = payment_res.json().get('clientSecret')
                else:
                    client_secret = payment_res.text
        except Exception as e:
            print("Payment service error:", e)

        data = LoanSerializer(loan).data
        data['clientSecret'] = client_secret
        
        send_audit_log(
            action_type="LOAN_CREATED", 
            actor_id=str(user_id), 
            visibility="PUBLIC", 
            metadata={"loan_id": loan.id, "book_id": book_id, "message": f"Created loan for {user_id}"}
        )
        
        return Response(data, status=status.HTTP_201_CREATED)
class ReturnBookView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, loan_id):
        user_id = request.user.username
        
        # 1. Znajdujemy wypożyczenie upewniając się, że należy do osoby wysyłającej zapytanie!
        try:
            loan = Loan.objects.get(id=loan_id, user_id=user_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found for this user"}, status=status.HTTP_404_NOT_FOUND)
            
        if loan.status == 'PENDING_PAYMENT':
            return Response({"error": "Cannot return an unpaid loan. Please complete the payment first."}, status=status.HTTP_400_BAD_REQUEST)
            
        if loan.status not in ['ACTIVE', 'OVERDUE']:
            return Response({"error": f"Cannot return book with status {loan.status}"}, status=status.HTTP_400_BAD_REQUEST)

        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}

        if loan.status in ['ACTIVE', 'OVERDUE'] and now() > loan.due_date:
            days_overdue = (now() - loan.due_date).days
            if days_overdue > 0:
                loan.penalty_amount = 2.00 + (days_overdue * 0.50)
                loan.status = 'OVERDUE'
                loan.save()

        if loan.penalty_amount > 0:
            return Response({"error": "Payment Required", "requires_payment": True}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 2. Pytamy Javę o aktualny stan książki
        try:
            response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
            if response.status_code != 200:
                return Response({"error": "Book does not exist in Catalog Service"}, status=status.HTTP_404_NOT_FOUND)
            
            book_data = response.json()
            
            # Zwiększamy liczbę dostępnych sztuk o 1 (bo książka wraca na półkę)
            book_data['availableCopies'] += 1
            
            # Wysyłamy aktualizację do Javy
            update_response = requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
            
            if update_response.status_code != 200:
                return Response({"error": "Failed to update book count in catalog"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except requests.exceptions.RequestException:
            return Response({"error": "Error communicating with Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # 3. Jeśli udało się zaktualizować Javę, kończymy wypożyczenie u nas (w Django)
        loan.return_date = now()
        
        is_late = loan.return_date > loan.due_date
        action_type = "LOAN_RETURNED_LATE" if is_late else "LOAN_RETURNED_ON_TIME"
        
        loan.status = 'RETURNED'
        loan.save()
        
        send_audit_log(
            action_type=action_type, 
            actor_id=str(user_id), 
            visibility="PUBLIC", 
            metadata={"loan_id": loan.id, "book_id": loan.book_id, "message": f"User {user_id} returned book ({'late' if is_late else 'on time'})"}
        )
        
        return Response({"message": "Książka zwrócona pomyślnie"}, status=status.HTTP_200_OK)
class UserLoansView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user_id = request.user.username
        status_param = request.query_params.get('status', 'ALL')
        
        loans = Loan.objects.filter(user_id=user_id)
        
        if status_param and status_param != 'ALL':
            loans = loans.filter(status=status_param).order_by('-borrow_date')
        else:
            loans = loans.annotate(
                status_order=Case(
                    When(status='OVERDUE', then=Value(1)),
                    When(status='ACTIVE', then=Value(2)),
                    When(status='PENDING_PAYMENT', then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField(),
                )
            ).order_by('status_order', '-borrow_date')
            
        paginator = StandardResultsSetPagination()
        paginated_loans = paginator.paginate_queryset(loans, request)
        serializer = LoanSerializer(paginated_loans, many=True)
        
        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}
        
        for item in serializer.data:
            book_id = item['book_id']
            try:
                res = requests.get(f"{CATALOG_SERVICE_URL}/{book_id}", headers=headers, timeout=2)
                if res.status_code == 200:
                    item['book_title'] = res.json().get('title', f'Book {book_id}')
                else:
                    item['book_title'] = f'Book {book_id}'
            except:
                item['book_title'] = f'Book {book_id}'
                
        return paginator.get_paginated_response(serializer.data)


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

        # --- ZMIANA TUTAJ: Przygotowanie pełnego payloadu dla Payment Service ---
        book_title = book_data.get('title', f"Book #{book_id}")
        payment_payload = {
            "loanId": loan.id,
            "amount": 2.00,
            "userName": user_id,
            "bookTitle": book_title
        }

        client_secret = None
        try:
            payment_res = requests.post(PAYMENT_INTENT_URL, json=payment_payload, headers=headers, timeout=5)
            if payment_res.status_code == 200:
                if 'application/json' in payment_res.headers.get('Content-Type', ''):
                    client_secret = payment_res.json().get('clientSecret')
                else:
                    client_secret = payment_res.text
        except Exception as e:
            print("Payment service error:", e)

        data = LoanSerializer(loan).data
        data['clientSecret'] = client_secret
        
        send_audit_log(
            action_type="LOAN_CREATED", 
            actor_id=request.user.username, 
            visibility="LIBRARIAN", 
            metadata={"loan_id": loan.id, "book_id": book_id, "message": f"Librarian {request.user.username} registered a loan for {user_id}"}
        )
        
        return Response(data, status=status.HTTP_201_CREATED)

class LibrarianUpdateLoanView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, loan_id):
        try:
            loan = Loan.objects.get(id=loan_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)
            
        action = request.data.get('action') 
        new_status = request.data.get('status')
        new_due_date = request.data.get('due_date')
        
        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}
        
        is_returning = (action == 'return' or new_status == 'RETURNED')
        
        if is_returning and loan.status != 'RETURNED':
            if loan.status == 'PENDING_PAYMENT':
                return Response({"error": "Cannot return an unpaid loan. Please complete the payment first."}, status=status.HTTP_400_BAD_REQUEST)
                
            if loan.status in ['ACTIVE', 'OVERDUE'] and now() > loan.due_date:
                days_overdue = (now() - loan.due_date).days
                if days_overdue > 0:
                    loan.penalty_amount = 2.00 + (days_overdue * 0.50)
                    loan.status = 'OVERDUE'
                    loan.save()

            if loan.penalty_amount > 0:
                return Response({"error": "Payment Required", "requires_payment": True}, status=status.HTTP_402_PAYMENT_REQUIRED)
                    
            try:
                response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
                if response.status_code != 200:
                    return Response({"error": "Book not found in Catalog Service"}, status=status.HTTP_404_NOT_FOUND)
                
                book_data = response.json()
                book_data['availableCopies'] += 1
                
                update_response = requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
                
                if update_response.status_code != 200:
                    return Response({"error": "Failed to update catalog"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except requests.exceptions.RequestException:
                return Response({"error": "Error communicating with Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            loan.return_date = now()
            
            is_late = loan.return_date > loan.due_date
            action_type = "LOAN_RETURNED_LATE" if is_late else "LOAN_RETURNED_ON_TIME"
            
            loan.status = 'RETURNED'
            loan.save()
            
            send_audit_log(
                action_type=action_type, 
                actor_id=str(request.user.username), 
                visibility="PUBLIC", 
                metadata={"loan_id": loan.id, "book_id": loan.book_id, "message": f"Librarian {request.user.username} confirmed return ({'late' if is_late else 'on time'})."}
            )
            
            return Response(LoanSerializer(loan).data)
            
        if new_status and new_status != 'RETURNED':
            loan.status = new_status
        if new_due_date:
            loan.due_date = new_due_date
            
        loan.save()
        return Response(LoanSerializer(loan).data)

class LibrarianUserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Pobieramy parametr search z URL (jeśli istnieje)
        search_term = request.query_params.get('search', '').strip()
        
        # 1. Pobierz token admina z Keycloaka
        admin_user = os.environ.get('KEYCLOAK_ADMIN_USER', 'admin')
        admin_password = os.environ.get('KEYCLOAK_ADMIN_PASSWORD', 'admin') # Upewnij się, że masz to w .env
        keycloak_internal_url = os.environ.get('KEYCLOAK_INTERNAL_URL', 'http://keycloak:8080/auth').rstrip('/')
        
        # Jeśli env var nie ma /auth, dodajmy to (dość trywialny fallback)
        if not keycloak_internal_url.endswith('/auth'):
            keycloak_internal_url = f"{keycloak_internal_url}/auth"
        
        token_url = f"{keycloak_internal_url}/realms/master/protocol/openid-connect/token"
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
            headers = {'Authorization': f'Bearer {access_token}'}
            
            # 2. Logika wyszukiwania
            if search_term:
                # Jeśli szukamy, używamy głównego endpointu users z filtrem i limitem 15 wyników
                users_url = f"{keycloak_internal_url}/admin/realms/library-system/users?search={search_term}&max=15"
            else:
                # Jeśli dropdown jest po prostu otwarty, pobieramy pierwszych 15 readerów, 
                # żeby nie zapchać przeglądarki przy tysiącach kont
                users_url = f"{keycloak_internal_url}/admin/realms/library-system/roles/reader/users?first=0&max=15"
            
            users_res = requests.get(users_url, headers=headers)
            if users_res.status_code != 200:
                return Response({"error": "Failed to fetch users from Keycloak"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            keycloak_users = users_res.json()
            
            # 3. Zmapuj dane zwracając też email (przyda się na froncie)
            users_list = []
            for u in keycloak_users:
                users_list.append({
                    'id': u.get('id'),
                    'username': u.get('username'),
                    'email': u.get('email', '')
                })
                
            return Response(users_list)
            
        except requests.exceptions.RequestException as e:
            return Response({"error": f"Error communicating with Keycloak: {str(e)}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class ConfirmPaymentView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, loan_id):
        try:
            loan = Loan.objects.get(id=loan_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)

        if loan.status == 'PENDING_PAYMENT':
            loan.status = 'ACTIVE'
            loan.save()
            return Response({"message": "Initial payment confirmed, status changed to ACTIVE."}) 
        elif loan.status == 'OVERDUE' and loan.penalty_amount > 0:
            loan.penalty_amount = 0
            loan.status = 'RETURNED'
            loan.return_date = now()
            loan.save()
            
            auth_header = request.headers.get('Authorization')
            headers = {'Authorization': auth_header} if auth_header else {}
            
            try:
                response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
                if response.status_code == 200:
                    book_data = response.json()
                    book_data['availableCopies'] += 1
                    update_response = requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
                    if update_response.status_code != 200:
                        print(f"Failed to update catalog: {update_response.text}")
            except requests.exceptions.RequestException as e:
                print(f"Error updating catalog: {e}")
            
            return Response({"message": "Penalty paid successfully. Book returned."})
        
        return Response({"message": "No actions to perform."}, status=status.HTTP_200_OK)

class InitPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, loan_id):
        try:
            loan = Loan.objects.get(id=loan_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)

        if loan.status not in ['PENDING_PAYMENT', 'OVERDUE']:
            return Response({"error": "No payment is charged for this loan"}, status=status.HTTP_400_BAD_REQUEST)

        amount = 2.00
        payment_type = 'INITIAL'
        
        if loan.status == 'OVERDUE':
            if loan.penalty_amount <= 0:
                return Response({"error": "No penalty calculated"}, status=status.HTTP_400_BAD_REQUEST)
            amount = float(loan.penalty_amount)
            payment_type = 'PENALTY'

        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}

        book_title = "Archived Book"
        try:
            cat_res = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers, timeout=5)
            if cat_res.status_code == 200:
                book_title = cat_res.json().get('title', book_title)
        except Exception as e:
            print(f"Failed to get title for {loan.book_id}: {e}")

        payload = {
            "loanId": loan.id,
            "amount": amount,
            "userName": str(loan.user_id),
            "bookTitle": book_title
        }

        try:
            payment_res = requests.post(PAYMENT_INTENT_URL, json=payload, headers=headers, timeout=5)
            if payment_res.status_code == 200:
                if 'application/json' in payment_res.headers.get('Content-Type', ''):
                    client_secret = payment_res.json().get('clientSecret')
                else:
                    client_secret = payment_res.text
                return Response({'clientSecret': client_secret, 'amount': amount, 'type': payment_type})
            print("Payment HTTP non-200. Status:", payment_res.status_code, "Body:", payment_res.text)
            return Response({"error": "Error from Stripe backend", "details": payment_res.text}, status=500)
        except Exception as e:
            print("Payment service error:", e)
            return Response({"error": "Payment service unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
class ReaderUpdateLoanView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, loan_id):
        user_id = request.user.username
        try:
            loan = Loan.objects.get(id=loan_id, user_id=user_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)
            
        action = request.data.get('action') 
        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}
        
        if action == 'return' and loan.status != 'RETURNED':
            if loan.status == 'PENDING_PAYMENT':
                return Response({"error": "Cannot return an unpaid loan. Please complete the payment first."}, status=status.HTTP_400_BAD_REQUEST)

            if loan.status in ['ACTIVE', 'OVERDUE'] and now() > loan.due_date:
                days_overdue = (now() - loan.due_date).days
                if days_overdue > 0:
                    loan.penalty_amount = 2.00 + (days_overdue * 0.50)
                    loan.status = 'OVERDUE'
                    loan.save()

            if loan.penalty_amount > 0:
                return Response({"error": "Payment Required", "requires_payment": True}, status=status.HTTP_402_PAYMENT_REQUIRED)
                    
            try:
                response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
                if response.status_code == 200:
                    book_data = response.json()
                    book_data['availableCopies'] += 1
                    requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
            except requests.exceptions.RequestException:
                return Response({"error": "Error communicating with Catalog Service"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            loan.return_date = now()
            is_late = loan.return_date > loan.due_date
            action_type = "LOAN_RETURNED_LATE" if is_late else "LOAN_RETURNED_ON_TIME"
            
            loan.status = 'RETURNED'
            loan.save()
            
            send_audit_log(
                action_type=action_type, 
                actor_id=str(user_id), 
                visibility="PUBLIC", 
                metadata={"loan_id": loan.id, "book_id": loan.book_id, "message": f"User {user_id} returned book (PUT)."}
            )
            
            return Response(LoanSerializer(loan).data)
            
        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class ReaderInitPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, loan_id):
        user_id = request.user.username
        try:
            loan = Loan.objects.get(id=loan_id, user_id=user_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)

        if loan.status not in ['PENDING_PAYMENT', 'OVERDUE']:
            return Response({"error": "No payment is charged for this loan"}, status=status.HTTP_400_BAD_REQUEST)

        amount = 2.00
        payment_type = 'INITIAL'
        
        if loan.status == 'OVERDUE':
            if loan.penalty_amount <= 0:
                return Response({"error": "No penalty calculated"}, status=status.HTTP_400_BAD_REQUEST)
            amount = float(loan.penalty_amount)
            payment_type = 'PENALTY'

        auth_header = request.headers.get('Authorization')
        headers = {'Authorization': auth_header} if auth_header else {}

        book_title = "Archived Book"
        try:
            cat_res = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers, timeout=5)
            if cat_res.status_code == 200:
                book_title = cat_res.json().get('title', book_title)
        except Exception as e:
            pass

        payload = {
            "loanId": loan.id,
            "amount": amount,
            "userName": user_id,
            "bookTitle": book_title
        }

        try:
            payment_res = requests.post(PAYMENT_INTENT_URL, json=payload, headers=headers, timeout=5)
            if payment_res.status_code == 200:
                if 'application/json' in payment_res.headers.get('Content-Type', ''):
                    client_secret = payment_res.json().get('clientSecret')
                else:
                    client_secret = payment_res.text
                return Response({'clientSecret': client_secret, 'amount': amount, 'type': payment_type})
            return Response({"error": "Error from Stripe backend", "details": payment_res.text}, status=500)
        except Exception as e:
            return Response({"error": "Payment service unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class ReaderConfirmPaymentView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, loan_id):
        user_id = request.user.username
        try:
            loan = Loan.objects.get(id=loan_id, user_id=user_id)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)

        if loan.status == 'PENDING_PAYMENT':
            loan.status = 'ACTIVE'
            loan.save()
            return Response({"message": "Initial payment confirmed, status changed to ACTIVE."})
        elif loan.status == 'OVERDUE' and loan.penalty_amount > 0:
            loan.penalty_amount = 0
            loan.status = 'RETURNED'
            loan.return_date = now()
            loan.save()
            
            auth_header = request.headers.get('Authorization')
            headers = {'Authorization': auth_header} if auth_header else {}
            
            try:
                response = requests.get(f"{CATALOG_SERVICE_URL}/{loan.book_id}", headers=headers)
                if response.status_code == 200:
                    book_data = response.json()
                    book_data['availableCopies'] += 1
                    update_response = requests.put(f"{CATALOG_SERVICE_URL}/{loan.book_id}", data=book_data, headers=headers)
                    if update_response.status_code != 200:
                        print(f"Failed to update catalog: {update_response.text}")
            except requests.exceptions.RequestException as e:
                print(f"Error updating catalog: {e}")
            
            return Response({"message": "Penalty paid successfully. Book returned."})
        
        return Response({"message": "No actions to perform."}, status=status.HTTP_200_OK)
