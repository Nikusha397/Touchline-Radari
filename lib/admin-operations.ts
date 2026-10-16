import {z} from 'zod';
import {adminContext} from './admin';
import {db,balance,now,Problem} from './agent-server';
const input=z.object({userId:z.string().uuid(),email:z.string().email().max(254),credits:z.number().int().min(1).max(1000),purpose:z.enum(['unlock','introduction']),reason:z.string().trim().min(5).max(200),requestId:z.string().uuid()}).strict();
export async function grantCredits(value:unknown){
  const {user,client}=await adminContext();const p=input.parse(value);
  const {data,error}=await client.rpc('touchline_admin_accounts',{p_search:p.email,p_page:1});
  if(error||!data?.accounts?.some((a:{id:string;email:string})=>a.id===p.userId&&a.email.toLowerCase()===p.email.toLowerCase()))throw new Problem(404,'Choose an existing customer account.');
  const id='admin-grant:'+p.requestId;const details=JSON.stringify({credits:p.credits,purpose:p.purpose,reason:p.reason});
  const prior=await db().prepare('SELECT user_id,delta,purpose FROM agent_ledger WHERE id=?').bind(id).first<{user_id:string;delta:number;purpose:string}>();
  if(prior&&(prior.user_id!==p.userId||prior.delta!==p.credits||prior.purpose!==p.purpose))throw new Problem(409,'This request reference was already used for a different grant.');
  await db().batch([
    db().prepare('INSERT OR IGNORE INTO agent_ledger(id,user_id,delta,purpose,reason,created_at) VALUES(?,?,?,?,?,?)').bind(id,p.userId,p.credits,p.purpose,'Owner credit grant: '+p.reason,now()),
    db().prepare("INSERT OR IGNORE INTO agent_admin_audit(id,actor_id,target_id,action,details,created_at) SELECT ?,?,?,'credit grant',?,? WHERE EXISTS(SELECT 1 FROM agent_ledger WHERE id=? AND user_id=? AND delta=? AND purpose=?)").bind(id,user.userId,p.userId,details,now(),id,p.userId,p.credits,p.purpose),
  ]);
  // Check concurrent retries with different payloads as well as the initial read.
  const stored=await db().prepare('SELECT user_id,delta,purpose FROM agent_ledger WHERE id=?').bind(id).first<{user_id:string;delta:number;purpose:string}>();
  if(!stored||stored.user_id!==p.userId||stored.delta!==p.credits||stored.purpose!==p.purpose)throw new Problem(409,'This request reference was already used for a different grant.');
  return {granted:true,balance:await balance(p.userId,p.purpose)};
}
