import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Notification {
  id: number;
  title: string;
  body: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  link: string;
  is_read: boolean;
  created_at: string;
}

interface Paginated<T> { results: T[]; count: number; }

const PATH = '/notifications/notifications/';

/** Recent notifications for the panel (most recent first; backend orders by -created_at). */
export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => (await api.get<Paginated<Notification>>(PATH, { params: { page_size: 20 } })).data.results,
    refetchInterval: 60_000,
  });

/** Unread count for the badge — uses the paginated `count` so it's exact. */
export const useUnreadCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await api.get<Paginated<Notification>>(PATH, { params: { is_read: false, page_size: 1 } })).data.count,
    refetchInterval: 60_000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`${PATH}${id}/mark_read/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post(`${PATH}mark_all_read/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
