import {database,setting} from './store';
import {PRICE} from './product';
import {verifiedCapture,type LocalOrder,type PayPalOrder} from './paypal-validation';
import {PayPalProviderError} from './paypal-error';
export function paypalSandbox(){return setting('PAYPAL_MODE')==='sandbox';}
export function paypalBase(){return paypalSandbox()?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';}
export async function paypalRequest<T=any>(path:string,body?:unknown,requestId?:string):Promise<T>{
  if(!path.startsWith('/')||path.includes('..'))throw Error('Invalid provider request.');
  const credentials=setting('PAYPAL_CLIENT_ID')+':'+setting('PAYPAL_CLIENT_SECRET');
  if(!setting('PAYPAL_CLIENT_ID')||!setting('PAYPAL_CLIENT_SECRET'))throw Error('PayPal is not configured.');
  const tokenResponse=await fetch(paypalBase()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(credentials),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
  const token=await tokenResponse.json() as {access_token?:string};
  if(!tokenResponse.ok||!token.access_token)throw Error('Payment provider authentication failed.');
  const headers:Record<string,string>={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json','Prefer':'return=representation'};
  if(requestId)headers['PayPal-Request-Id']=requestId;
  const response=await fetch(paypalBase()+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const raw=await response.text();const result=raw?JSON.parse(raw):{};
  if(!response.ok){const issues=Array.isArray(result.details)?result.details.map((d:any)=>String(d.issue||'unknown')):[];console.error('paypal_provider_error',response.status,String(result.name||'unknown'),issues.join(','));throw new PayPalProviderError(response.status,issues);}
  return result as T;
}
export async function fulfillPayPal(paypal:PayPalOrder){
  const db=database();
  const local=await db.prepare("SELECT * FROM orders WHERE session_id=? AND provider='paypal'").bind(paypal.id).first<LocalOrder>();
  if(!local)throw Error('Purchase not found.');
  if(local.amount!==PRICE.minor||local.currency!==PRICE.currency)throw Error('Incorrect purchase price.');
  const capture=verifiedCapture(local,paypal,setting('PAYPAL_MERCHANT_ID'));
  await db.batch([
    db.prepare("UPDATE orders SET status='paid',payment_intent=? WHERE id=? AND status IN ('pending','paid','expired','failed') AND (payment_intent IS NULL OR payment_intent=?)").bind(capture.id,local.id,capture.id),
    db.prepare("INSERT OR IGNORE INTO entitlements(user_id,trial_id,order_id,purchased_at) SELECT user_id,trial_id,id,? FROM orders WHERE id=? AND status='paid' AND payment_intent=?").bind(new Date().toISOString(),local.id,capture.id),
  ]);
  if(!await db.prepare('SELECT trial_id FROM entitlements WHERE user_id=? AND trial_id=?').bind(local.user_id,local.trial_id).first())throw Error('Purchased access could not be saved.');
  return local;
}
export async function capturePayPal(local:LocalOrder){
  let order=await paypalRequest<PayPalOrder>('/v2/checkout/orders/'+encodeURIComponent(local.session_id));
  if(order.status==='APPROVED')order=await paypalRequest<PayPalOrder>('/v2/checkout/orders/'+encodeURIComponent(local.session_id)+'/capture',{},local.id+'-capture');
  if(order.status!=='COMPLETED')throw Error('Payment has not completed. No information has been unlocked.');
  return fulfillPayPal(order);
}
export async function verifyWebhook(req:Request,event:unknown){
  const fields=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
  if(!setting('PAYPAL_WEBHOOK_ID')||fields.some(key=>!req.headers.get(key)))return false;
  const result=await paypalRequest<{verification_status:string}>('/v1/notifications/verify-webhook-signature',{
    auth_algo:req.headers.get(fields[0]),cert_url:req.headers.get(fields[1]),transmission_id:req.headers.get(fields[2]),
    transmission_sig:req.headers.get(fields[3]),transmission_time:req.headers.get(fields[4]),
    webhook_id:setting('PAYPAL_WEBHOOK_ID'),webhook_event:event,
  });
  return result.verification_status==='SUCCESS';
}
