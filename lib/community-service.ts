import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ApplicationDatabase} from './node-storage';
import {NetworkError,profile,requireNetwork} from './network-service';
import {chatEligible,guardianCleared} from './network-policy';

export const postSchema=z.object({kind:z.enum(['discussion','opportunity','news']),body:z.string().trim().min(10).max(4000),sourceUrl:z.string().max(1000).default('')}).superRefine((v,c)=>{
 if(v.kind==='news'&&!v.sourceUrl)c.addIssue({code:'custom',message:'News posts need a source link.'});
 if(v.sourceUrl){try{const u=new URL(v.sourceUrl);if(u.protocol!=='https:'||u.username||u.password)throw Error();}catch{c.addIssue({code:'custom',message:'Use a public HTTPS source link.'});}}
});
const textSchema=z.string().trim().min(1).max(4000);
const stamp=()=>new Date().toISOString();
export async function aliases(db:ApplicationDatabase){await db.prepare('INSERT OR IGNORE INTO network_aliases(user_id) SELECT user_id FROM network_profiles').run();}
export async function activeSubscription(db:ApplicationDatabase,id:string){return !!await db.prepare("SELECT user_id FROM network_entitlements WHERE user_id=? AND expires_at>? UNION ALL SELECT user_id FROM network_subscriptions WHERE user_id=? AND status IN ('ACTIVE','CANCELLED') AND paid_until>? LIMIT 1").bind(id,stamp(),id,stamp()).first();}
export async function introductionBalance(db:ApplicationDatabase,id:string){return (await db.prepare("SELECT COALESCE(SUM(delta),0) AS n FROM agent_ledger WHERE user_id=? AND purpose='introduction'").bind(id).first<{n:number}>())?.n||0;}
export async function publicAuthor(db:ApplicationDatabase,id:string){
 await aliases(db);const p=await db.prepare('SELECT a.public_id,p.role,p.official_status FROM network_profiles p JOIN network_aliases a ON a.user_id=p.user_id WHERE p.user_id=?').bind(id).first<{public_id:string;role:string;official_status:string}>();
 if(!p)throw new NetworkError('Member not found.',404);
 return {id:p.public_id,role:p.role,label:p.role.charAt(0).toUpperCase()+p.role.slice(1)+' #'+p.public_id.slice(0,6).toUpperCase(),verified:p.official_status==='approved'};
}
async function allowedPublisher(db:ApplicationDatabase,id:string){const p=await requireNetwork(db,id);if(!guardianCleared(p))throw new NetworkError('Guardian consent must be approved first.',403);return p;}
async function blocked(db:ApplicationDatabase,a:string,b:string){return !!await db.prepare('SELECT owner FROM network_blocks WHERE (owner=? AND target=?) OR (owner=? AND target=?)').bind(a,b,b,a).first();}
type PostRow={id:string;author:string;kind:string;body:string;source_url:string;created_at:string;comments:number};
export async function feed(db:ApplicationDatabase,viewer='',kind='',before=''){
 const rows=await db.prepare(`SELECT p.*,(SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.hidden=0) AS comments FROM community_posts p WHERE p.hidden=0 AND (?='' OR p.kind=?) AND (?='' OR p.rowid < COALESCE((SELECT rowid FROM community_posts WHERE id=?),0)) AND NOT EXISTS(SELECT 1 FROM network_blocks b WHERE (b.owner=? AND b.target=p.author) OR (b.owner=p.author AND b.target=?)) ORDER BY p.rowid DESC LIMIT 21`).bind(kind,kind,before,before,viewer,viewer).all<PostRow>();
 const items=[];
 for(const r of rows.results.slice(0,20)){const p=await profile(db,r.author);if(!p||!guardianCleared(p))continue;items.push({id:r.id,kind:r.kind,body:r.body,sourceUrl:r.source_url,createdAt:r.created_at,comments:r.comments,mine:r.author===viewer,author:await publicAuthor(db,r.author)});}
 return {items,next:rows.results.length>20?rows.results[19].id:null};
}
export async function publishPost(db:ApplicationDatabase,userId:string,input:unknown){await allowedPublisher(db,userId);const v=postSchema.parse(input),id=randomUUID();await db.prepare('INSERT INTO community_posts(id,author,kind,body,source_url,created_at) VALUES (?,?,?,?,?,?)').bind(id,userId,v.kind,v.body,v.sourceUrl,stamp()).run();return {id};}
async function visiblePost(db:ApplicationDatabase,userId:string,id:string){const p=await db.prepare('SELECT author FROM community_posts WHERE id=? AND hidden=0').bind(id).first<{author:string}>();if(!p||await blocked(db,userId,p.author))throw new NetworkError('Post not found.',404);const author=await profile(db,p.author);if(!author||!guardianCleared(author))throw new NetworkError('Post not found.',404);return p;}
export async function comments(db:ApplicationDatabase,viewer:string,id:string,before=''){
 await visiblePost(db,viewer,id);
 const rows=await db.prepare(`SELECT c.* FROM community_comments c WHERE c.post_id=? AND c.hidden=0 AND (?='' OR c.rowid<COALESCE((SELECT rowid FROM community_comments WHERE id=? AND post_id=?),0)) AND NOT EXISTS(SELECT 1 FROM network_blocks b WHERE (b.owner=? AND b.target=c.author) OR (b.owner=c.author AND b.target=?)) ORDER BY c.rowid DESC LIMIT 51`).bind(id,before,before,id,viewer,viewer).all<{id:string;author:string;body:string;created_at:string}>();
 const items=[];for(const r of rows.results.slice(0,50)){const p=await profile(db,r.author);if(p&&guardianCleared(p))items.push({id:r.id,body:r.body,createdAt:r.created_at,mine:r.author===viewer,author:await publicAuthor(db,r.author)});}
 return {items,next:rows.results.length>50?rows.results[49].id:null};
}
export async function addComment(db:ApplicationDatabase,userId:string,id:string,body:unknown){await allowedPublisher(db,userId);await visiblePost(db,userId,id);const text=textSchema.parse(body),key=randomUUID();await db.prepare('INSERT INTO community_comments(id,post_id,author,body,created_at) VALUES (?,?,?,?,?)').bind(key,id,userId,text,stamp()).run();return {id:key};}
export async function removeContent(db:ApplicationDatabase,userId:string,kind:'post'|'comment',id:string){const table=kind==='post'?'community_posts':'community_comments';const result=await db.prepare(`UPDATE ${table} SET hidden=1 WHERE id=? AND author=?`).bind(id,userId).run();if(!result.meta.changes)throw new NetworkError('Content not found.',404);}
export async function reportContent(db:ApplicationDatabase,userId:string,kind:'post'|'comment'|'member'|'message',id:string,reason:unknown){await allowedPublisher(db,userId);const text=z.string().trim().min(10).max(1000).parse(reason);await db.prepare('INSERT INTO network_reports VALUES (?,?,?,?,?,?)').bind(randomUUID(),userId,kind,id,text,stamp()).run();}
export async function resolveMember(db:ApplicationDatabase,publicId:string){await aliases(db);const r=await db.prepare('SELECT user_id FROM network_aliases WHERE public_id=?').bind(publicId).first<{user_id:string}>();if(!r)throw new NetworkError('Member not found.',404);return r.user_id;}
async function pair(db:ApplicationDatabase,userId:string,other:string){
 const a=await requireNetwork(db,userId),b=await requireNetwork(db,other);
 if(a.user_id===b.user_id||a.role===b.role)throw new NetworkError('Introductions are available between different roles.',403);
 if(!chatEligible(a)||!chatEligible(b))throw new NetworkError('Professional verification and any guardian consent must be approved first.',403);
 if(await blocked(db,userId,other))throw new NetworkError('This conversation is unavailable.',403);
 return {a,b};
}
export async function introduce(db:ApplicationDatabase,userId:string,publicId:string,body:unknown){
 const other=await resolveMember(db,publicId),{b}=await pair(db,userId,other),text=textSchema.parse(body);
 if(!b.listed)throw new NetworkError('This member is not accepting introductions.',403);
 const [a,c]=[userId,other].sort();
 // All credit and conversation writes are synchronous inside one SQLite transaction.
 const conn=db.connection;conn.exec('BEGIN IMMEDIATE');
 try{
  const existing=conn.prepare('SELECT id FROM network_threads WHERE member_a=? AND member_b=?').get(a,c) as {id:string}|undefined;
  if(existing){conn.exec('COMMIT');return {id:existing.id,created:false};}
  const credit=conn.prepare("SELECT COALESCE(SUM(delta),0) AS n FROM agent_ledger WHERE user_id=? AND purpose='introduction'").get(userId) as {n:number};
  if(credit.n<1)throw new NetworkError('You need one introduction credit.',402);
  const id=randomUUID(),charge='network:'+id,now=stamp();
  conn.prepare("INSERT INTO agent_ledger(id,user_id,delta,purpose,reason,created_at) VALUES (?,?,-1,'introduction','Network introduction',?)").run(charge,userId,now);
  conn.prepare('INSERT INTO network_threads(id,member_a,member_b,created_at) VALUES (?,?,?,?)').run(id,a,c,now);
  conn.prepare('INSERT INTO network_introductions VALUES (?,?,?,?,?)').run(id,userId,other,charge,now);
  conn.prepare('INSERT INTO network_messages(thread_id,sender,body,created_at) VALUES (?,?,?,?)').run(id,userId,text,now);
  conn.exec('COMMIT');return {id,created:true};
 }catch(e){conn.exec('ROLLBACK');throw e;}
}
type Thread={id:string;member_a:string;member_b:string;sender:string|null;recipient:string|null;created_at:string};
export async function conversationAccess(db:ApplicationDatabase,userId:string,id:string){
 const row=await db.prepare('SELECT t.*,i.sender,i.recipient FROM network_threads t LEFT JOIN network_introductions i ON i.thread_id=t.id WHERE t.id=? AND (t.member_a=? OR t.member_b=?)').bind(id,userId,userId).first<Thread>();
 if(!row)throw new NetworkError('Conversation not found.',404);
 const peer=row.member_a===userId?row.member_b:row.member_a;await pair(db,userId,peer);
 const subscribed=await activeSubscription(db,userId),outgoing=row.sender===userId;
 const player=(await requireNetwork(db,userId)).role==='player';
 return {row,peer,subscribed,outgoing,readable:player||outgoing||subscribed,readAll:player||subscribed,canReply:player||subscribed};
}
export async function inbox(db:ApplicationDatabase,userId:string){
 const me=await requireNetwork(db,userId),subscribed=await activeSubscription(db,userId);
 if(!guardianCleared(me))throw new NetworkError('Guardian consent must be approved first.',403);
 const rows=await db.prepare('SELECT t.*,i.sender,i.recipient FROM network_threads t LEFT JOIN network_introductions i ON i.thread_id=t.id WHERE t.member_a=? OR t.member_b=? ORDER BY t.created_at DESC LIMIT 200').bind(userId,userId).all<Thread>();
 const items=[];const lockedRoles:Record<string,number>={};let locked=0;
 for(const r of rows.results){const peer=r.member_a===userId?r.member_b:r.member_a;if(await blocked(db,userId,peer))continue;const p=await profile(db,peer);if(!p||!chatEligible(p)||!chatEligible(me))continue;
  const outgoing=r.sender===userId;
  if(me.role!=='player'&&!outgoing&&!subscribed){locked++;lockedRoles[p.role]=(lockedRoles[p.role]||0)+1;continue;}
  const unread=(await db.prepare('SELECT COUNT(*) AS n FROM network_messages WHERE thread_id=? AND sender<>? AND id>COALESCE((SELECT last_message FROM network_reads WHERE thread_id=? AND user_id=?),0)').bind(r.id,userId,r.id,userId).first<{n:number}>())?.n||0;
  // No real identity or auth identifier leaves this projection without a subscription.
  const identity=await revealedIdentity(db,userId,peer);
  items.push({id:r.id,peer:await publicAuthor(db,peer),name:identity?.name||null,email:identity?.email||null,outgoing,unread,createdAt:r.created_at,canReveal:me.role==='player'&&!identity});
 }
 return {items,locked,lockedRoles,subscribed,expiresAt:(await db.prepare('SELECT expires_at FROM network_entitlements WHERE user_id=?').bind(userId).first<{expires_at:string}>())?.expires_at||null};
}
export async function readMessages(db:ApplicationDatabase,userId:string,id:string,after=0){
 const access=await conversationAccess(db,userId,id);if(!access.readable)throw new NetworkError('Activate a subscription to read incoming introductions.',403);
 const rows=await db.prepare('SELECT id,sender,body,created_at FROM network_messages WHERE thread_id=? AND id>? AND (?=1 OR sender=?) ORDER BY id LIMIT 100').bind(id,after,access.readAll?1:0,userId).all<{id:number;sender:string;body:string;created_at:string}>();
 return {items:rows.results.map(r=>({id:r.id,mine:r.sender===userId,body:r.body,createdAt:r.created_at})),canReply:access.canReply,readAll:access.readAll};
}
export async function markRead(db:ApplicationDatabase,userId:string,id:string,last:number){const a=await conversationAccess(db,userId,id);if(!a.readable)throw new NetworkError('Subscription required.',403);const max=(await db.prepare('SELECT COALESCE(MAX(id),0) AS n FROM network_messages WHERE thread_id=? AND (?=1 OR sender=?)').bind(id,a.readAll?1:0,userId).first<{n:number}>())!.n;await db.prepare('INSERT INTO network_reads VALUES (?,?,?) ON CONFLICT(thread_id,user_id) DO UPDATE SET last_message=MAX(last_message,excluded.last_message)').bind(id,userId,Math.min(last,max)).run();}
export async function reply(db:ApplicationDatabase,userId:string,id:string,body:unknown){const a=await conversationAccess(db,userId,id);if(!a.canReply)throw new NetworkError('An active subscription is required to reply.',403);await db.prepare('INSERT INTO network_messages(thread_id,sender,body,created_at) VALUES (?,?,?,?)').bind(id,userId,textSchema.parse(body),stamp()).run();}
export async function blockMember(db:ApplicationDatabase,userId:string,publicId:string){await requireNetwork(db,userId);const other=await resolveMember(db,publicId);if(other===userId)throw new NetworkError('You cannot block yourself.');await db.prepare('INSERT OR IGNORE INTO network_blocks VALUES (?,?)').bind(userId,other).run();}
export async function communitySession(db:ApplicationDatabase,userId?:string){if(!userId)return {signedIn:false,me:null,credits:0};const me=await profile(db,userId);return {signedIn:true,me:me?{author:await publicAuthor(db,userId),canPost:guardianCleared(me),canIntroduce:chatEligible(me),listed:!!me.listed}:null,credits:await introductionBalance(db,userId)};}

