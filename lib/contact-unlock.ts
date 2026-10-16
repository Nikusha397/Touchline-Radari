import type { ApplicationDatabase } from './node-storage';

/** A single atomic batch charges once and records permanent access. */
export async function chargeContactUnlock(db: ApplicationDatabase, userId: string, destination: string, cost: number, created: string) {
  if (!Number.isInteger(cost) || cost < 1 || cost > 100) throw new Error('Invalid contact price');
  const key=userId+':'+destination;
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO agent_ledger (id,user_id,delta,reason,created_at) SELECT ?,?,?,'contact unlock',? WHERE (SELECT COALESCE(SUM(delta),0) FROM agent_ledger WHERE user_id=? AND purpose='unlock')>=? AND NOT EXISTS (SELECT 1 FROM agent_unlocks WHERE user_id=? AND recipient_id=?)").bind('unlock:'+key,userId,-cost,created,userId,cost,userId,destination),
    db.prepare('INSERT OR IGNORE INTO agent_unlocks (id,user_id,recipient_id,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM agent_ledger WHERE id=? AND user_id=? AND delta<0)').bind(key,userId,destination,created,'unlock:'+key,userId),
  ]);
  return !!await db.prepare('SELECT id FROM agent_unlocks WHERE id=?').bind(key).first();
}
