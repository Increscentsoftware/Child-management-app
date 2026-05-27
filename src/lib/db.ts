import Dexie, { type Table } from 'dexie'
import type { Child, AnnualFollowup, ChangeLogEntry, SyncQueueItem } from '@/types'

export class ShishuDB extends Dexie {
  children!: Table<Child>
  followups!: Table<AnnualFollowup>
  change_log!: Table<ChangeLogEntry>
  sync_queue!: Table<SyncQueueItem>

  constructor() {
    super('ShishuMandirDB')

    this.version(1).stores({
      children: 'id, school_id, full_name, father_status, area, father_dv, updated_at, is_active',
      followups: 'id, child_id, year_label, visit_date, created_at',
      change_log: 'id, child_id, changed_at, field_name',
      sync_queue: 'id, table_name, operation, created_at, synced_at',
    })
  }
}

export const db = new ShishuDB()

// Helper: save child locally (offline-first)
export async function saveChildLocally(child: Child): Promise<void> {
  await db.children.put(child)
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    operation: 'INSERT',
    table_name: 'children',
    record_id: child.id,
    payload: child as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
    retry_count: 0
  })
}

export async function updateChildLocally(child: Partial<Child> & { id: string }): Promise<void> {
  await db.children.update(child.id, child)
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    operation: 'UPDATE',
    table_name: 'children',
    record_id: child.id,
    payload: child as Record<string, unknown>,
    created_at: new Date().toISOString(),
    retry_count: 0
  })
}

export async function deleteChildLocally(id: string): Promise<void> {
  await db.children.delete(id)
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    operation: 'DELETE',
    table_name: 'children',
    record_id: id,
    payload: { id },
    created_at: new Date().toISOString(),
    retry_count: 0
  })
}

export async function saveFollowupLocally(fu: AnnualFollowup): Promise<void> {
  await db.followups.put(fu)
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    operation: 'INSERT',
    table_name: 'annual_followups',
    record_id: fu.id,
    payload: fu as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
    retry_count: 0
  })
}

export async function saveChangeLogLocally(entry: ChangeLogEntry): Promise<void> {
  await db.change_log.put(entry)
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    operation: 'INSERT',
    table_name: 'change_log',
    record_id: entry.id,
    payload: entry as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
    retry_count: 0
  })
}
