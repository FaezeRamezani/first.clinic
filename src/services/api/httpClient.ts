const API_BASE_URL = 'http://127.0.0.1:3000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options?.headers as Record<string, string>)
  };

  if (options?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const body: ApiResponse<T> = await response.json();

  if (!response.ok || !body.success) {
    const errorMsg = body.error?.message || `خطای ارتباط با سرور (${response.status})`;
    throw new Error(errorMsg);
  }

  return (body.data !== undefined ? body.data : body) as T;
}
