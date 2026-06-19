import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';

export interface HostVerificationResponse {
  verification: {
    approvalStatus: string;
    idCardSubmitted: boolean;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
  };
}

export const hostProfileService = {
  submitHostVerification: async (params: {
    idCardFront: File;
    idCardBack: File;
  }): Promise<ApiResponse<HostVerificationResponse>> => {
    const formData = new FormData();
    formData.append('id_card_front', params.idCardFront);
    formData.append('id_card_back', params.idCardBack);

    return apiClient.post<ApiResponse<HostVerificationResponse>>(
      '/profile/host-verification',
      formData
    );
  },
};
