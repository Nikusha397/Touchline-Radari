import { env } from 'cloudflare:workers';
import { seeds } from './seed';
import type { TrialPreview, TrialDetails } from './radar-types';
export function database() { if (!env.DB) throw new Error('The radar is temporarily unavailable. Please try again.'); return env.DB; }
export function setting(name: string): string { return String((env as unknown as Record<string,unknown>)[name] ?? ''); }
export const seedCheckedAt = '2026-10-07T12:00:00.000Z';
export async function ensureSeeds() {
  const db = database();
  const existing=await db.prepare(`SELECT id FROM trials WHERE id IN (${seeds.map(()=>'?').join(',')})`).bind(...seeds.map(s=>s.preview.id)).all<{id:string}>();
  const ids=new Set(existing.results.map(r=>r.id));
  const missing=seeds.filter(s=>!ids.has(s.preview.id));
  if(!missing.length)return;
  // Add newly verified records without replacing curated data or source-check history.
  await db.batch(missing.map(s => db.prepare('INSERT OR IGNORE INTO trials (id,public_json,detail_json,source_url,checked_at,state,evidence) VALUES (?,?,?,?,?,?,?)').bind(s.preview.id, JSON.stringify(s.preview), JSON.stringify(s.details), s.details.sourceUrl, s.checkedAt||seedCheckedAt, 'listed', JSON.stringify(s.evidence))));
}
type Row = { id:string; public_json:string; detail_json:string; source_url:string; checked_at:string; state:'listed'|'review'|'expired'; evidence:string };
export function preview(row:Row, unlocked=false): TrialPreview {
  const p=JSON.parse(row.public_json);
  const day = new Date().toISOString().slice(0,10);
  let state = row.state;
  if (p.endDate && p.endDate < day) state='expired';
  if (state==='listed' && Date.now()-Date.parse(row.checked_at)>72*3600000) state='review';
  return {...p,checkedAt:row.checked_at,state,unlocked};
}
export async function listTrials(userId?:string) {
  await ensureSeeds(); const db=database();
  const rows=await db.prepare('SELECT * FROM trials ORDER BY id').all<Row>();
  const rights=userId ? await db.prepare('SELECT trial_id FROM entitlements WHERE user_id=?').bind(userId).all<{trial_id:string}>() : {results:[]};
  const ids=new Set(rights.results.map(r=>r.trial_id));
  return rows.results.map(row=>preview(row,ids.has(row.id)));
}
export async function findTrial(id:string) { await ensureSeeds(); return database().prepare('SELECT * FROM trials WHERE id=?').bind(id).first<Row>(); }
export async function entitled(userId:string,id:string) { return !!await database().prepare('SELECT trial_id FROM entitlements WHERE user_id=? AND trial_id=?').bind(userId,id).first(); }
export async function trialDetails(userId:string,id:string):Promise<TrialDetails|null> { if(!await entitled(userId,id))return null;const row=await findTrial(id);if(!row)return null;const details=JSON.parse(row.detail_json) as TrialDetails;details.requirements=details.requirements.map(value=>value.replace(/(?:Touchline|TOUCHLINE Radar)[’']s \$100/g,'TOUCHLINE Radar’s €20'));return details; }
export function noStoreJson(body:unknown,status=200) { return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}); }
export function sameOrigin(request:Request) { const origin=request.headers.get('origin'); return !!origin && origin===new URL(request.url).origin; }
export async function upsertProfile(user:{userId:string; email:string;displayName:string}) { await database().prepare('INSERT INTO profiles(user_id,email,name,created_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,name=excluded.name').bind(user.userId,user.email,user.displayName,new Date().toISOString()).run(); }
