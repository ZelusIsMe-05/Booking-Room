export interface User {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  username?: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
