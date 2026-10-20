import {getAuthUser} from '../../../lib/auth';
import {noStoreJson,sameOrigin} from '../../../lib/store';
import {rateLimit} from '../../../lib/security';
import {NetworkError} from '../../../lib/network-service';
import {subscriptionStatus,startSubscription,refreshSubscription,cancelSubscription} from '../../../lib/network-subscriptions';
export const runtime='nodejs';
async function handle(req:Request){try{const u=await getAuthUser();if(!u)return noStoreJson({error:'Sign in to manage your subscription.'},401);if(!await rateLimit(req,'subscriptions',30,3600,u.userId))throw new NetworkError('Please wait before trying again.',429);if(req.method==='GET')return noStoreJson(await subscriptionStatus(u.userId));if(!sameOrigin(req))throw new NetworkError('Invalid request origin.',403);const action=new URL(req.url).searchParams.get('action');if(action==='start')return noStoreJson(await startSubscription(u.userId,new URL(req.url).origin));if(action==='refresh')return noStoreJson(await refreshSubscription(u.userId));if(action==='cancel')return noStoreJson(await cancelSubscription(u.userId));throw new NetworkError('Not found.',404);}catch(e){if(e instanceof NetworkError)return noStoreJson({error:e.message},e.status);console.error('subscription_failed',e instanceof Error?e.name:'unknown');return noStoreJson({error:'Subscription status could not be confirmed. Please refresh before trying again.'},503);}}
export const GET=handle;export const POST=handle;
