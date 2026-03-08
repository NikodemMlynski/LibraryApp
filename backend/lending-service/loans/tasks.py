import os
import requests
from celery import shared_task
from django.utils.timezone import now
from .models import Loan
from django.contrib.auth.models import User

@shared_task
def check_overdue_loans():
    print(f"[{now()}] URUCHAMIANIE ZADANIA check_overdue_loans...")
    # Pobierz z bazy wszystkie obiekty Loan, gdzie status == 'ACTIVE' oraz due_date jest mniejsze niż now().
    overdue_loans = Loan.objects.filter(status='ACTIVE', due_date__lt=now())
    print(f"[{now()}] Znaleziono {overdue_loans.count()} przeterminowanych wypożyczeń w bazie danych.")
    count = 0
    
    for loan in overdue_loans:
        # Zmień ich status na 'OVERDUE' i zapisz w bazie.
        loan.status = 'OVERDUE'
        loan.save()
        count += 1
        
        # Dla każdego z nich wyślij żądanie POST do notify-service
        user_email = ""
        user_obj = User.objects.filter(username=loan.user_id).first()
        if user_obj and user_obj.email:
            user_email = user_obj.email
        else:
            try:
                admin_user = os.environ.get('KEYCLOAK_ADMIN_USER', 'admin')
                admin_password = os.environ.get('KEYCLOAK_ADMIN_PASSWORD', 'twoje_tajne_haslo')
                keycloak_url = os.environ.get('KEYCLOAK_URL', 'http://keycloak:8080')
                
                token_url = f"{keycloak_url}/auth/realms/master/protocol/openid-connect/token"
                token_data = {
                    'client_id': 'admin-cli',
                    'username': admin_user,
                    'password': admin_password,
                    'grant_type': 'password'
                }
                
                token_res = requests.post(token_url, data=token_data, timeout=5)
                if token_res.status_code == 200:
                    access_token = token_res.json().get('access_token')
                    users_url = f"{keycloak_url}/auth/admin/realms/library-system/users?username={loan.user_id}&exact=true"
                    headers = {'Authorization': f'Bearer {access_token}'}
                    users_res = requests.get(users_url, headers=headers, timeout=5)
                    
                    if users_res.status_code == 200:
                        users_data = users_res.json()
                        if users_data and len(users_data) > 0 and users_data[0].get('email'):
                            user_email = users_data[0].get('email')
                            if user_obj:
                                user_obj.email = user_email
                                user_obj.save(update_fields=['email'])
                            else:
                                User.objects.create(username=loan.user_id, email=user_email)
            except Exception as e:
                print(f"Błąd przy pobieraniu emaila z Keycloak dla usera {loan.user_id}: {e}")
            
            if not user_email:
                user_email = f"{loan.user_id}@example.com" 

        notification_payload = {
            "user_id": str(loan.user_id),
            "recipient_email": user_email,
            "subject": "Twoje wypożyczenie zostało opóźnione / Overdue Loan",
            "message_body": f"Książka o ID {loan.book_id} nie została zwrócona w terminie. Prosimy o natychmiastowy zwrot.\n\nBook ID {loan.book_id} is overdue. Please return it immediately."
        }

        try:
            res = requests.post("http://notify-service:8000/notifications/send", json=notification_payload, timeout=5)
            print(f"Notify service response: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"Failed to send overdue notification to notify-service for loan id {loan.id}: {e}")

    return f"Checked overdue loans: marked {count} as OVERDUE and requested notifications."
