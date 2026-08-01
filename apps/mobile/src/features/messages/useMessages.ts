import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '@/lib/analytics';
import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  fromStaff: boolean;
  body: string;
  createdAt: string;
}

const KEY = ['messages'];

/**
 * The borrower's thread with the loan team. Polls while the screen is
 * mounted — push notifications cover the backgrounded case; a socket can
 * replace this without touching the screen.
 */
export function useThread() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await api.GET('/api/v1/messages');
      if (error !== undefined) throw new Error('could not load messages');
      return (data as unknown as { messages: ChatMessage[] }).messages;
    },
    refetchInterval: 5_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string): Promise<ChatMessage> => {
      const { data, error } = await api.POST('/api/v1/messages', { body: { body } });
      if (error !== undefined) throw new Error('could not send message');
      return data as unknown as ChatMessage;
    },
    onSuccess: () => {
      track('message_sent');
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
