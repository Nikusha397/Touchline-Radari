import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {adminContext,AdminAccessError} from '../../../../lib/admin';
import {database,noStoreJson,sameOrigin} from '../../../../lib/store';
import {bodyText,RequestTooLarge,rateLimit} from '../../../../lib/security';
import {readEvidence} from '../../../../lib/verification-storage';
import {nodeRuntime} from '../../../../lib/node-storage';
import {NetworkError} from '../../../../lib/network-service';
import {privateEntries,publicId} from '../../../../lib/directory-catalog.server';
export const runtime='nodejs';
async function handle(req:Request){try{
 const {user}=await adminContext(),db=database(),url=new URL(req.url);
 if(req.method==='GET'){
 if(url.searchParams.has('file')){const r=await db.prepare('SELECT photo_key,id_key FROM network_verifications WHERE id=?').bind(url.searchParams.get('id')||'').first<{photo_key:string;id_key:string}>();const key=url.searchParams.get('file')==='photo'?r?.photo_key:r?.id_key;if(!key)throw new NetworkError('File not found.',404);const bytes=await readEvidence(key);if(!bytes)throw new NetworkError('File not found.',404);await db.prepare('INSERT INTO network_audit VALUES (?,?,?,?,?,?)').bind(randomUUID(),user.userId,'document-read',url.searchParams.get('id')!,'Manual verification review',new Date().toISOString()).run();return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="verification.jpg"','X-Content-Type-Options':'nosniff'}});}
 return noStoreJson({requests:(await db.prepare("SELECT v.*,p.name,p.role,p.directory_id FROM network_verifications v JOIN network_profiles p ON p.user_id=v.user_id WHERE v.status='pending' ORDER BY v.created_at LIMIT 100").all()).results,reports:(await db.prepare('SELECT * FROM network_reports ORDER BY created_at DESC LIMIT 100').all()).results});
 }
 if(!sameOrigin(req))throw new NetworkError('Invalid request origin.',403);
 if(!await rateLimit(req,'network-admin',60,3600,user.userId))throw new NetworkError('Too many requests.',429);
 const b=JSON.parse(await bodyText(req,10000)),now=new Date().toISOString();
 if(b.action==='subscription'){const v=z.object({userId:z.string().uuid(),expiresAt:z.string().datetime(),reason:z.string().trim().min(10).max(500)}).parse(b);if(Date.parse(v.expiresAt)>Date.now()+366*86400000)throw new NetworkError('Maximum grant is one year.');if(!await db.prepare('SELECT user_id FROM network_profiles WHERE user_id=?').bind(v.userId).first())throw new NetworkError('Network account not found.',404);await db.batch([db.prepare('INSERT INTO network_entitlements(user_id,expires_at) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET expires_at=excluded.expires_at').bind(v.userId,v.expiresAt),db.prepare('INSERT INTO network_audit VALUES (?,?,?,?,?,?)').bind(randomUUID(),user.userId,'subscription',v.userId,v.reason,now)]);return noStoreJson({ok:true});}
 if(b.action==='moderate'){const v=z.object({id:z.string().uuid(),hidden:z.boolean(),reason:z.string().trim().min(10).max(500)}).parse(b);await db.batch([db.prepare('UPDATE network_reviews SET hidden=? WHERE id=?').bind(v.hidden?1:0,v.id),db.prepare('INSERT INTO network_audit VALUES (?,?,?,?,?,?)').bind(randomUUID(),user.userId,'review-moderation',v.id,v.reason,now)]);return noStoreJson({ok:true});}
 const v=z.object({id:z.string().uuid(),decision:z.enum(['approved','rejected']),reason:z.string().trim().min(20).max(1000),directoryId:z.string().optional(),checked:z.literal(true)}).parse(b);
 const r=await db.prepare("SELECT v.*,p.role FROM network_verifications v JOIN network_profiles p ON p.user_id=v.user_id WHERE v.id=? AND v.status='pending'").bind(v.id).first<{user_id:string;kind:'identity'|'official'|'guardian';role:string;photo_key:string|null;id_key:string|null}>();if(!r)throw new NetworkError('Pending request not found.',404);
 let destination:string|null=null;
 if(v.decision==='approved'&&r.kind==='official'&&v.directoryId){const d=privateEntries.find(d=>publicId(d.id)===v.directoryId&&d.kind===r.role);if(!d)throw new NetworkError('Listing ID and role do not match.');destination=d.destinationKey;}
 if(v.decision==='approved'&&r.kind==='identity'&&(!r.photo_key||!r.id_key))throw new NetworkError('Both identity images are required.');
 if(v.decision==='approved'&&r.kind==='guardian'&&!r.id_key)throw new NetworkError('Signed guardian consent is required.');
 const field={identity:'identity_status',official:'official_status',guardian:'guardian_status'}[r.kind];
 await db.batch([db.prepare(`UPDATE network_profiles SET ${field}=?,directory_id=COALESCE(?,directory_id) WHERE user_id=?`).bind(v.decision,destination,r.user_id),db.prepare('UPDATE network_verifications SET status=?,reviewed_by=?,reviewed_at=?,reason=? WHERE id=?').bind(v.decision,user.userId,now,v.reason,v.id),db.prepare('INSERT INTO network_audit VALUES (?,?,?,?,?,?)').bind(randomUUID(),user.userId,'verification-'+v.decision,v.id,v.reason,now)]);
 if(r.photo_key)await nodeRuntime.BUCKET.delete(r.photo_key);if(r.id_key)await nodeRuntime.BUCKET.delete(r.id_key);
 await db.prepare('UPDATE network_verifications SET photo_key=NULL,id_key=NULL,evidence=? WHERE id=?').bind('Evidence removed after review.',v.id).run();
 return noStoreJson({ok:true});
 }catch(e){if(e instanceof AdminAccessError||e instanceof NetworkError)return noStoreJson({error:e.message},e.status);if(e instanceof z.ZodError)return noStoreJson({error:e.issues[0]?.message},400);if(e instanceof RequestTooLarge)return noStoreJson({error:'Request too large.'},413);return noStoreJson({error:'Admin operation unavailable.'},503);}}
export const GET=handle;export const POST=handle;
