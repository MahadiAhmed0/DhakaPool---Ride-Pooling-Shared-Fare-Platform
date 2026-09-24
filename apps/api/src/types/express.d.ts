// Adds the signed-in user to Express's Request type. The session middleware sets it (ADR-0005).
import type { UserRole } from '@dhakapool/shared';

export type AuthenticatedUser = { id: string; role: UserRole; sessionId: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
