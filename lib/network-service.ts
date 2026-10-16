import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ApplicationDatabase} from './node-storage';
import {ageAt,chatEligible,guardianCleared,profileSchema,type NetworkProfile} from './network-policy';
export class NetworkError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status}}
export const profile=(db:ApplicationDatabase,id:string)=>db.prepare('SELECT * FROM network_profiles WHERE user_id=?').bind(id).first<NetworkProfile>();
export async function saveNetworkProfile(db:ApplicationDatabase,id:string,input:unknown){
 const p=profileSchema.parse(input),old=await profile(db,id);
 if(old&&(old.role!==p.role||old.dob!==p.dob||old.name!==p.name||old.evidence_url!==p.evidenceUrl))throw new NetworkError('Contact support to change your name, role, birth date or official evidence after registration.');
 await db.prepare(`INSERT INTO network_profiles(user_id,role,name,dob,country,bio,evidence_url,guardian_status,listed,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET country=excluded.country,bio=excluded.bio,listed=excluded.listed`).bind(id,p.role,p.name,p.dob,p.country,p.bio,p.evidenceUrl,ageAt(p.dob)<18?'pending':'not_required',p.listed?1:0,new Date().toISOString()).run();
 return profile(db,id);
}
export async function requireNetwork(db:ApplicationDatabase,id:string){const p=await profile(db,id);if(!p)throw new NetworkError('Complete your network profile first.',409);return p;}
export async function writeReview(db:ApplicationDatabase,userId:string,destination:string,input:unknown){
 const p=await requireNetwork(db,userId);if(!guardianCleared(p))throw new NetworkError('Guardian consent must be approved first.',403);
 const v=z.object({stars:z.number().int().min(1).max(5),comment:z.string().trim().min(10).max(2000),experience:z.literal(true)}).parse(input);
 if(!await db.prepare('SELECT id FROM agent_unlocks WHERE user_id=? AND recipient_id=?').bind(userId,destination).first())throw new NetworkError('Unlock this contact before reviewing it.',403);
 if(p.directory_id===destination)throw new NetworkError('You cannot review your own listing.',403);
 const now=new Date().toISOString();
 await db.prepare(`INSERT INTO network_reviews(id,user_id,destination,stars,comment,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,destination) DO UPDATE SET stars=excluded.stars,comment=excluded.comment,updated_at=excluded.updated_at`).bind(randomUUID(),userId,destination,v.stars,v.comment,now,now).run();
}
export async function reviews(db:ApplicationDatabase,destination:string,userId?:string){
 const summary=await db.prepare('SELECT COUNT(*) AS count,AVG(stars) AS average FROM network_reviews WHERE destination=? AND hidden=0').bind(destination).first();
 const {results}=await db.prepare(`SELECT r.id,r.stars,r.comment,r.updated_at,p.name AS author,p.identity_status AS identityStatus FROM network_reviews r JOIN network_profiles p ON p.user_id=r.user_id WHERE r.destination=? AND r.hidden=0 ORDER BY r.updated_at DESC LIMIT 50`).bind(destination).all();
 const mine=userId?await db.prepare('SELECT stars,comment,hidden FROM network_reviews WHERE user_id=? AND destination=?').bind(userId,destination).first():null;
 return {summary,items:results,mine};
}
async function pairAccess(db:ApplicationDatabase,userId:string,otherId:string){
 const a=await requireNetwork(db,userId),b=await requireNetwork(db,otherId);
 if(a.user_id===b.user_id||a.role===b.role)throw new NetworkError('Choose a member with a complementary role.',403);
 if(!chatEligible(a)||!chatEligible(b))throw new NetworkError('Official representation and any guardian consent must be approved before chatting.',403);
 if(await db.prepare('SELECT owner FROM network_blocks WHERE (owner=? AND target=?) OR (owner=? AND target=?)').bind(userId,otherId,otherId,userId).first())throw new NetworkError('This conversation is unavailable.',403);
 return {a,b};
}
export async function createThread(db:ApplicationDatabase,userId:string,otherId:string){
 const {b}=await pairAccess(db,userId,otherId);if(!b.listed)throw new NetworkError('This member is not accepting new conversations.',403);
 if(!await db.prepare('SELECT user_id FROM network_entitlements WHERE user_id=? AND expires_at>?').bind(userId,new Date().toISOString()).first())throw new NetworkError('An active chat subscription or trial is required. Pricing will be announced.',403);
 const [a,c]=[userId,otherId].sort();
 await db.prepare('INSERT OR IGNORE INTO network_threads(id,member_a,member_b,created_at) VALUES (?,?,?,?)').bind(randomUUID(),a,c,new Date().toISOString()).run();
 return db.prepare('SELECT id FROM network_threads WHERE member_a=? AND member_b=?').bind(a,c).first<{id:string}>();
}
export async function threadAccess(db:ApplicationDatabase,userId:string,id:string){
 const row=await db.prepare('SELECT * FROM network_threads WHERE id=? AND (member_a=? OR member_b=?)').bind(id,userId,userId).first<{member_a:string;member_b:string}>();
 if(!row)throw new NetworkError('Conversation not found.',404);
 await pairAccess(db,userId,row.member_a===userId?row.member_b:row.member_a);return row;
}
export async function sendMessage(db:ApplicationDatabase,userId:string,id:string,body:unknown){
 await threadAccess(db,userId,id);
 if(!await db.prepare('SELECT user_id FROM network_entitlements WHERE user_id=? AND expires_at>?').bind(userId,new Date().toISOString()).first())throw new NetworkError('Your chat subscription or trial is not active.',403);
 const text=z.string().trim().min(1).max(4000).parse(body);
 await db.prepare('INSERT INTO network_messages(thread_id,sender,body,created_at) VALUES (?,?,?,?)').bind(id,userId,text,new Date().toISOString()).run();
}
