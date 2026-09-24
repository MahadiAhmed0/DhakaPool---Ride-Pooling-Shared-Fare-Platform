// Database queries for the audit trail (status_history). Rows are only ever added (FR-HIST-02):
// there is deliberately no update or delete function here, and a database trigger forbids both.
import { prisma } from '../../db/client.ts';
import type { Tx } from '../../db/transaction.ts';
import type { AuditEntity, Prisma, StatusHistory } from '../../generated/prisma/client.ts';

export async function insertHistoryRows(
  tx: Tx,
  rows: Prisma.StatusHistoryCreateManyInput[],
): Promise<void> {
  await tx.statusHistory.createMany({ data: rows });
}

// Oldest first; the id breaks ties between rows written in the same millisecond.
export async function findHistory(
  entityType: AuditEntity,
  entityId: string,
): Promise<StatusHistory[]> {
  return prisma.statusHistory.findMany({
    where: { entityType, entityId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
}
