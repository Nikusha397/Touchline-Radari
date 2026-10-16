import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {setting} from './lib/store';
import {authReady} from './lib/product';

export async function middleware(request:NextRequest) {
  const path=request.nextUrl.pathname;
  if(['www.touchlineradar.com','touchline-trial-radar.bridgefmanagement.chatgpt.site','touchline-radar.bridgefmanagement.chatgpt.site'].includes(request.nextUrl.hostname) && setting('SITE_ORIGIN')==='https://touchlineradar.com') {
    const destination=new URL('https://touchlineradar.com');
    destination.pathname=request.nextUrl.pathname;
    destination.search=request.nextUrl.search;
    const redirect=NextResponse.redirect(destination,308);
    redirect.headers.set('Referrer-Policy','no-referrer');
    redirect.headers.set('Cache-Control','private, no-store');
    return redirect;
  }
  let response=NextResponse.next({request});
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Referrer-Policy',request.nextUrl.pathname.startsWith('/auth/')?'no-referrer':'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('X-Frame-Options','DENY');
  response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  if(request.nextUrl.protocol==='https:')response.headers.set('Strict-Transport-Security','max-age=31536000');
  if(/^\/(admin|account|auth|api|checkout|demo)(\/|$)/.test(path)||['/login','/signup','/forgot-password','/reset-password'].includes(path))response.headers.set('X-Robots-Tag','noindex, nofollow');
  // Retired discovery links lead to the current representation platform.
  if(/^\/(football-trials|trials|guides|demo)(\/|$)/.test(path))return NextResponse.redirect(new URL('/',request.url),308);
  if(!authReady())return response;
  const client=createServerClient(setting('SUPABASE_URL'),setting('SUPABASE_PUBLISHABLE_KEY'),{
    cookieOptions:{path:'/',httpOnly:true,sameSite:'lax',secure:setting('SITE_ORIGIN').startsWith('https:')},
    cookies:{getAll:()=>request.cookies.getAll(),setAll(values,headers){
      values.forEach(({name,value})=>request.cookies.set(name,value));
      const previous=response.headers;
      response=NextResponse.next({request});
      previous.forEach((value,key)=>response.headers.set(key,value));
      values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      if(headers)Object.entries(headers).forEach(([key,value])=>response.headers.set(key,value));
    }},
  });
  try { await client.auth.getUser(); } catch { /* Protected handlers independently require a verified identity. */ }
  return response;
}
export const config={matcher:['/','/admin/:path*','/football-trials/:path*','/trials/:path*','/guides/:path*','/account/:path*','/auth/:path*','/api/:path*','/login','/signup','/forgot-password','/reset-password','/checkout/:path*','/terms','/privacy','/refunds','/contact','/faq','/press','/football-agents/:path*','/how-to-find-a-football-agent','/find-a-football-club','/pricing','/demo/:path*']};
