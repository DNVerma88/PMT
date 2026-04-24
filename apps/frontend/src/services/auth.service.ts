import { api, setCsrfToken } from './api';

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Fetch a CSRF token from the server and store it in memory.
   * Must be called on app init before any mutating request.
   */
  async getCsrfToken(): Promise<string> {
    const { data } = await api.get<{ csrfToken: string }>('/auth/csrf');
    setCsrfToken(data.csrfToken);
    return data.csrfToken;
  },

  /**
   * Login with email and password.
   * The server sets httpOnly JWT cookies in the response.
   */
  async login(credentials: LoginCredentials): Promise<CurrentUser> {
    const { data } = await api.post<CurrentUser>('/auth/login', credentials);
    return data;
  },

  /**
   * Get the currently authenticated user (validates the JWT cookie server-side).
   */
  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>('/auth/me');
    return data;
  },

  /**
   * Log out and clear session cookies server-side.
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
