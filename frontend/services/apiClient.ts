const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

type ApiError = Error & {
  status?: number;
  code?: string | null;
  data?: any;
};

// Mọi request nhận 401 cùng lúc dùng chung đúng một lần refresh.
// Promise được reject cho tất cả request chờ nếu refresh thất bại, tránh treo vô hạn.
let refreshPromise: Promise<string> | null = null;

async function performTokenRefresh(refreshToken: string): Promise<string> {
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  let refreshBody: any = null;
  try {
    refreshBody = await refreshRes.json();
  } catch {
    // Backend/proxy có thể trả response không phải JSON.
  }

  if (!refreshRes.ok) {
    const error = new Error(
      refreshBody?.message || `Không thể làm mới phiên đăng nhập (${refreshRes.status})`,
    ) as ApiError;
    error.status = refreshRes.status;
    error.code = refreshBody?.code || null;
    error.data = refreshBody;

    // Chỉ xóa phiên khi backend xác nhận refresh token không còn hợp lệ.
    // Lỗi mạng/5xx là lỗi tạm thời và không được ép người dùng đăng nhập lại.
    if (refreshRes.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }

    throw error;
  }

  const newAccessToken = refreshBody?.data?.accessToken;
  if (!newAccessToken) {
    throw new Error('Refresh token response missing access token');
  }

  // Người dùng có thể đã logout hoặc đăng nhập tài khoản khác trong lúc refresh.
  // Không được khôi phục access token cho một phiên không còn là phiên hiện tại.
  if (localStorage.getItem('refreshToken') !== refreshToken) {
    throw new Error('Phiên đăng nhập đã thay đổi trong lúc làm mới token');
  }

  localStorage.setItem('accessToken', newAccessToken);
  return newAccessToken;
}

function getRefreshedAccessToken(refreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  let requestAccessToken: string | null = null;
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Get token from localStorage
  if (typeof window !== 'undefined') {
    requestAccessToken = localStorage.getItem('accessToken');
    if (requestAccessToken) {
      headers.set('Authorization', `Bearer ${requestAccessToken}`);
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // Auto-refresh token if response is 401 Unauthorized
  if (
    response.status === 401 &&
    endpoint !== '/auth/refresh' &&
    endpoint !== '/auth/login' &&
    typeof window !== 'undefined'
  ) {
    const currentAccessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    // Request khác có thể đã refresh xong trong lúc request này đang chờ response 401.
    const retryAccessToken =
      currentAccessToken && currentAccessToken !== requestAccessToken
        ? currentAccessToken
        : refreshToken
          ? await getRefreshedAccessToken(refreshToken)
          : null;

    if (retryAccessToken) {
      headers.set('Authorization', `Bearer ${retryAccessToken}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  // Parse JSON response if available
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMessage = data?.message || `Lỗi hệ thống (${response.status})`;
    const error = new Error(errorMessage) as ApiError;
    error.status = response.status;
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data as T;
}

/**
 * Fetch a file (e.g. CSV export) and trigger a browser download.
 * Sends the auth token; reads the filename from Content-Disposition if present.
 */
async function downloadFile(endpoint: string, fallbackName: string): Promise<void> {
  const headers = new Headers();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { headers, cache: 'no-store' });
  if (!response.ok) {
    let message = `Lỗi tải file (${response.status})`;
    try {
      const body = await response.json();
      message = body?.message || message;
    } catch {
      /* response is not JSON */
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const apiClient = {
  downloadFile,

  get: <T>(endpoint: string, options?: RequestInit) =>
    // no-store: tránh browser trả dữ liệu GET cũ sau khi vừa cập nhật (PATCH/POST).
    request<T>(endpoint, { cache: 'no-store', ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) 
    }),
    
  put: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) 
    }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
    
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) 
    }),
};
