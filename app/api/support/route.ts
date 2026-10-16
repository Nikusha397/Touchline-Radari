import {z} from 'zod';
import {getAuthUser} from '../../../lib/auth';
import {database,noStoreJson,sameOrigin,setting} from '../../../lib/store';
import {rateLimit,constantEqual,bodyText,RequestTooLarge} from '../../../lib/security';
export async function POST(req:Request){try{
  if(!sameOrigin(req))return noStoreJson({error:'Invalid request origin.'},403);
  if(!await rateLimit(req,'support',5))return noStoreJson({error:'Too many requests. Please try again later.'},429);
  const raw=await bodyText(req,10000);
  const payload=z.object({email:z.string().trim().email().max(254),subject:z.enum(['Agent contacts or introductions','Payment or unlock','Refund request','Privacy or account','Other']),message:z.string().trim().min(20).max(4000),orderId:z.string().trim().max(100).optional(),website:z.string().max(0).optional(),consent:z.literal(true)}).parse(JSON.parse(raw));
  const user=await getAuthUser(),id=crypto.randomUUID();
  await database().prepare('INSERT INTO support_tickets(id,user_id,email,subject,message,order_id,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,user?.userId||null,payload.email.toLowerCase(),payload.subject,payload.message,payload.orderId||null,new Date().toISOString()).run();
  return noStoreJson({reference:id,message:'Your request has been recorded. Keep this reference for follow-up.'},201);
}catch(error){if(error instanceof RequestTooLarge)return noStoreJson({error:'Message too large.'},413);if(error instanceof z.ZodError)return noStoreJson({error:'Check your email, message and privacy consent.'},400);console.error('support_write_failed',error instanceof Error?error.name:'unknown');return noStoreJson({error:'Your request could not be saved. Please try again.'},503);}}
export async function GET(req:Request){const token=setting('RADAR_SERVICE_TOKEN');if(!token||!constantEqual(req.headers.get('X-Radar-Update-Token')||'',token))return noStoreJson({error:'Unauthorised.'},401);try{const tickets=await database().prepare("SELECT * FROM support_tickets WHERE status='open' ORDER BY created_at DESC LIMIT 100").all();return noStoreJson({tickets:tickets.results})}catch{return noStoreJson({error:'Could not load support requests.'},503)}}
