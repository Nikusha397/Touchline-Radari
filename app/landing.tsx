'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState, type FormEvent} from 'react';

export default function Landing({ready,notice}:{ready:boolean;notice?:string}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [showPassword,setShowPassword]=useState(false);

  async function signIn(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy||!ready)return;
    const form=new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const response=await fetch('/auth/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:form.get('email'),password:form.get('password'),next:'/'}),
        signal:AbortSignal.timeout(20000),
      });
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error||'Unable to sign in. Please try again.');
      router.refresh();
    } catch(cause) {
      setError(cause instanceof Error&&cause.name==='TimeoutError'
        ?'Sign-in took too long. Please try again.'
        :cause instanceof Error?cause.message:'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="landing-page">
    <a className="landing-skip" href="#landing-main">Skip to content</a>
    <header className="landing-header">
      <Link className="landing-brand" href="/" aria-label="Touchline Radar home">
        <span className="landing-mark" aria-hidden="true"><i/></span>
        <span>touchline<span className="landing-brand-detail">radar</span></span>
      </Link>

    </header>
    <main id="landing-main" className="landing-main">
      <section className="landing-introduction" aria-labelledby="landing-title">
        <h1 id="landing-title">Football brings us together.</h1>
        <p className="landing-lead">A place for players, agents and agencies to share news, find opportunities and start a conversation.</p>
        <div className="landing-context">
          <span className="landing-field" aria-hidden="true"><i/><b/></span>
          <div><h2>Your voice. Your privacy.</h2><p>Post under an anonymous handle. Connect privately through introductions.</p></div>
        </div>

      </section>
      <section className="landing-access" aria-labelledby="landing-signin">
        <div className="landing-card">
          <h2 id="landing-signin">Sign in to Touchline</h2>
          <p className="landing-card-intro">Keep up with your football network.</p>
          {notice&&<p className="landing-status" role="status">{notice==='check-email'?'Account created. Confirm your email, then return here to sign in.':notice==='confirmed'?'Email confirmed. Sign in to continue.':'Account created. Sign in to continue.'}</p>}
          <form onSubmit={signIn} aria-busy={busy}>
            <label htmlFor="landing-email">Email address</label>
            <input id="landing-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} aria-describedby={error?'landing-error':undefined}/>
            <label htmlFor="landing-password">Password</label>
            <div className="landing-password">
              <input id="landing-password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" required maxLength={128} disabled={busy} aria-describedby={error?'landing-error':undefined}/>
              <button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button>
            </div>
            {!ready&&<p className="landing-status" role="status">Sign-in is temporarily unavailable. Please try again later.</p>}
            {error&&<p className="landing-error" id="landing-error" role="alert">{error}</p>}
            <button className="landing-submit" disabled={busy||!ready}>{busy?'Signing in…':'Sign in'}</button>
          </form>
          <Link className="landing-forgot" href="/forgot-password">Forgot password?</Link>
          <div className="landing-register"><span>New to Touchline?</span><Link href="/signup">Create an account</Link></div>
        </div>
        <p className="landing-account-note">For players, agents and agency representatives.<br className="landing-desktop-break"/> Read our <Link href="/privacy">privacy policy</Link> before joining.</p>
      </section>
    </main>
    <footer className="landing-footer">
      <span>Touchline Radar</span>
      <nav aria-label="Policies">{[['terms','Terms'],['privacy','Privacy'],['refunds','Refunds'],['cookies','Cookies'],['data-request','Your data'],['accessibility','Accessibility'],['contact','Contact']].map(([path,label])=><Link key={path} href={'/'+path}>{label}</Link>)}</nav>
    </footer>
  </div>;
}
