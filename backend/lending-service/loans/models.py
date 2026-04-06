from django.db import models
from datetime import timedelta
from django.utils.timezone import now 
# Create your models here.

def get_due_date():
    return now() + timedelta(days=14)


class Loan(models.Model):
    STATUS_CHOICES = [
        ('PENDING_PAYMENT', 'Pending Payment'),
        ('ACTIVE', 'Active'),
        ('RETURNED', 'Returned'),
        ('OVERDUE', 'Overdue')
    ]

    user_id = models.CharField(max_length=255, db_index=True)
    book_id = models.CharField(db_index=True)

    borrow_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(default=get_due_date)
    return_date = models.DateTimeField(null=True, blank=True)

    penalty_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING_PAYMENT')

    def __str__(self):
        return f"Loan {self.id} | USER: {self.user_id} | Book: {self.book_id} | Status: {self.status}"
