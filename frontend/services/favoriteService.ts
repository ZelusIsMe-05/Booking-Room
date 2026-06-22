import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import { BackendRoom } from './roomService';

export interface FavoritesListResponse {
  items: BackendRoom[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface FavoriteToggleResponse {
  action: 'ADDED' | 'REMOVED';
  favorite: {
    favorite_id: string;
    tenant_id: string;
    room_id: string;
    status: boolean;
  };
}

export const favoriteService = {
  listFavorites: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<FavoritesListResponse>> => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<FavoritesListResponse>>(`/favorites${queryString}`);
  },

  toggleFavorite: async (roomId: string): Promise<ApiResponse<FavoriteToggleResponse>> => {
    return apiClient.post<ApiResponse<FavoriteToggleResponse>>('/favorites/toggle', {
      room_id: roomId,
    });
  },
};
