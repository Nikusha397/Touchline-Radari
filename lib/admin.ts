import {authClient,getAuthUser} from './auth';
import {db,entries} from './agent-server';
export class AdminAccessError extends Error { constructor(public status:number){super('Administrator access required.')} }
export async function isAdministrator(){
  try {const client=await authClient();const {data,error}=await client.rpc('touchline_is_admin');return !error&&data===true;} catch{return false;}
}
export async function adminContext(){
  const user=await getAuthUser();if(!user)throw new AdminAccessError(401);
  const client=await authClient();const {data,error}=await client.rpc('touchline_is_admin');
  if(error)throw Error('Administrator verification unavailable.');
  if(data!==true)throw new AdminAccessError(403);
  return {user,client};
}
export type AdminAccount={id:string;email:string;name:string;created_at:string;email_confirmed_at:string|null;last_sign_in_at:string|null;contactCredits:number;introductionCredits:number;introductions:number};
export type AdminOrder={id:string;email:string;bundle:number;purpose:string;amount:number;currency:string;status:string;created_at:string};
export type AdminIntroduction={id:string;email:string;recipient_name:string;status:string;created_at:string};
export type AdminAudit={id:string;email:string;details:string;created_at:string};
export type AdminData={accounts:AdminAccount[];total:number;registeredTotal:number;confirmedTotal:number;recentTotal:number;page:number;query:string;checkedAt:string;paidUsd:number;paidOrders:number;sent:number;pending:number;agencies:number;agents:number;orders:AdminOrder[];introductions:AdminIntroduction[];audit:AdminAudit[]};
export async function adminData(query='',page=1):Promise<AdminData>{
 const {client}=await adminContext();query=query.trim().slice(0,128);page=Math.max(1,Math.min(100000,Math.floor(page)||1));
 const {data,error}=await client.rpc('touchline_admin_accounts',{p_search:query,p_page:page});
 if(error||!data||!Array.isArray(data.accounts))throw Error('Account directory unavailable.');
 const database=db();
 const [totals,activity,orders,introductions,audit]=await Promise.all([
  database.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(amount),0) AS total FROM agent_orders WHERE status='paid' AND currency='USD'").first<{count:number;total:number}>(),
  database.prepare("SELECT COALESCE(SUM(status='sent'),0) AS sent,COALESCE(SUM(status='pending'),0) AS pending FROM agent_submissions").first<{sent:number;pending:number}>(),
  database.prepare('SELECT o.id,COALESCE(p.email,ap.email,\'\') AS email,o.bundle,o.purpose,o.amount,o.currency,o.status,o.created_at FROM agent_orders o LEFT JOIN profiles p ON p.user_id=o.user_id LEFT JOIN agent_profiles ap ON ap.user_id=o.user_id ORDER BY o.created_at DESC LIMIT 50').all<AdminOrder>(),
  database.prepare('SELECT s.id,COALESCE(p.email,ap.email,\'\') AS email,s.recipient_name,s.status,s.created_at FROM agent_submissions s LEFT JOIN profiles p ON p.user_id=s.user_id LEFT JOIN agent_profiles ap ON ap.user_id=s.user_id ORDER BY s.created_at DESC LIMIT 50').all<AdminIntroduction>(),
  database.prepare('SELECT a.id,COALESCE(p.email,ap.email,\'\') AS email,a.details,a.created_at FROM agent_admin_audit a LEFT JOIN profiles p ON p.user_id=a.target_id LEFT JOIN agent_profiles ap ON ap.user_id=a.target_id ORDER BY a.created_at DESC LIMIT 30').all<AdminAudit>(),
 ]);
 const ids=data.accounts.map((a:AdminAccount)=>a.id);const slots=ids.map(()=>'?').join(',');
 const [credits,submissions]=ids.length?await Promise.all([
  database.prepare(`SELECT user_id,COALESCE(SUM(CASE WHEN purpose='unlock' THEN delta ELSE 0 END),0) AS contacts,COALESCE(SUM(CASE WHEN purpose='introduction' THEN delta ELSE 0 END),0) AS introductions FROM agent_ledger WHERE user_id IN (${slots}) GROUP BY user_id`).bind(...ids).all<{user_id:string;contacts:number;introductions:number}>(),
  database.prepare(`SELECT user_id,COUNT(*) AS count FROM agent_submissions WHERE user_id IN (${slots}) AND status='sent' GROUP BY user_id`).bind(...ids).all<{user_id:string;count:number}>(),
 ]):[{results:[]},{results:[]}];
 const accounts=data.accounts.map((a:AdminAccount)=>{const credit=credits.results.find(c=>c.user_id===a.id);return {...a,contactCredits:credit?.contacts||0,introductionCredits:credit?.introductions||0,introductions:submissions.results.find(c=>c.user_id===a.id)?.count||0};});
 return {...data,accounts,page,query,checkedAt:new Date().toISOString(),paidUsd:totals?.total||0,paidOrders:totals?.count||0,sent:activity?.sent||0,pending:activity?.pending||0,agencies:entries.filter(x=>x.kind==='agency').length,agents:entries.filter(x=>x.kind==='agent').length,orders:orders.results,introductions:introductions.results,audit:audit.results};
}
