import {randomUUID} from 'node:crypto';
import {database,setting} from './store';
import {paypalRequest,paypalSandbox} from './paypal';
import {NetworkError,requireNetwork} from './network-service';
import {chatEligible} from './network-policy';
import {validSubscriptionPlan,verifiedPaidUntil,type ProviderPlan,type ProviderSubscription} from './subscription-policy';
type Local={id:string;user_id:string;provider_id:string;plan_id:string;status:string;paid_until:string|null;revoked_at:string|null};
export function subscriptionReady(){return setting('PAYMENTS_ENABLED')==='true'&&!!setting('PAYPAL_NETWORK_PLAN_ID')&&!!setting('PAYPAL_CLIENT_ID')&&!!setting('PAYPAL_CLIENT_SECRET')&&!!setting('PAYPAL_WEBHOOK_ID');}
export async function syncSubscription(local:Local){
 const remote=await paypalRequest<ProviderSubscription>('/v1/billing/subscriptions/'+encodeURIComponent(local.provider_id));
 const current=await database().prepare('SELECT * FROM network_subscriptions WHERE id=?').bind(local.id).first<Local>();if(!current)throw Error('Subscription missing.');
 const until=verifiedPaidUntil(remote,current);
 await database().prepare("UPDATE network_subscriptions SET status=?,paid_until=? WHERE id=? AND COALESCE(revoked_at,'')=COALESCE(?,'')").bind(remote.status,until,local.id,current.revoked_at).run();
 return {status:remote.status,paidUntil:until};
}
export async function subscriptionStatus(userId:string){const p=await requireNetwork(database(),userId);const latest=await database().prepare('SELECT * FROM network_subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1').bind(userId).first<Local>();return {role:p.role,ready:subscriptionReady(),eligible:chatEligible(p),subscription:latest?{id:latest.id,status:latest.status,paidUntil:latest.paid_until}:null};}
export async function startSubscription(userId:string,origin:string){
 const db=database(),p=await requireNetwork(db,userId);if(p.role==='player')throw new NetworkError('Players receive and reply for free. Identity reveals use introduction credits.');if(!chatEligible(p))throw new NetworkError('Complete professional verification before subscribing.',403);if(!subscriptionReady())throw new NetworkError('Subscription checkout is awaiting payment configuration. No charge was made.',503);
 const plan=setting('PAYPAL_NETWORK_PLAN_ID'),remote=await paypalRequest<ProviderPlan>('/v1/billing/plans/'+encodeURIComponent(plan));if(!validSubscriptionPlan(remote,plan))throw new NetworkError('The billing plan does not match $20 USD per month. Checkout is unavailable.',503);
 // One active or in-progress checkout per account, including concurrent requests.
 const id=randomUUID(),now=new Date().toISOString();
 const claim=await db.prepare("INSERT INTO network_subscriptions(id,user_id,plan_id,status,created_at) SELECT ?,?,?,'creating',? WHERE NOT EXISTS(SELECT 1 FROM network_subscriptions WHERE user_id=? AND status IN ('creating','pending','APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED'))").bind(id,userId,plan,now,userId).run();if(!claim.meta.changes)throw new NetworkError('You already have a subscription or pending checkout. Refresh its status or cancel it first.',409);
 const s=await paypalRequest<ProviderSubscription>('/v1/billing/subscriptions',{plan_id:plan,custom_id:id,application_context:{brand_name:'TOUCHLINE Radar',user_action:'SUBSCRIBE_NOW',shipping_preference:'NO_SHIPPING',return_url:origin+'/subscriptions?returned=1',cancel_url:origin+'/subscriptions?cancelled=1'}},id);
 if(!/^I-[A-Z0-9]+$/.test(s.id))throw new NetworkError('Invalid provider response.',503);
 await db.prepare('UPDATE network_subscriptions SET provider_id=?,status=? WHERE id=?').bind(s.id,s.status,id).run();
 const url=new URL(s.links?.find(l=>l.rel==='approve')?.href||'');if(url.protocol!=='https:'||url.hostname!==(paypalSandbox()?'www.sandbox.paypal.com':'www.paypal.com'))throw new NetworkError('Invalid payment link.',503);return {url:url.href};
}
export async function refreshSubscription(userId:string){const local=await database().prepare('SELECT * FROM network_subscriptions WHERE user_id=? AND provider_id IS NOT NULL ORDER BY created_at DESC LIMIT 1').bind(userId).first<Local>();if(!local)throw new NetworkError('No provider subscription found.',404);return syncSubscription(local);}
export async function cancelSubscription(userId:string){
 const db=database(),local=await db.prepare('SELECT * FROM network_subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1').bind(userId).first<Local>();if(!local)throw new NetworkError('No subscription found.',404);
 if(!local.provider_id)throw new NetworkError('Checkout status is uncertain. Contact support before starting another subscription.',409);
 const remote=await paypalRequest<ProviderSubscription>('/v1/billing/subscriptions/'+encodeURIComponent(local.provider_id));verifiedPaidUntil(remote,local);
 if(!['CANCELLED','EXPIRED'].includes(remote.status))await paypalRequest('/v1/billing/subscriptions/'+encodeURIComponent(local.provider_id)+'/cancel',{reason:'Cancelled by the account owner.'},local.id+'-cancel');
 return syncSubscription(local);
}
export async function networkSubscriptionEvent(event:{event_type:string;resource?:{id?:string;billing_agreement_id?:string}}){
 const resource=event.resource||{},id=event.event_type.startsWith('BILLING.SUBSCRIPTION.')?resource.id:resource.billing_agreement_id;
 if(!id||!/^I-[A-Z0-9]+$/.test(id))return;
 const db=database(),local=await db.prepare('SELECT * FROM network_subscriptions WHERE provider_id=?').bind(id).first<Local>();if(!local)return;
 if(['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(event.event_type)){
  await db.prepare("UPDATE network_subscriptions SET status='REVOKED',paid_until=NULL,revoked_at=? WHERE id=?").bind(new Date().toISOString(),local.id).run();return;
 }
 await syncSubscription(local);
}
