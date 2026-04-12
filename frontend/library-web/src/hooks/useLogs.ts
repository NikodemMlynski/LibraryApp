import { ENDPOINTS } from '@/config/constants';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';

export type ActionType = 'LOAN_CREATED' | 'BOOK_RETURNED' | 'PAYMENT_SUCCESS' | 'USER_REGISTERED' | 'LOAN_RETURNED_ON_TIME' | 'LOAN_RETURNED_LATE' | 'LOAN_OVERDUE_MARKED' | 'BOOK_ADDED' | 'BOOK_LOST_OR_DAMAGED' | 'PAYMENT_FEE_SUCCESS' | 'PAYMENT_PENALTY_SUCCESS' | 'PAYMENT_FAILED' | 'LIBRARIAN_ADDED' | 'LIBRARIAN_DELETED';

export type Visibility = 'ADMIN' | 'LIBRARIAN';

export interface AuditLog {
  id: string;
  timestamp: string;
  action_type: ActionType;
  actor_id: string;
  visibility: Visibility;
  metadata: Record<string, any>;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  next_skip: number | null;
  total: number;
}


export const useAuditLogs = () => {
  const auth = useAuth();
  const token = auth.user?.access_token;

  return useInfiniteQuery<PaginatedAuditLogs, Error>({
    queryKey: ['auditLogs'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`${ENDPOINTS.ANALYTICS}/admin/logs?skip=${pageParam}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.next_skip ?? undefined,
    initialPageParam: 0,
    enabled: !!token,
    refetchInterval: 30000 // Automatyczne co 30 sek
  });
};
