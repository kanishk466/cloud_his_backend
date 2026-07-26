/**
 * The authenticated platform user performing an audited action.
 * Extracted in controllers from the JWT payload (`req.user.sub` / `req.user.email`).
 */
export interface AuditActor {
  actorId: string;
  actorEmail: string;
}

/** Narrow an authenticated request's JWT payload into an AuditActor. */
export function actorFromRequest(req: {
  user?: { sub?: string; email?: string };
}): AuditActor {
  return {
    actorId: req.user?.sub ?? 'unknown',
    actorEmail: req.user?.email ?? 'unknown',
  };
}
