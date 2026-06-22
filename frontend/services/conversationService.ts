import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Backend shapes (from /api/conversations)
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  conversation_id: string;
  created_at: string;
  peer_user_id: string;
  peer_name: string | null;
  peer_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ConversationMessage {
  message_id: string;
  conversation_id: string;
  content: string;
  sender_id: string;
  sent_at: string;
  status: MessageStatus;
  read_at: string | null;
}

export interface MessagesResponse {
  items: ConversationMessage[];
  total: number;
  page: number;
  limit: number;
}

export const conversationService = {
  listConversations: async (): Promise<ApiResponse<ConversationSummary[]>> => {
    return apiClient.get<ApiResponse<ConversationSummary[]>>('/conversations');
  },

  initConversation: async (peerUserId: string): Promise<ApiResponse<ConversationSummary>> => {
    return apiClient.post<ApiResponse<ConversationSummary>>('/conversations', { peer_user_id: peerUserId });
  },

  getMessages: async (
    conversationId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResponse<MessagesResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<MessagesResponse>>(`/conversations/${conversationId}/messages${qs}`);
  },

  sendMessage: async (conversationId: string, content: string): Promise<ApiResponse<ConversationMessage>> => {
    return apiClient.post<ApiResponse<ConversationMessage>>(`/conversations/${conversationId}/messages`, { content });
  },

  markAsRead: async (conversationId: string): Promise<ApiResponse<null>> => {
    return apiClient.patch<ApiResponse<null>>(`/conversations/${conversationId}/read`);
  },
};
