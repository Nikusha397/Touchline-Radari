import {authClient} from '../../../lib/auth';
import {safeNext} from '../../../lib/product';
export async function GET(req:Request){
  const url=new URL(req.url),code=url.searchParams.get('code');
  if(code&&code.length<2048){try{const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error&&url.searchParams.get('registered')==='1'){const {error:signOutError}=await client.auth.signOut();if(signOutError)throw signOutError;return Response.redirect(new URL('/?notice=confirmed',url.origin),303);}if(!error)return Response.redirect(new URL(safeNext(url.searchParams.get('next')),url.origin),303);}catch{}}
  return Response.redirect(new URL('/login?notice=confirmation',url.origin),303);
}
