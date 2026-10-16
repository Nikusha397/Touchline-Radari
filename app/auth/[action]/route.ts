import {z} from 'zod';
import {authClient,getAuthUser} from '../../../lib/auth';
import {database,noStoreJson,sameOrigin,upsertProfile,setting} from '../../../lib/store';
import {POLICY_VERSION,safeNext,siteOrigin} from '../../../lib/product';
import {rateLimit,bodyText,RequestTooLarge} from '../../../lib/security';

const email=z.string().trim().email().max(254).transform(s=>s.toLowerCase());
const password=z.string().min(12,'Use at least 12 characters.').max(128);
export async function POST(req:Request,context:{params:Promise<{action:string}>}){
  if(!sameOrigin(req))return noStoreJson({error:'Invalid request origin.'},403);
  try{
    const {action}=await context.params;
    if(!['login','signup','forgot','reset','logout','google','verify'].includes(action))return noStoreJson({error:'Not found.'},404);
    if(!await rateLimit(req,'auth:'+action,action==='forgot'?5:30))return noStoreJson({error:'Too many attempts. Please try again later.'},429);
    const client=await authClient();
    if(action==='logout'){await client.auth.signOut();return Response.redirect(new URL('/',req.url),303);}
    const raw=await bodyText(req,8192);
    const body=raw?JSON.parse(raw):{};
    const next=safeNext(body.next);
    if(action==='verify'){
      const parsed=z.object({tokenHash:z.string().min(32).max(256).regex(/^[A-Za-z0-9_-]+$/),type:z.enum(['email','recovery'])}).parse(body);
      const {error}=await client.auth.verifyOtp({token_hash:parsed.tokenHash,type:parsed.type});
      if(error)return noStoreJson({error:'This link has expired or has already been used. Sign in or request a new link.'},400);
      const user=await getAuthUser();
      if(!user)return noStoreJson({error:'Your account could not be confirmed. Please request a new link.'},403);
      await upsertProfile(user);
      return noStoreJson({url:parsed.type==='recovery'?'/reset-password':next});
    }
    if(action==='google'){
      z.object({consent:z.literal(true)}).parse(body);
      if(setting('GOOGLE_AUTH_ENABLED')!=='true')return noStoreJson({error:'Google sign-in is not available.'},503);
      const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:siteOrigin()+'/auth/callback?next='+encodeURIComponent(next)}});
      if(error||!data.url)throw Error('Google sign-in could not be opened.');
      return noStoreJson({url:data.url});
    }
    if(action==='signup'){
      const parsed=z.object({email,password,name:z.string().trim().min(2).max(80),consent:z.literal(true)}).parse(body);
      const agreedAt=new Date().toISOString();
      const {data,error}=await client.auth.signUp({email:parsed.email,password:parsed.password,options:{emailRedirectTo:siteOrigin()+'/auth/callback?next='+encodeURIComponent(next),data:{full_name:parsed.name}}});
      if(error){console.error('auth_signup_provider_error',error.code);return noStoreJson({error:'Could not create the account. Try signing in if you already registered, or try again later.'},400);}
      if(data.user)await database().prepare('INSERT OR IGNORE INTO agreements(user_id,kind,version,agreed_at) VALUES (?,?,?,?)').bind(data.user.id,'signup',POLICY_VERSION,agreedAt).run();
      if(data.session){const user=await getAuthUser();if(!user)throw Error('Signup session could not be verified.');await upsertProfile(user);return noStoreJson({url:next});}
      return noStoreJson({message:'Your account is ready. Sign in with your email and password.'});
    }
    if(action==='login'){
      const parsed=z.object({email,password:z.string().min(1).max(128)}).parse(body);
      const {error}=await client.auth.signInWithPassword(parsed);
      if(error)return noStoreJson({error:'Sign-in failed. Check your email and password.'},400);
      const user=await getAuthUser();if(!user)return noStoreJson({error:'Your sign-in could not be verified. Please try again.'},403);
      await upsertProfile(user);return noStoreJson({url:next});
    }
    if(action==='forgot'){
      const address=email.parse(body.email);
      const {error}=await client.auth.resetPasswordForEmail(address,{redirectTo:siteOrigin()+'/auth/callback?next=/reset-password'});
      if(error)console.error('password_recovery_delivery_error',error.code);
      return noStoreJson({message:'If an account exists and email delivery is available, you’ll receive a password-reset link. Check your spam folder too.'});
    }
    if(!await getAuthUser())return noStoreJson({error:'Open a valid password-reset link or sign in first.'},401);
    const newPassword=password.parse(body.password);
    const {error}=await client.auth.updateUser({password:newPassword});
    if(error)return noStoreJson({error:'The password could not be updated. Request a new reset link and try again.'},400);
    return noStoreJson({message:'Password updated. You can continue to your account.',url:'/'});
  }catch(error){
    if(error instanceof RequestTooLarge)return noStoreJson({error:'Request too large.'},413);
    if(error instanceof z.ZodError)return noStoreJson({error:error.issues[0]?.message||'Check the form fields.'},400);
    console.error('auth_request_failed',error instanceof Error?error.name:'unknown');
    return noStoreJson({error:'Accounts are temporarily unavailable. Please try again later.'},503);
  }
}
