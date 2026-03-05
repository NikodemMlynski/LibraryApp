import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  availableCopies: number;
  coverImageUrl: string;
}

const API_URL = 'http://localhost/api/catalog/books';

export const fetchWithAuth = async (url: string, options: RequestInit, token?: string) => {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.method !== 'GET' && options.method !== 'DELETE' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
};

export const useBooks = () => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useQuery<Book[], Error>({
    queryKey: ['books'],
    queryFn: () => fetchWithAuth(API_URL, { method: 'GET' }, token),
    enabled: !!token, 
  });
};

interface BookFormData {
  title: string;
  author: string;
  isbn: string;
  availableCopies: number;
  file?: File | null;
}

export const useCreateBook = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: (newBook: BookFormData) => {
      const formData = new FormData();
      formData.append('title', newBook.title);
      formData.append('author', newBook.author);
      formData.append('isbn', newBook.isbn);
      formData.append('availableCopies', newBook.availableCopies.toString());
      if (newBook.file) {
        formData.append('file', newBook.file);
      }
      return fetchWithAuth(API_URL, { 
        method: 'POST', 
        body: formData 
      }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useUpdateBook = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: ({ id, ...updateData }: BookFormData & { id: number }) => {
      const formData = new FormData();
      formData.append('title', updateData.title);
      formData.append('author', updateData.author);
      formData.append('isbn', updateData.isbn);
      formData.append('availableCopies', updateData.availableCopies.toString());
      if (updateData.file) {
        formData.append('file', updateData.file);
      }
      return fetchWithAuth(`${API_URL}/${id}`, { 
        method: 'PUT', 
        body: formData 
      }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useDeleteBook = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useMutation({
    mutationFn: (id: number) => 
      fetchWithAuth(`${API_URL}/${id}`, { 
        method: 'DELETE' 
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};
