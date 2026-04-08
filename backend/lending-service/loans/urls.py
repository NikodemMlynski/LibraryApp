from django.urls import path
from .views import BorrowBookView, ReturnBookView, UserLoansView, LibrarianLoanListView, LibrarianCreateLoanView, LibrarianUpdateLoanView, LibrarianUserListView, ConfirmPaymentView, InitPaymentView
from .views import ReaderUpdateLoanView, ReaderInitPaymentView, ReaderConfirmPaymentView

urlpatterns = [
    path('borrow/', BorrowBookView.as_view(), name='borrow-book'),
    path('return/<int:loan_id>/', ReturnBookView.as_view(), name='return-book'),
    path('my-loans/', UserLoansView.as_view(), name='my-loans'),
    path('loans/<int:loan_id>/return/', ReaderUpdateLoanView.as_view(), name='reader-return-loan'),
    path('loans/<int:loan_id>/init-payment/', ReaderInitPaymentView.as_view(), name='reader-init-payment'),
    path('loans/<int:loan_id>/confirm-payment/', ReaderConfirmPaymentView.as_view(), name='reader-confirm-payment'),
    path('librarian/loans/', LibrarianLoanListView.as_view(), name='librarian-loans'),
    path('librarian/loans/create/', LibrarianCreateLoanView.as_view(), name='librarian-create-loan'),
    path('librarian/loans/<int:loan_id>/', LibrarianUpdateLoanView.as_view(), name='librarian-update-loan'),
    path('librarian/users/', LibrarianUserListView.as_view(), name='librarian-users'),
    path('librarian/loans/<int:loan_id>/confirm-payment/', ConfirmPaymentView.as_view(), name='confirm-payment'),
    path('librarian/loans/<int:loan_id>/init-payment/', InitPaymentView.as_view(), name='init-payment'),
]