import { db } from './db'

interface AuditParams {
  userId?: string
  action: string
  auditableType?: string
  auditableId?: string
  description?: string
  oldValues?: object
  newValues?: object
  ipAddress?: string
}

export async function logAudit(params: AuditParams) {
  await db.auditLog.create({
    data: {
      ...params,
      oldValues: params.oldValues as any,
      newValues: params.newValues as any,
    },
  })
}
