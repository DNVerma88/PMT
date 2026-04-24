/** Standard paginated response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Standard single-item response envelope */
export interface ApiResponse<T> {
  data: T;
}

/** JWT access token payload */
export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

/** JWT refresh token payload */
export interface JwtRefreshPayload {
  sub: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}
