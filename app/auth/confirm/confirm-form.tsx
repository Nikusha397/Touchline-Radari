'use client';
import {useState} from 'react';
export default function ConfirmForm({tokenHash,type,next}:{tokenHash:string;type:'email'|'recovery'|null;next:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const valid=!!type&&/^[A-Za-z0-9_-]{32,256}$/.test(tokenHash);
  async function confirm(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tokenHash,type,next})});
      const data=await response.json() as {error?:string;url?:string};
      if(!response.ok||!data.url)throw Error(data.error||'Please request a new link.');
      location.replace(data.url);
    }catch(e){setError(e instanceof Error?e.message:'Please try again.');setBusy(false)}
  }
  return <div className="auth-page"><aside className="auth-brand"><a className="brand" href="/"><span className="brand-mark">T</span><span>TOUCHLINE <span className="brand-radar">Radar</span></span></a><div><div className="eyebrow">YOUR TOUCHLINE ACCOUNT</div><h2>Your next move.<br/>One secure account.</h2></div></aside><main className="auth-main"><div className="auth-card"><div className="eyebrow">EMAIL VERIFICATION</div><h1>{type==='recovery'?'Reset your password.':'Confirm your email.'}</h1>{valid?<><p>{type==='recovery'?'Continue to choose your new password.':'Confirm your email to open your free TOUCHLINE Radar account.'}</p><button className="button button-lime full-width" disabled={busy} onClick={()=>void confirm()}>{busy?'Please wait…':type==='recovery'?'Continue to password reset':'Confirm email'}</button></>:<p className="error-message" role="alert">This link is incomplete. Open the full link from your email or request a new one.</p>}{error&&<p className="error-message" role="alert">{error}</p>}<p className="auth-switch"><a href={type==='recovery'?'/forgot-password':'/login'}>{type==='recovery'?'Request another reset link':'Back to sign in'}</a></p></div></main></div>;
}
