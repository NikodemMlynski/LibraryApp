import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export interface PaymentTransaction {
    id: number;
    loanId: number;
    amount: number;
    status: string;
    bookTitle: string;
    paidAt: string;
}

export const useMyTransactions = () => {
    const { token } = useAuth();

    return useQuery<PaymentTransaction[], Error>({
        queryKey: ['my-transactions'],
        queryFn: async () => {
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/payments/my-transactions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to fetch transactions');
            }
            return response.json();
        },
        enabled: !!token
    });
};