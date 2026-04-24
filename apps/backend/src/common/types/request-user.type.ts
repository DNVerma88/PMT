/** Represents the authenticated user as injected by JwtStrategy into request.user */
export interface RequestUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}
