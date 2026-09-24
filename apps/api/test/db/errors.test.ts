// Database errors become clear API errors (ARCHITECTURE §7.2, §9.1). A database that is down is a
// 503 the client can retry, never a 500 (NFR-REL-03, TC-42).
import { describe, expect, it } from 'vitest';
import { mapDatabaseError } from '../../src/db/errors.ts';
import { Prisma } from '../../src/generated/prisma/client.ts';

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Can't reach database server at db", {
    code,
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe('when the database cannot be reached', () => {
  it.each(['P1001', 'P1002', 'P1017'])('answers %s with 503 SERVICE_UNAVAILABLE', (code) => {
    expect(mapDatabaseError(prismaError(code))).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      httpStatus: 503,
    });
  });

  it('leaves errors it does not recognise to the generic handler', () => {
    expect(mapDatabaseError(prismaError('P2999'))).toBeUndefined();
    expect(mapDatabaseError(new Error('something else'))).toBeUndefined();
  });
});
