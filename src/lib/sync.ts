import { supabase } from './supabase'
import { db } from './db'

let isSyncing = false

export async function syncPendingRecords(): Promise<{ synced: number; errors: number }> {
  if (isSyncing) return { synced: 0, errors: 0 }
  isSyncing = true
  let synced = 0
  let errors = 0

  try {
    const pending = await db.sync_queue.toArray()

    // Filter truly unsynced
    const unsynced = pending.filter(item => !item.synced_at && item.retry_count < 5)

    for (const item of unsynced) {
      try {
        if (item.operation === 'INSERT') {
          const { error } = await supabase
            .from(item.table_name)
            .upsert(item.payload as Record<string, unknown>, { onConflict: 'id' })
          if (error) throw error
        } else if (item.operation === 'UPDATE') {
          const { error } = await supabase
            .from(item.table_name)
            .update(item.payload as Record<string, unknown>)
            .eq('id', item.record_id)
          if (error) throw error
        } else if (item.operation === 'DELETE') {
          const { error } = await supabase
            .from(item.table_name)
            .delete()
            .eq('id', item.record_id)
          if (error) throw error
        }

        await db.sync_queue.update(item.id, { synced_at: new Date().toISOString() })
        synced++
      } catch (err) {
        await db.sync_queue.update(item.id, {
          retry_count: item.retry_count + 1,
          error: String(err)
        })
        errors++
        console.error(`Sync failed for ${item.table_name}:${item.record_id}`, err)
      }
    }
  } finally {
    isSyncing = false
  }

  return { synced, errors }
}

export async function getPendingCount(): Promise<number> {
  const all = await db.sync_queue.toArray()
  return all.filter(i => !i.synced_at).length
}

// Pull latest data from Supabase into local IndexedDB
export async function pullFromSupabase(): Promise<void> {
  try {
    const { data: children, error: cErr } = await supabase
      .from('children')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (cErr) throw cErr
    if (children) {
      await db.children.bulkPut(children)
    }

    const { data: followups, error: fErr } = await supabase
      .from('annual_followups')
      .select('*')
      .order('created_at', { ascending: false })

    if (fErr) throw fErr
    if (followups) {
      await db.followups.bulkPut(followups)
    }

    const { data: logs, error: lErr } = await supabase
      .from('change_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(500)

    if (lErr) throw lErr
    if (logs) {
      await db.change_log.bulkPut(logs)
    }
  } catch (err) {
    console.error('Pull from Supabase failed:', err)
  }
}

// Start background sync watcher
export function startSyncWatcher(): () => void {
  const handle = async () => {
    if (navigator.onLine) {
      await syncPendingRecords()
      await pullFromSupabase()
    }
  }

  window.addEventListener('online', handle)
  const interval = setInterval(handle, 30_000) // every 30s

  return () => {
    window.removeEventListener('online', handle)
    clearInterval(interval)
  }
}
