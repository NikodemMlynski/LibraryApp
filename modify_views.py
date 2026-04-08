import re

with open('backend/lending-service/loans/views.py', 'r') as f:
    content = f.read()

# Add import
if 'from django.db.models import Case' not in content:
    content = content.replace('from django.contrib.auth.models import User', 'from django.contrib.auth.models import User\nfrom django.db.models import Case, When, Value, IntegerField')

# Replace UserLoansView
user_loans_view_replacement = """class UserLoansView(APIView):
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
"""

content = re.sub(r'class UserLoansView\(APIView\):.*?return Response\(serializer\.data\)', user_loans_view_replacement, content, flags=re.DOTALL)

with open('backend/lending-service/loans/views.py', 'w') as f:
    f.write(content)
