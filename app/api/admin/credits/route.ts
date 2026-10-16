import {z} from 'zod';
import {adminContext,AdminAccessError} from '../../../../lib/admin';
import {grantCredits} from '../../../../lib/admin-operations';
import {json,sameOrigin,readJSON,Problem} from '../../../../lib/agent-server';
import {rateLimit} from '../../../../lib/security';
export async function POST(req:Request){try{
 sameOrigin(req);const {user}=await adminContext();
 if(!await rateLimit(req,'admin-credit-grant',30,3600,user.userId))return json({error:'Too many grant requests. Please try again later.'},429);
 return json(await grantCredits(await readJSON(req)));
}catch(e){if(e instanceof AdminAccessError)return json({error:'Administrator access required.'},e.status);if(e instanceof Problem)return json({error:e.message},e.status);if(e instanceof z.ZodError)return json({error:'Choose a customer, credit type, quantity and reason.'},400);console.error('admin_credit_grant_failed');return json({error:'The credit grant could not be completed.'},503);}}
