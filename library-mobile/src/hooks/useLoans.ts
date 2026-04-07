import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.42:8089/api';

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

    const confirmPayment = useMutation({
        mutationFn: async (loanId: number) => {
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/lending/librarian/loans/${loanId}/confirm-payment/`, {
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
            
            // Return raw response text in case it's empty or simple message
            return response.text();
        },
        onSuccess: () => {
            // Invalidate books to refresh available copies across the app
            queryClient.invalidateQueries({ queryKey: ['books'] });
            queryClient.invalidateQueries({ queryKey: ['book'] });
        }
    });

    return {
        createLoan,
        confirmPayment
    };
};
