import { ENDPOINTS } from '@/config/constants';
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

export interface PaginatedBooks {
  content: Book[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  empty: boolean;
}

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
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const error = new Error(`HTTP Error: ${response.status}`) as any;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
};

export const useBooks = (page: number = 0, size: number = 8, search?: string) => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  // Dynamiczne budowanie URL
  let url = `${ENDPOINTS.CATALOG}?page=${page}&size=${size}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  return useQuery<PaginatedBooks, Error>({
    queryKey: ['books', page, size, search], // Zależność od search
    queryFn: () => fetchWithAuth(url, { method: 'GET' }, token),
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
      return fetchWithAuth(ENDPOINTS.CATALOG, { 
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
      return fetchWithAuth(`${ENDPOINTS.CATALOG}/${id}`, { 
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
      fetchWithAuth(`${ENDPOINTS.CATALOG}/${id}`, { 
        method: 'DELETE' 
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};