export async function revealedIdentity(db:ApplicationDatabase,viewer:string,target:string){
 const me=await requireNetwork(db,viewer);
 const allowed=me.role==='player'?!!await db.prepare('SELECT viewer FROM network_identity_unlocks WHERE viewer=? AND target=?').bind(viewer,target).first():await activeSubscription(db,viewer);
 if(!allowed)return null;
 const p=await requireNetwork(db,target);
 const contact=await db.prepare('SELECT email FROM profiles WHERE user_id=?').bind(target).first<{email:string}>();
 return {name:p.name,email:contact?.email||null};
}
export async function revealIdentity(db:ApplicationDatabase,userId:string,threadId:string){
 const access=await conversationAccess(db,userId,threadId);
 if((await requireNetwork(db,userId)).role!=='player')throw new NetworkError('Professional accounts unlock identities through a subscription.',403);
 const conn=db.connection;conn.exec('BEGIN IMMEDIATE');
 try{
  if(!conn.prepare('SELECT viewer FROM network_identity_unlocks WHERE viewer=? AND target=?').get(userId,access.peer)){
   const credit=conn.prepare("SELECT COALESCE(SUM(delta),0) AS n FROM agent_ledger WHERE user_id=? AND purpose='introduction'").get(userId) as {n:number};
   if(credit.n<1)throw new NetworkError('You need one introduction credit to reveal this identity.',402);
   const charge='identity:'+randomUUID(),now=stamp();
   conn.prepare("INSERT INTO agent_ledger(id,user_id,delta,purpose,reason,created_at) VALUES (?,?,-1,'introduction','Network identity unlock',?)").run(charge,userId,now);
   conn.prepare('INSERT INTO network_identity_unlocks VALUES (?,?,?,?)').run(userId,access.peer,charge,now);
  }
  conn.exec('COMMIT');
 }catch(e){conn.exec('ROLLBACK');throw e;}
 return revealedIdentity(db,userId,access.peer);
}
