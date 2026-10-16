'use client';
import {useEffect,useRef,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
export default function Confirmation(){
  const started=useRef(false),[message,setMessage]=useState('Checking your PayPal payment…'),[busy,setBusy]=useState(true);
  async function confirm(){setBusy(true);setMessage('Checking your PayPal payment…');try{
    const orderId=new URLSearchParams(location.search).get('token');
    if(!orderId)throw Error('No PayPal order reference was provided. Visit your account or contact support.');
    const response=await fetch('/api/paypal/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId})});
    const data=await response.json() as {error?:string;confirmed?:boolean;trialId?:string};
    if(response.status===401){location.assign('/login?next='+encodeURIComponent(location.pathname+location.search));return;}
    if(!response.ok||!data.confirmed||!data.trialId)throw Error(data.error||'Payment has not been confirmed yet.');
    location.replace('/?payment=success');
  }catch(error){setMessage(error instanceof Error?error.message:'Confirmation is unavailable. Please try again.');setBusy(false);}}
  useEffect(()=>{if(!started.current){started.current=true;void confirm()}},[]);
  return <main className="status-page"><a className="status-brand" href="/">TOUCHLINE <span>Radar</span></a><div className="modal-symbol"><ShieldCheck size={28}/></div><h1>{busy?'Confirming your payment.':'Payment confirmation.'}</h1><p role="status">{message}</p>{!busy&&<button className="button button-lime" onClick={()=>void confirm()}>Retry confirmation</button>}<div className="status-links"><a href="/">Back to radar</a><a href="/contact">Contact support</a></div><p className="fine-print">Access is delivered only after a completed payment is verified. If you have already paid, do not pay again while confirmation is pending.</p></main>;
}
