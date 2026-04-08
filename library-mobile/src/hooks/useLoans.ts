import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.42:8089/api';

export interface Loan {
    id: number;
    book_id: string;
    book_title: string;
    borrow_date: string;
    due_date: string;
    return_date: string | null;
    status: string;
    penalty_amount: string;
}

export interface MyLoansResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Loan[];
}

interface CreateLoanPayload {
    book_id: number;
    due_date: string;
}

interface CreateLoanResponse {
    id: number;
    clientSecret: string;
    status: string;
}

export const useLoans = () => {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const createLoan = useMutation({
        mutationFn: async (payload: CreateLoanPayload) => {
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/lending/borrow/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to create loan');
            }

            return response.json() as Promise<CreateLoanResponse>;
        }
    });

    const returnLoan = useMutation({
        mutationFn: async (loanId: number) => {
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/lending/loans/${loanId}/return/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ action: 'return' })
            });

            if (!response.ok) {
                if (response.status === 402) {
                    throw new Error('402_PAYMENT_REQUIRED');
                }
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to return loan');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['books'] });
            queryClient.invalidateQueries({ queryKey: ['book'] });
        }
    });

    const initPayment = useMutation({
        mutationFn: async (loanId: number) => {
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/lending/loans/${loanId}/init-payment/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to initialize payment');
            }
            return response.json();
        }
    });

    const confirmPayment = useMutation({
        mutationFn: async (loanId: number) => {
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/lending/loans/${loanId}/confirm-payment/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to confirm payment');
            }
            return response.text();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['books'] });
            queryClient.invalidateQueries({ queryKey: ['book'] });
        }
    });

    return {
        createLoan,
        returnLoan,
        initPayment,
        confirmPayment
    };
};

export const useMyLoans = (status: string) => {
    const { token } = useAuth();

    return useInfiniteQuery<MyLoansResponse, Error>({
        queryKey: ['my-loans', status],
        queryFn: async ({ pageParam = 1 }) => {
            if (!token) throw new Error('Not authenticated');

            let url = `${API_URL}/lending/my-loans/?page=${pageParam}`;
            if (status !== 'ALL') {
                url += `&status=${status}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to fetch loans');
            }
            return response.json();
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.next) {
                return allPages.length + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
        enabled: !!token
    });
};
