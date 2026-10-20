export const SUBSCRIPTION_PRICE={amount:'20.00',currency:'USD',interval:'MONTH'} as const;
export type ProviderPlan={id:string;status:string;billing_cycles?:{tenure_type:string;total_cycles:number;frequency:{interval_unit:string;interval_count:number};pricing_scheme?:{fixed_price?:{value:string;currency_code:string}}}[];payment_preferences?:{setup_fee?:{value:string}};taxes?:{inclusive?:boolean;percentage?:string}};
export function validSubscriptionPlan(p:ProviderPlan,id:string){const cycles=p.billing_cycles||[],c=cycles[0];return p.id===id&&p.status==='ACTIVE'&&cycles.length===1&&c.tenure_type==='REGULAR'&&c.total_cycles===0&&c.frequency.interval_unit==='MONTH'&&c.frequency.interval_count===1&&c.pricing_scheme?.fixed_price?.currency_code==='USD'&&Number(c.pricing_scheme.fixed_price.value)===20&&Number(p.payment_preferences?.setup_fee?.value||0)===0&&(!Number(p.taxes?.percentage||0)||p.taxes?.inclusive===true);}
export type ProviderSubscription={id:string;plan_id:string;custom_id:string;status:string;billing_info?:{last_payment?:{time:string;amount:{value:string;currency_code:string}};next_billing_time?:string};links?:{rel:string;href:string}[]};
export function verifiedPaidUntil(s:ProviderSubscription,local:{id:string;plan_id:string;provider_id:string;revoked_at?:string|null},now=Date.now()){
 if(s.id!==local.provider_id||s.plan_id!==local.plan_id||s.custom_id!==local.id)throw Error('Subscription does not match this account.');
 if(!['ACTIVE','CANCELLED'].includes(s.status))return null;
 const p=s.billing_info?.last_payment;if(!p||p.amount.currency_code!=='USD'||Number(p.amount.value)!==20)return null;
 const time=Date.parse(p.time);if(!Number.isFinite(time)||time>now||local.revoked_at&&time<=Date.parse(local.revoked_at))return null;
 const d=new Date(time),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);const end=new Date(d);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);d.setUTCDate(Math.min(day,end.getUTCDate()));
 return +d>now?d.toISOString():null;
}
