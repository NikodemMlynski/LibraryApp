import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { fetchWithAuth } from './useBooks';
import { ENDPOINTS } from '@/config/constants';

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


export const useLibrarianLoans = (status: string, page: number) => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useQuery<PaginatedLoans, Error>({
    queryKey: ['librarian-loans', status, page],
    queryFn: () => fetchWithAuth(`${ENDPOINTS.LENDING}/librarian/loans/?status=${status}&page=${page}`, { method: 'GET' }, token),
    enabled: !!token, 
  });
};

export const useLibrarianUsers = (search?: string) => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  let url = `${ENDPOINTS.LENDING}/librarian/users/`;
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
      return fetchWithAuth(`${ENDPOINTS.LENDING}/librarian/loans/create/`, { 
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
      return fetchWithAuth(`${ENDPOINTS.LENDING}/librarian/loans/${id}/`, { 
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
      return fetchWithAuth(`${ENDPOINTS.LENDING}/librarian/loans/${loanId}/confirm-payment/`, { 
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
      return fetchWithAuth(`${ENDPOINTS.LENDING}/librarian/loans/${loanId}/init-payment/`, { 
        method: 'POST' 
      }, token);
    }
  });
};
