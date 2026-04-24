import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Token is stored in an httpOnly cookie – no manual Authorization header needed.
// We only need to attach the CSRF token from our in-memory store on mutating requests.

let csrfToken: string | null = null;

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Ensures cookies are sent
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor: attach CSRF token ────────────────────────────────────
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Read the csrf_token cookie value (it is non-httpOnly so JS can access it). */
function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'GET').toUpperCase();

  if (!SAFE_METHODS.has(method)) {
    // Prefer the in-memory value; fall back to reading the cookie directly.
    // This handles HMR reloads that reset the in-memory variable to null.
    const token = csrfToken ?? readCsrfCookie();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
      // Re-sync the in-memory store so subsequent requests don't hit the cookie
      if (!csrfToken) setCsrfToken(token);
    }
  }

  return config;
});

// ── Response interceptor: handle 401 with token refresh ──────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(null);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _csrfRetry?: boolean;
    };

    // ── 403 CSRF retry: re-fetch csrf token and retry once ────────────────
    if (
      error.response?.status === 403 &&
      !originalRequest._csrfRetry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      const errMessage =
        (error.response.data as { message?: string })?.message ?? '';
      if (
        errMessage.toLowerCase().includes('csrf') ||
        errMessage.toLowerCase().includes('invalid token')
      ) {
        originalRequest._csrfRetry = true;
        try {
          const { data } = await api.get<{ csrfToken: string }>('/auth/csrf');
          if (data?.csrfToken) {
            setCsrfToken(data.csrfToken);
          } else {
            // Fall back to cookie
            const fromCookie = readCsrfCookie();
            if (fromCookie) setCsrfToken(fromCookie);
          }
          return api(originalRequest);
        } catch {
          // Fall through to normal error handling
        }
      }
    }

    // ── 401: attempt token refresh once ──────────────────────────────────
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The refresh endpoint sets new access_token + refresh_token + csrf_token cookies
        const { data } = await api.post<{ csrfToken?: string }>('/auth/refresh');
        if (data?.csrfToken) setCsrfToken(data.csrfToken);

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        // Redirect to login – auth slice will handle the rest
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { api };
export default api;
