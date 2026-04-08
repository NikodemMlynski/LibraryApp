import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.42:8089/api';

export interface Book {
    id: number;
    title: string;
    author: string;
    isbn: string;
    availableCopies: number;
    totalCopies: number;
    coverImageUrl?: string;
    description?: string;
}

export const useBooks = (searchQuery: string = '') => {
    const { token } = useAuth();

    return useInfiniteQuery({
        queryKey: ['books', searchQuery],
        queryFn: async ({ pageParam = 0 }) => {
            if (!token) throw new Error('Not authenticated');

            const url = new URL(`${API_URL}/catalog/books`);
            url.searchParams.append('page', pageParam.toString());
            url.searchParams.append('size', '10');
            if (searchQuery) {
                url.searchParams.append('search', searchQuery);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return response.json();
        },
        getNextPageParam: (lastPage: any) => {
            if (lastPage.last) return undefined;
            return lastPage.number + 1;
        },
        initialPageParam: 0,
        enabled: !!token, 
    });
};

export const useBookDetails = (id: string | number) => {
    const { token } = useAuth();

    return useQuery({
        queryKey: ['book', id],
        queryFn: async () => {
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_URL}/catalog/books/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch book details');
            }

            return response.json() as Promise<Book>;
        },
        enabled: !!token && !!id,
    });
};
