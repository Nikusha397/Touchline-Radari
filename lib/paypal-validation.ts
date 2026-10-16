export type LocalOrder={id:string;user_id:string;trial_id:string;session_id:string;status:string;provider:string;amount:number;currency:string;payment_intent?:string|null};
export type PayPalOrder={id:string;status:string;purchase_units?:Array<{custom_id?:string;invoice_id?:string;payee?:{merchant_id?:string};amount?:{currency_code:string;value:string};payments?:{captures?:Array<{id:string;status:string;amount:{currency_code:string;value:string};final_capture?:boolean}>}}>;links?:Array<{rel:string;href:string}>};
function cents(value:string){if(!/^\d{1,10}\.\d{2}$/.test(value))throw Error('Invalid payment amount.');const [whole,fraction]=value.split('.');return Number(whole)*100+Number(fraction)}
export function verifiedCapture(local:LocalOrder,paypal:PayPalOrder,merchantId:string){
  if(local.provider!=='paypal'||!['pending','paid','expired','failed'].includes(local.status)||local.session_id!==paypal.id||paypal.status!=='COMPLETED')throw Error('Payment does not match a completed order.');
  const units=paypal.purchase_units||[];
  if(units.length!==1)throw Error('Invalid purchase unit count.');
  const unit=units[0];
  if(unit.custom_id!==local.id||unit.invoice_id!==local.id||!merchantId||unit.payee?.merchant_id!==merchantId)throw Error('Payment does not match this purchase or merchant.');
  if(!unit.amount||unit.amount.currency_code!==local.currency||cents(unit.amount.value)!==local.amount)throw Error('Order currency or amount mismatch.');
  const captures=unit.payments?.captures||[];
  if(captures.length!==1)throw Error('Invalid capture count.');
  const capture=captures[0];
  if(capture.status!=='COMPLETED'||capture.amount.currency_code!==local.currency||cents(capture.amount.value)!==local.amount||!capture.id)throw Error('Capture has not completed for the expected amount.');
  if(local.payment_intent&&local.payment_intent!==capture.id)throw Error('A different capture is already recorded.');
  return capture;
}
export function approvalUrl(order:PayPalOrder,sandbox:boolean){
  const link=order.links?.find(x=>x.rel==='payer-action'||x.rel==='approve')?.href;
  if(!link)throw Error('PayPal did not return a checkout link.');
  const url=new URL(link);
  if(url.origin!==(sandbox?'https://www.sandbox.paypal.com':'https://www.paypal.com')||url.username||url.password||!['/checkoutnow','/checkoutweb/signup'].includes(url.pathname))throw Error('Unexpected PayPal checkout destination.');
  return url.href;
}
