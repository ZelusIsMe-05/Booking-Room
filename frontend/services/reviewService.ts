import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';

export interface ReviewReply {
  id: string;
  review_id: string;
  parentReplyId?: string | null;
  authorId?: string;
  authorName: string;
  avatarUrl: string | null;
  isHost: boolean;
  content: string;
  createdAt: string;
}

export interface RoomReview {
  review_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer_id?: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  replies?: ReviewReply[];
}

export interface ListReviewsResponse {
  items: RoomReview[];
  total: number;
  page: number;
  limit: number;
}

export const reviewService = {
  /** GET /api/rooms/:roomId/reviews — public, includes replies */
  getRoomReviews: async (
    roomId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<ListReviewsResponse>> => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<ListReviewsResponse>>(`/rooms/${roomId}/reviews${queryString}`);
  },

  /** POST /api/reviews — TENANT only */
  createReview: async (data: {
    deposit_id: string;
    rating: number;
    comment?: string;
  }): Promise<ApiResponse<{ review: RoomReview }>> => {
    return apiClient.post<ApiResponse<{ review: RoomReview }>>('/reviews', data);
  },

  /** PUT /api/reviews/:reviewId — TENANT only */
  updateReview: async (
    reviewId: string,
    data: {
      rating: number;
      comment?: string;
    }
  ): Promise<ApiResponse<{ review: RoomReview }>> => {
    return apiClient.put<ApiResponse<{ review: RoomReview }>>(`/reviews/${reviewId}`, data);
  },

  /** POST /api/reviews/:reviewId/replies — any authenticated user */
  createReply: async (
    reviewId: string,
    content: string,
    parentReplyId?: string | null
  ): Promise<ApiResponse<{ reply: ReviewReply }>> => {
    return apiClient.post<ApiResponse<{ reply: ReviewReply }>>(`/reviews/${reviewId}/replies`, { 
      content, 
      parentReplyId: parentReplyId || null 
    });
  },

  /** PUT /api/reviews/replies/:replyId — edit a reply (authenticated owner only) */
  updateReply: async (
    replyId: string,
    content: string
  ): Promise<ApiResponse<{ reply: ReviewReply }>> => {
    return apiClient.put<ApiResponse<{ reply: ReviewReply }>>(`/reviews/replies/${replyId}`, { content });
  },

  /** GET /api/reviews/:reviewId/replies — public */
  getReplies: async (
    reviewId: string
  ): Promise<ApiResponse<{ replies: ReviewReply[] }>> => {
    return apiClient.get<ApiResponse<{ replies: ReviewReply[] }>>(`/reviews/${reviewId}/replies`);
  },
};
