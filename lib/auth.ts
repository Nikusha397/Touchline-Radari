import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setting } from './store';
import { authReady, safeNext } from './product';

export async function authClient() {
  if (!authReady()) throw Error('Account registration is opening soon.');
  const jar=await cookies();
  return createServerClient(setting('SUPABASE_URL'),setting('SUPABASE_PUBLISHABLE_KEY'),{
    cookieOptions:{path:'/',httpOnly:true,sameSite:'lax',secure:setting('SITE_ORIGIN').startsWith('https:')},
    cookies:{
      getAll:()=>jar.getAll(),
      setAll(values){for(const {name,value,options} of values){try{jar.set(name,value,options)}catch{/* Middleware persists refreshed cookies for server components. */}}},
    },
  });
}
export async function getAuthUser() {
  if (!authReady()) return null;
  try {
    const client=await authClient();
    // Remote verification also checks that the user still exists. Never trust getSession alone.
    const {data,error}=await client.auth.getUser();
    const user=data?.user;
    if(error||!user?.email)return null;
    return {userId:user.id,email:user.email,displayName:String(user.user_metadata?.full_name||user.email.split('@')[0]).slice(0,80)};
  } catch { return null; }
}
export async function requireAuthUser(next='/') {
  const user=await getAuthUser();
  if(!user)redirect('/login?next='+encodeURIComponent(safeNext(next)));
  return user;
}
