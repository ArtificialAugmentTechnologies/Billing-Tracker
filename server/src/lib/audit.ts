import { prisma } from './prisma';

export function audit(
  userId: string | undefined,
  entity: string,
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
) {
  return prisma.auditLog.create({ data: { userId, entity, entityId, action } });
}
