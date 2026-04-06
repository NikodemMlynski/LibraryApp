import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { fetchWithAuth } from './useBooks';

export interface PaymentTransaction {
  id: number;
  loanId: number;
  userId: string;
  amount: number;
  status: string;
  stripePaymentIntentId: string;
  userName?: string;
  bookTitle?: string;
  paidAt?: string;
}

const PAYMENT_API_URL = 'http://localhost/api/payments';

export const useAdminTransactions = () => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useQuery<PaymentTransaction[], Error>({
    queryKey: ['admin-transactions'],
    queryFn: () => fetchWithAuth(`${PAYMENT_API_URL}/admin/transactions`, { method: 'GET' }, token),
    enabled: !!token, 
  });
};
