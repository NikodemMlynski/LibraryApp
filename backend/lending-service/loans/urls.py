from django.urls import path 
from .views import BorrowBookView, ReturnBookView, UserLoansView, LibrarianLoanListView, LibrarianCreateLoanView, LibrarianUpdateLoanView, LibrarianUserListView

urlpatterns = [
    path('borrow/', BorrowBookView.as_view(), name='borrow-book'),
    path('return/<int:loan_id>/', ReturnBookView.as_view(), name='return-book'),
    path('my-loans/', UserLoansView.as_view(), name='my-loans'),
    path('librarian/loans/', LibrarianLoanListView.as_view(), name='librarian-loans'),
    path('librarian/loans/create/', LibrarianCreateLoanView.as_view(), name='librarian-create-loan'),
    path('librarian/loans/<int:loan_id>/', LibrarianUpdateLoanView.as_view(), name='librarian-update-loan'),
    path('librarian/users/', LibrarianUserListView.as_view(), name='librarian-users'),
]