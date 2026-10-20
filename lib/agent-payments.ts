import {db,Problem,now,balance,runtime} from './agent-server';
import {bundles,introductionBundles,type CreditPurpose} from './agent-product';
import {setting} from './store';
import {purchasesReady} from './product';
import {paypalRequest} from './paypal';
import {approvalUrl,type PayPalOrder} from './paypal-validation';
import {PayPalProviderError} from './paypal-error';
export function agentPaymentsReady(){return purchasesReady();}
function minor(v:string){if(!/^\d{1,10}\.\d{2}$/.test(v))throw new Problem(400,'Invalid payment amount.');const [a,b]=v.split('.');return Number(a)*100+Number(b);}
export async function createAgentCheckout(userId:string,credits:number,purpose:CreditPurpose,origin:string,method:'paypal'|'card'='paypal',network=false){
  if(!agentPaymentsReady())throw new Problem(503,'PayPal checkout is temporarily unavailable. No payment has been made.');
  if(!network&&purpose==='introduction'&&(!runtime.RESEND_API_KEY||!runtime.MAIL_FROM))throw new Problem(503,'Introduction purchases open when email delivery is connected. No payment has been made.');
  const plan=(purpose==='introduction'?introductionBundles:bundles).find(p=>p.credits===credits);if(!plan)throw new Problem(400,'Choose an available bundle.');
  const id=crypto.randomUUID();await db().prepare("INSERT INTO agent_orders (id,user_id,bundle,purpose,amount,currency,status,created_at,capture_attempted_at) VALUES (?,?,?,?,?,'USD','pending',?,NULL)").bind(id,userId,credits,purpose,plan.cents,now()).run();
  const order=await paypalRequest<PayPalOrder>('/v2/checkout/orders',{intent:'CAPTURE',purchase_units:[{custom_id:id,invoice_id:id,description:`TOUCHLINE Radar: ${credits} ${purpose==='introduction'?'player introductions':'contact unlocks'}`,payee:{merchant_id:setting('PAYPAL_MERCHANT_ID')},amount:{currency_code:'USD',value:(plan.cents/100).toFixed(2)}}],payment_source:{paypal:{experience_context:{brand_name:'TOUCHLINE Radar',landing_page:method==='card'?'GUEST_CHECKOUT':'NO_PREFERENCE',shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:origin+'/directory?payment=paypal',cancel_url:origin+'/directory?payment=cancelled'}}}},id);
  await db().prepare('UPDATE agent_orders SET session_id=? WHERE id=?').bind(order.id,id).run();return {url:approvalUrl(order,false)};
}
export async function fulfillAgentPayPal(paypal:PayPalOrder){
  const local=await db().prepare('SELECT * FROM agent_orders WHERE session_id=?').bind(paypal.id).first<any>();if(!local)throw new Problem(404,'Purchase not found.');
  if(!['pending','paid','failed'].includes(local.status)||paypal.status!=='COMPLETED'||paypal.purchase_units?.length!==1)throw new Problem(400,'Payment is not a completed matching order.');
  const plan=(local.purpose==='introduction'?introductionBundles:bundles).find(p=>p.credits===local.bundle);if(!plan||local.amount!==plan.cents||local.currency!=='USD')throw new Problem(400,'Purchase price does not match.');
  const unit=paypal.purchase_units[0];const captures=unit.payments?.captures||[];const capture=captures[0];
  if(unit.custom_id!==local.id||unit.invoice_id!==local.id||!setting('PAYPAL_MERCHANT_ID')||unit.payee?.merchant_id!==setting('PAYPAL_MERCHANT_ID')||unit.amount?.currency_code!=='USD'||minor(unit.amount.value)!==local.amount||captures.length!==1||!capture?.id||capture.status!=='COMPLETED'||capture.amount.currency_code!=='USD'||minor(capture.amount.value)!==local.amount||(local.capture_id&&local.capture_id!==capture.id))throw new Problem(400,'Payment does not match this purchase and merchant.');
  await db().batch([
    db().prepare("UPDATE agent_orders SET status='paid',capture_id=? WHERE id=? AND status IN ('pending','paid','failed') AND (capture_id IS NULL OR capture_id=?)").bind(capture.id,local.id,capture.id),
    db().prepare("INSERT OR IGNORE INTO agent_ledger (id,user_id,delta,purpose,reason,created_at) SELECT ?,user_id,bundle,purpose,'PayPal purchase',? FROM agent_orders WHERE id=? AND status='paid' AND capture_id=?").bind('paypal:'+paypal.id,now(),local.id,capture.id),
  ]);return {purpose:local.purpose,credits:await balance(local.user_id,local.purpose)};
}
export async function captureAgentPayPal(userId:string,orderId:string,allowCollection=true){
  if(typeof orderId!=='string'||!/^[A-Z0-9]{10,32}$/.test(orderId))throw new Problem(400,'Invalid PayPal order.');
  const local=await db().prepare('SELECT id,status FROM agent_orders WHERE session_id=? AND user_id=?').bind(orderId,userId).first<{id:string;status:string}>();if(!local)throw new Problem(404,'Purchase not found.');
  if(local.status==='refunded')throw new Problem(409,'This purchase was refunded.');
  let order=await paypalRequest<PayPalOrder>('/v2/checkout/orders/'+orderId);
  if(order.status==='APPROVED'){
    if(!allowCollection)throw new Problem(409,'No completed payment was found. Checking status does not attempt another charge.');
    // Reserve durably BEFORE calling PayPal. Even concurrent callbacks, declines and timeouts cannot collect twice.
    const claim=await db().prepare("UPDATE agent_orders SET capture_attempted_at=? WHERE id=? AND status='pending' AND capture_attempted_at IS NULL").bind(now(),local.id).run();
    if(claim.meta.changes!==1)throw new Problem(409,'Collection will not be attempted again for this checkout. Check your PayPal activity before starting a new purchase.');
    try{
      order=await paypalRequest<PayPalOrder>('/v2/checkout/orders/'+orderId+'/capture',{},local.id+'-capture');
    }catch(error){
      if(error instanceof PayPalProviderError&&[400,402,403,404,422].includes(error.status)){
        await db().prepare("UPDATE agent_orders SET status='failed' WHERE id=? AND status='pending'").bind(local.id).run();
        throw new Problem(402,'PayPal declined this payment. We will not retry this checkout. No credits were added.');
      }
      throw new Problem(503,'Payment status is not confirmed. We will not retry collection. Check payment status or your PayPal activity before starting a new purchase.');
    }
  }
  if(order.status!=='COMPLETED')throw new Problem(409,'Payment is not completed. No credits were added and no further collection was attempted.');
  return fulfillAgentPayPal(order);
}
export async function agentPayPalEvent(event:any){
  const resource=event.resource||{};
  if(['CHECKOUT.ORDER.APPROVED','PAYMENT.CAPTURE.COMPLETED'].includes(event.event_type)){
    const id=event.event_type==='CHECKOUT.ORDER.APPROVED'?resource.id:resource.supplementary_data?.related_ids?.order_id;
    if(typeof id!=='string'||!/^[A-Z0-9]{10,32}$/.test(id))return;
    const local=await db().prepare("SELECT user_id,status FROM agent_orders WHERE session_id=?").bind(id).first<{user_id:string;status:string}>();
    if(local&&local.status!=='refunded'){
      // Webhooks may be redelivered for days. They may verify payment, never collect it.
      const order=await paypalRequest<PayPalOrder>('/v2/checkout/orders/'+id);
      if(order.status==='COMPLETED')await fulfillAgentPayPal(order);
    }
  }else if(['PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED'].includes(event.event_type)){
    let captureId=event.event_type==='PAYMENT.CAPTURE.REVERSED'?resource.id:resource.supplementary_data?.related_ids?.capture_id;
    if(!captureId&&Array.isArray(resource.links)){const up=resource.links.find((x:any)=>x.rel==='up');if(up?.href){const url=new URL(up.href);if(['https://api-m.paypal.com','https://api.paypal.com'].includes(url.origin))captureId=url.pathname.match(/^\/v2\/payments\/captures\/([A-Z0-9]{10,32})$/)?.[1]}}
    if(typeof captureId!=='string'||!/^[A-Z0-9]{10,32}$/.test(captureId))return;
    const order=await db().prepare('SELECT * FROM agent_orders WHERE capture_id=?').bind(captureId).first<any>();if(!order)return;
    const capture=await paypalRequest<{status:string}>('/v2/payments/captures/'+captureId);
    if(event.event_type==='PAYMENT.CAPTURE.REVERSED'||capture.status==='REFUNDED')await db().batch([
      db().prepare("INSERT OR IGNORE INTO agent_ledger (id,user_id,delta,purpose,reason,created_at) SELECT ?,user_id,-bundle,purpose,'PayPal refund or reversal',? FROM agent_orders WHERE id=? AND status='paid'").bind('paypal-refund:'+order.id,now(),order.id),
      db().prepare("UPDATE agent_orders SET status='refunded' WHERE id=?").bind(order.id),
    ]);
  }
}
