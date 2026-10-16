import {getAuthUser} from '../../../../lib/auth';
import {database,noStoreJson,sameOrigin} from '../../../../lib/store';
import {capturePayPal} from '../../../../lib/paypal';
import type {LocalOrder} from '../../../../lib/paypal-validation';
import {rateLimit} from '../../../../lib/security';
export async function POST(req:Request){try{
  if(!sameOrigin(req))return noStoreJson({error:'Invalid request origin.'},403);
  const user=await getAuthUser();if(!user)return noStoreJson({error:'Sign in to confirm this purchase.'},401);
  if(!await rateLimit(req,'capture',40,3600,user.userId))return noStoreJson({error:'Too many requests. Please try again later.'},429);
  const text=await req.text();if(text.length>2048)return noStoreJson({error:'Request too large.'},413);
  const {orderId}=JSON.parse(text);
  if(typeof orderId!=='string'||! /^[A-Z0-9]{10,32}$/.test(orderId))return noStoreJson({error:'Invalid PayPal order reference.'},400);
  const order=await database().prepare("SELECT * FROM orders WHERE session_id=? AND user_id=? AND provider='paypal'").bind(orderId,user.userId).first<LocalOrder>();
  if(!order)return noStoreJson({error:'This purchase does not belong to your account.'},404);
  if(order.status==='refunded')return noStoreJson({error:'This payment has been refunded.'},409);
  await capturePayPal(order);return noStoreJson({confirmed:true,trialId:order.trial_id});
}catch(e){console.error('paypal_confirmation_failed',e instanceof Error?e.name:'unknown');return noStoreJson({error:'Payment is not confirmed yet. If PayPal shows a completed payment, retry confirmation or contact support. Do not pay again.'},409);}}
