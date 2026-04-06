import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { fetchWithAuth } from './useBooks';

export interface Loan {
  id: number;
  user_id: string;
  book_id: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'PENDING_PAYMENT';
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface PaginatedLoans {
  count: number;
  next: string | null;
  previous: string | null;
  results: Loan[];
}

const API_URL = 'http://localhost/api/lending/librarian';

export const useLibrarianLoans = (status: string, page: number) => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useQuery<PaginatedLoans, Error>({
    queryKey: ['librarian-loans', status, page],
    queryFn: () => fetchWithAuth(`${API_URL}/loans/?status=${status}&page=${page}`, { method: 'GET' }, token),
    enabled: !!token, 
  });
};

export const useLibrarianUsers = (search?: string) => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  let url = `${API_URL}/users/`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  return useQuery<User[], Error>({
    queryKey: ['librarian-users', search],
    queryFn: () => fetchWithAuth(url, { method: 'GET' }, token),
    enabled: !!token, 
  });
};

interface CreateLoanData {
  user_id: string;
  book_id: string;
  due_date?: string;
}

export const useCreateLibrarianLoan = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: (newLoan: CreateLoanData) => {
      return fetchWithAuth(`${API_URL}/loans/create/`, { 
        method: 'POST', 
        body: JSON.stringify(newLoan) 
      }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarian-loans'] });
      // Invalidate books to reflect available copies change
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

interface UpdateLoanData {
  id: number;
  action?: 'return';
  status?: string;
  due_date?: string;
}

export const useUpdateLibrarianLoan = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: (updateData: UpdateLoanData) => {
      const { id, ...data } = updateData;
      return fetchWithAuth(`${API_URL}/loans/${id}/`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarian-loans'] });
      // Invalidate books to reflect available copies change if returned
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useConfirmLoanPayment = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: (loanId: number) => {
      return fetchWithAuth(`${API_URL}/loans/${loanId}/confirm-payment/`, { 
        method: 'POST' 
      }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarian-loans'] });
      queryClient.invalidateQueries({ queryKey: ['user-loans'] });
    },
  });
};

export const useInitLoanPayment = () => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: (loanId: number) => {
      return fetchWithAuth(`${API_URL}/loans/${loanId}/init-payment/`, { 
        method: 'POST' 
      }, token);
    }
  });
};
