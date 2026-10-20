'use client';

import {useEffect,useState} from 'react';

import {Eye,EyeOff,ShieldCheck} from 'lucide-react';

type Mode='login'|'signup'|'forgot'|'reset';

export default function AuthForm({mode,ready,googleEnabled=false}:{mode:Mode;ready:boolean;googleEnabled?:boolean}){

  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[show,setShow]=useState(false);

  const title={login:'Welcome back.',signup:'Your next move starts here.',forgot:'Reset your password.',reset:'Choose a new password.'}[mode];

  const [next,setNext]=useState('/');

  useEffect(()=>{const params=new URLSearchParams(location.search);setNext(params.get('next')||'/');if(params.get('notice')==='confirmation')setMessage('This sign-in or reset link could not be used. Sign in or request a new reset link.');},[]);

  async function send(action:string,payload:Record<string,unknown>){setBusy(true);setError('');setMessage('');try{const r=await fetch('/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,next})});const data=await r.json() as {error?:string;url?:string;message?:string};if(!r.ok)throw Error(data.error||'Please try again.');if(data.url){location.assign(data.url);return}setMessage(data.message||'Done.');}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false)}}

  function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);void send(mode,{email:form.get('email'),password:form.get('password'),name:form.get('name'),role:form.get('role'),dob:form.get('dob'),confirmPassword:form.get('confirmPassword'),consent:form.get('consent')==='on'});}

  return <div className="auth-page"><aside className="auth-brand"><a className="brand" href="/"><span className="brand-mark">T</span><span>TOUCHLINE <span className="brand-radar">Radar</span></span></a><div><div className="eyebrow">YOUR GAME. YOUR NEXT MOVE.</div><h2>The right people.<br/>Your next chapter.</h2><p>Your player profile, documents and connections, saved in one place.</p></div><span><ShieldCheck size={18}/>Your profile stays private until you choose to share it.</span></aside><main className="auth-main"><a className="back-link" href="/">Back to radar</a><div className="auth-card"><div className="eyebrow">{mode==='signup'?'FREE REGISTRATION':'YOUR TOUCHLINE ACCOUNT'}</div><h1>{title}</h1><p>{mode==='signup'?'Join as a player, agent or agency. Registration starts at age 16.':mode==='login'?'Sign in with your email and password.':mode==='forgot'?'We’ll send a secure reset link to your registered email.':'Use at least 12 characters. A longer, unique password is best.'}</p>{!ready&&<div className="notice" role="status">Account registration is opening soon. Please return when sign-in is available.</div>}{googleEnabled&&(mode==='signup'||mode==='login')&&<><button className="google-button" type="button" disabled={busy||!ready} onClick={()=>void send('google',{consent:true,signup:mode==='signup'})}>Continue with Google</button><p className="google-consent">By continuing, you agree to our <a href="/terms">Terms</a> and acknowledge our <a href="/privacy">Privacy policy</a>.</p><div className="auth-divider">or use email</div></>}

    <form onSubmit={submit}>

      {mode==='signup'&&<><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={80}/></label><label>Your role<select name="role"><option value="player">Player</option><option value="agent">Agent</option><option value="agency">Agency representative</option></select></label><label>Your date of birth<input name="dob" type="date" required/></label><p>16–17: guardian consent must be approved before networking. Agency accounts require an adult representative.</p></>}

      {mode!=='reset'&&<label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>}

      {mode!=='forgot'&&<label>{mode==='reset'?'New password':'Password'}<div className="password-field"><input name="password" type={show?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}

      {(mode==='signup'||mode==='reset')&&<label>Confirm password<input name="confirmPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label>}
      {mode==='signup'&&<><label className="consent-row"><input name="consent" type="checkbox" required/><span>I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and have read the <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a>.</span></label></>}

      {error&&<p className="error-message" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}

      <button className="button button-lime full-width" disabled={busy||!ready}>{busy?'Please wait…':{login:'Sign in',signup:'Create free account',forgot:'Send reset link',reset:'Save new password'}[mode]}</button>

    </form>

    {mode==='login'&&<><a className="auth-link" href="/forgot-password">Forgot password?</a><p className="auth-switch">New to TOUCHLINE Radar? <a href={'/signup?next='+encodeURIComponent(next)}>Register free</a></p></>}

    {mode==='signup'&&<p className="auth-switch">Already registered? <a href={'/login?next='+encodeURIComponent(next)}>Sign in</a></p>}

    {(mode==='forgot'||mode==='reset')&&<a className="auth-link" href="/login">Back to sign in</a>}

    <nav className="legal-links" aria-label="Policies"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/refunds">Refunds</a><a href="/contact">Support</a></nav>

  </div></main></div>;

}

