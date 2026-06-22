const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Get token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
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
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      let refreshedToken: string | null = null;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          console.log('Centralized API client: Access token expired. Attempting to refresh...');
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshBody = await refreshRes.json();
            const newAccessToken = refreshBody?.data?.accessToken;
            if (newAccessToken) {
              localStorage.setItem('accessToken', newAccessToken);
              console.log('Centralized API client: Token refreshed successfully.');
              refreshedToken = newAccessToken;
              onRefreshed(newAccessToken);
              isRefreshing = false;
            } else {
              throw new Error('Refresh token response missing access token');
            }
          } else {
            throw new Error('Refresh token request failed');
          }
        } catch (refreshErr) {
          console.error('Centralized API client: Token refresh failed.', refreshErr);
          isRefreshing = false;
          // Clear credentials and force redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
          throw refreshErr;
        }
      }

      if (refreshedToken) {
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        response = await fetch(url, { ...options, headers });
      } else {
        // Return a Promise that resolves when another request finishes refreshing.
        const retryOriginalRequest = new Promise<Response>((resolve) => {
          subscribeTokenRefresh((token: string) => {
            headers.set('Authorization', `Bearer ${token}`);
            resolve(fetch(url, { ...options, headers }));
          });
        });

        response = await retryOriginalRequest;
      }
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
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
    
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
