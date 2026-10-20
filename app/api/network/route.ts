import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {getAuthUser} from '../../../lib/auth';
import {database,noStoreJson,sameOrigin} from '../../../lib/store';
import {bodyText,rateLimit,RequestTooLarge} from '../../../lib/security';
import {profile,requireNetwork,saveNetworkProfile,reviews,writeReview,NetworkError} from '../../../lib/network-service';
import {readMessages,reply} from '../../../lib/community-service';
import {privateEntries,publicId} from '../../../lib/directory-catalog.server';
import {verificationReady,storeEvidence,readEvidence} from '../../../lib/verification-storage';
import {nodeRuntime} from '../../../lib/node-storage';
export const runtime='nodejs';
const listing=(id:string)=>{const r=privateEntries.find(r=>publicId(r.id)===id);if(!r)throw new NetworkError('Listing not found.',404);return r;};
async function handle(req:Request){
 try{
 const db=database(),u=await getAuthUser(),url=new URL(req.url),action=url.searchParams.get('action')||'home';
 if(action==='reviews'||action==='review')throw new NetworkError('Star reviews have been retired.',410);
 if(!u)return noStoreJson({error:'Sign in to use the network.'},401);
 if(req.method==='GET'){
 if(action==='home'){
 const me=await profile(db,u.userId);
 const verifications=await db.prepare('SELECT id,kind,status,created_at,reason FROM network_verifications WHERE user_id=? ORDER BY created_at DESC').bind(u.userId).all();
 const entitlement=await db.prepare('SELECT expires_at FROM network_entitlements WHERE user_id=?').bind(u.userId).first();
 return noStoreJson({me,members:[],threads:[],verifications:verifications.results,entitlement,verificationReady:verificationReady()});
 }
 if(action==='messages')return noStoreJson(await readMessages(db,u.userId,z.string().uuid().parse(url.searchParams.get('id')),z.coerce.number().int().min(0).parse(url.searchParams.get('after')||0)));
 if(action==='evidence'){const r=await db.prepare('SELECT photo_key,id_key FROM network_verifications WHERE id=? AND user_id=?').bind(url.searchParams.get('id')||'',u.userId).first<{photo_key:string;id_key:string}>();const key=url.searchParams.get('file')==='photo'?r?.photo_key:r?.id_key;if(!key)throw new NetworkError('File not found.',404);const bytes=await readEvidence(key);if(!bytes)throw new NetworkError('File not found.',404);return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="verification.jpg"'}});}
 throw new NetworkError('Not found.',404);
 }
 if(!sameOrigin(req))throw new NetworkError('Invalid request origin.',403);
 if(!await rateLimit(req,'network:'+action,action==='verification'?5:action==='message'?120:30,3600,u.userId))throw new NetworkError('Too many requests. Try again later.',429);
 const body=JSON.parse(await bodyText(req,action==='verification'?14500000:12000));
 if(action==='profile')return noStoreJson({me:await saveNetworkProfile(db,u.userId,body)});
 if(action==='review'){const r=listing(z.string().parse(body.id));await writeReview(db,u.userId,r.destinationKey,body);return noStoreJson(await reviews(db,r.destinationKey,u.userId));}
 if(action==='delete-review'){const r=listing(z.string().parse(body.id));await db.prepare('DELETE FROM network_reviews WHERE user_id=? AND destination=?').bind(u.userId,r.destinationKey).run();return noStoreJson({ok:true});}
 if(action==='thread')throw new NetworkError('Use an introduction from the community feed to start a conversation.',409);
 if(action==='message'){await reply(db,u.userId,z.string().uuid().parse(body.id),body.body);return noStoreJson({ok:true});}
 if(action==='block'){await requireNetwork(db,u.userId);const peer=z.string().max(100).parse(body.peer);await db.prepare('INSERT OR IGNORE INTO network_blocks(owner,target) VALUES (?,?)').bind(u.userId,peer).run();return noStoreJson({ok:true});}
 if(action==='report'){const v=z.object({kind:z.enum(['review','member','message']),target:z.string().min(1).max(100),reason:z.string().trim().min(10).max(1000)}).parse(body);await db.prepare('INSERT INTO network_reports(id,reporter,kind,target,reason,created_at) VALUES (?,?,?,?,?,?)').bind(randomUUID(),u.userId,v.kind,v.target,v.reason,new Date().toISOString()).run();return noStoreJson({ok:true});}
 if(action==='withdraw-verification'){
 const id=z.string().uuid().parse(body.id),r=await db.prepare("SELECT photo_key,id_key FROM network_verifications WHERE id=? AND user_id=? AND status='pending'").bind(id,u.userId).first<{photo_key:string|null;id_key:string|null}>();
 if(!r)throw new NetworkError('Pending request not found.',404);
 if(r.photo_key)await nodeRuntime.BUCKET.delete(r.photo_key);if(r.id_key)await nodeRuntime.BUCKET.delete(r.id_key);
 await db.prepare("UPDATE network_verifications SET status='withdrawn',evidence='',photo_key=NULL,id_key=NULL WHERE id=? AND user_id=? AND status='pending'").bind(id,u.userId).run();return noStoreJson({ok:true});
 }
 if(action==='verification'){
 await requireNetwork(db,u.userId);
 const v=z.object({kind:z.enum(['identity','official','guardian']),evidence:z.string().trim().min(20).max(2000),photo:z.string().max(7000000).optional(),document:z.string().max(7000000).optional(),consent:z.literal(true)}).parse(body);
 if(await db.prepare("SELECT id FROM network_verifications WHERE user_id=? AND kind=? AND status='pending'").bind(u.userId,v.kind).first())throw new NetworkError('This verification is already pending.',409);
 if(v.kind==='identity'&&(!v.photo||!v.document))throw new NetworkError('Upload a portrait and identification document.');
 if(v.kind==='guardian'&&!v.document)throw new NetworkError('Upload the signed guardian consent document as an image.');
 if((v.photo||v.document)&&!verificationReady())throw new NetworkError('Secure document uploads are not configured yet.',503);
 const id=randomUUID();let photoKey:string|null=null,idKey:string|null=null;
 try{if(v.photo)photoKey=await storeEvidence('verification/'+id+'/photo',v.photo);if(v.document)idKey=await storeEvidence('verification/'+id+'/document',v.document);await db.prepare('INSERT INTO network_verifications(id,user_id,kind,evidence,photo_key,id_key,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,u.userId,v.kind,v.evidence,photoKey,idKey,new Date().toISOString()).run();}catch(e){if(photoKey)await nodeRuntime.BUCKET.delete(photoKey);if(idKey)await nodeRuntime.BUCKET.delete(idKey);throw e;}
 return noStoreJson({ok:true});
 }
 throw new NetworkError('Not found.',404);
 }catch(e){if(e instanceof NetworkError)return noStoreJson({error:e.message},e.status);if(e instanceof z.ZodError)return noStoreJson({error:e.issues[0]?.message},400);if(e instanceof RequestTooLarge)return noStoreJson({error:'Upload too large.'},413);if(e instanceof SyntaxError)return noStoreJson({error:'Invalid JSON.'},400);console.error('network_request_failed',e instanceof Error?e.name:'unknown');return noStoreJson({error:'The request could not be completed.'},503);}
}
export const GET=handle;export const POST=handle;
