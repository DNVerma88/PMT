import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route to users who have at least one of the given roles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
