import {agentPayPalEvent} from '../../../../lib/agent-payments';
import {bodyText,RequestTooLarge} from '../../../../lib/security';
import {database,noStoreJson} from '../../../../lib/store';
import {paypalRequest,fulfillPayPal,verifyWebhook,paypalBase} from '../../../../lib/paypal';
import type {PayPalOrder} from '../../../../lib/paypal-validation';
export async function POST(req:Request){
  try{
    const raw=await bodyText(req,65536);
    let event:any;try{event=JSON.parse(raw)}catch{return noStoreJson({error:'Invalid JSON.'},400)}
    if(typeof event.id!=='string'||event.id.length>100||typeof event.event_type!=='string')return noStoreJson({error:'Invalid event.'},400);
    if(!await verifyWebhook(req,event))return noStoreJson({error:'Invalid webhook signature.'},400);
    const db=database();
    if(await db.prepare('SELECT id FROM payment_events WHERE id=?').bind(event.id).first())return noStoreJson({received:true});
    const resource=event.resource||{};
    if(event.event_type==='CHECKOUT.ORDER.APPROVED'||event.event_type==='PAYMENT.CAPTURE.COMPLETED'){
      const id=event.event_type==='CHECKOUT.ORDER.APPROVED'?resource.id:resource.supplementary_data?.related_ids?.order_id;
      if(typeof id==='string'&&/^[A-Z0-9]{10,32}$/.test(id)){
        const local=await db.prepare("SELECT id,status FROM orders WHERE session_id=? AND provider='paypal'").bind(id).first<{id:string;status:string}>();
        if(local&&local.status!=='refunded'){
          const order=await paypalRequest<PayPalOrder>('/v2/checkout/orders/'+id);
          if(order.status==='COMPLETED')await fulfillPayPal(order);
        }
      }
    }else if(['PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED'].includes(event.event_type)){
      let captureId=event.event_type==='PAYMENT.CAPTURE.REVERSED'?resource.id:resource.supplementary_data?.related_ids?.capture_id;
      if(!captureId&&Array.isArray(resource.links)){
        const up=resource.links.find((link:any)=>link.rel==='up');
        if(up?.href){const url=new URL(up.href);const match=url.pathname.match(/^\/v2\/payments\/captures\/([A-Z0-9]{10,32})$/);const origins=paypalBase().includes('sandbox')?['https://api-m.sandbox.paypal.com','https://api.sandbox.paypal.com']:['https://api-m.paypal.com','https://api.paypal.com'];if(origins.includes(url.origin)&&match)captureId=match[1];}
      }
      if(typeof captureId==='string'&&/^[A-Z0-9]{10,32}$/.test(captureId)){
        const order=await db.prepare("SELECT id FROM orders WHERE payment_intent=? AND provider='paypal'").bind(captureId).first<{id:string}>();
        if(order){
          const capture=await paypalRequest<{status:string}>('/v2/payments/captures/'+captureId);
          // A verified reversal event revokes its known capture. Payments v2
          // does not define a REVERSED capture status.
          if(event.event_type==='PAYMENT.CAPTURE.REVERSED'||capture.status==='REFUNDED')await db.batch([
            db.prepare("UPDATE orders SET status='refunded' WHERE id=?").bind(order.id),
            db.prepare('DELETE FROM entitlements WHERE order_id=?').bind(order.id),
          ]);
        }
      }
    }
    await agentPayPalEvent(event);
    await db.prepare('INSERT OR IGNORE INTO payment_events(id,type,processed_at) VALUES (?,?,?)').bind(event.id,event.event_type,new Date().toISOString()).run();
    return noStoreJson({received:true});
  }catch(error){if(error instanceof RequestTooLarge)return noStoreJson({error:'Payload too large.'},413);console.error('paypal_webhook_failed',error instanceof Error?error.name:'unknown');return noStoreJson({error:'Retry webhook delivery.'},503);}
}
