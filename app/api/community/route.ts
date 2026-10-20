import {createAgentCheckout} from '../../../lib/agent-payments';
import {requireNetwork} from '../../../lib/network-service';
import {chatEligible} from '../../../lib/network-policy';
import {z} from 'zod';
import {getAuthUser} from '../../../lib/auth';
import {database,noStoreJson,sameOrigin} from '../../../lib/store';
import {bodyText,rateLimit,RequestTooLarge} from '../../../lib/security';
import {NetworkError} from '../../../lib/network-service';
import {feed,comments,publishPost,addComment,removeContent,reportContent,introduce,inbox,readMessages,reply,markRead,blockMember,communitySession,revealIdentity} from '../../../lib/community-service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const id=z.string().uuid(),memberId=z.string().regex(/^[a-f0-9]{32}$/);
async function handle(req:Request){try{
 const u=await getAuthUser(),db=database(),url=new URL(req.url),action=url.searchParams.get('action')||'feed';
 if(!await rateLimit(req,'community-read',180,60,u?.userId))throw new NetworkError('Too many requests. Try again shortly.',429);
 if(req.method==='GET'){
  if(action==='feed'){const kind=z.enum(['','news','discussion','opportunity']).parse(url.searchParams.get('kind')||'');const before=z.union([z.literal(''),id]).parse(url.searchParams.get('before')||'');return noStoreJson(await feed(db,u?.userId,kind,before));}
  if(action==='comments')return noStoreJson(await comments(db,u?.userId||'',id.parse(url.searchParams.get('id')),z.union([z.literal(''),id]).parse(url.searchParams.get('before')||'')));
  if(action==='session')return noStoreJson(await communitySession(db,u?.userId));
  if(!u)throw new NetworkError('Sign in to open your inbox.',401);
  if(action==='inbox')return noStoreJson(await inbox(db,u.userId));
  if(action==='messages')return noStoreJson(await readMessages(db,u.userId,id.parse(url.searchParams.get('id')),z.coerce.number().int().nonnegative().parse(url.searchParams.get('after')||0)));
 }else{
  if(!u)throw new NetworkError('Sign in to continue.',401);
  if(!sameOrigin(req))throw new NetworkError('Invalid request origin.',403);
  if(!await rateLimit(req,'community:'+action,action==='read'?1200:action==='message'?120:action==='post'?10:30,3600,u.userId))throw new NetworkError('Please wait before trying again.',429);
  const b=z.object({}).passthrough().parse(JSON.parse(await bodyText(req,18000)));
  if(action==='credits'){if(!chatEligible(await requireNetwork(db,u.userId)))throw new NetworkError('Complete profile verification before purchasing credits.',403);return noStoreJson(await createAgentCheckout(u.userId,5,'introduction',url.origin,'paypal',true));}
  if(action==='post')return noStoreJson(await publishPost(db,u.userId,b),201);
  if(action==='comment')return noStoreJson(await addComment(db,u.userId,id.parse(b.id),b.body),201);
  if(action==='remove'){await removeContent(db,u.userId,z.enum(['post','comment']).parse(b.kind),id.parse(b.id));return noStoreJson({ok:true});}
  if(action==='report'){await reportContent(db,u.userId,z.enum(['post','comment','member','message']).parse(b.kind),z.string().min(1).max(100).parse(b.id),b.reason);return noStoreJson({ok:true});}
  if(action==='introduce')return noStoreJson(await introduce(db,u.userId,memberId.parse(b.peer),b.body));
  if(action==='message'){await reply(db,u.userId,id.parse(b.id),b.body);return noStoreJson({ok:true});}
  if(action==='reveal')return noStoreJson(await revealIdentity(db,u.userId,id.parse(b.id)));
  if(action==='read'){await markRead(db,u.userId,id.parse(b.id),z.number().int().nonnegative().parse(b.last));return noStoreJson({ok:true});}
  if(action==='block'){await blockMember(db,u.userId,memberId.parse(b.peer));return noStoreJson({ok:true});}
 }
 throw new NetworkError('Not found.',404);
}catch(e){if(e instanceof NetworkError)return noStoreJson({error:e.message},e.status);if(e instanceof z.ZodError)return noStoreJson({error:e.issues[0]?.message||'Invalid request.'},400);if(e instanceof RequestTooLarge)return noStoreJson({error:'Request too large.'},413);if(e instanceof SyntaxError)return noStoreJson({error:'Invalid JSON.'},400);console.error('community_request_failed',e instanceof Error?e.name:'unknown');return noStoreJson({error:'Could not complete this request. Please try again.'},503);}}
export const GET=handle;
export const POST=handle;
