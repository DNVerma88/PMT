import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

export const AUDIT_ACTION_KEY = 'auditAction';

/** Mark a route handler to emit an audit log entry with the given action. */
export const Audit = (action: AuditAction) => SetMetadata(AUDIT_ACTION_KEY, action);
