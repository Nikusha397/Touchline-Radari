'use client';
import {useEffect} from 'react';
export default function PublicAnalytics(){useEffect(()=>{
 // Measure public discovery pages only. Never include authentication or payment URLs.
 const url=new URL(location.href);
 const allowed=url.origin==='https://touchlineradar.com'&&['/','/press','/faq'].includes(url.pathname);
 if(!allowed||[...url.searchParams.keys()].some(k=>!['utm_source','utm_medium','utm_campaign','utm_content'].includes(k))||url.hash||document.getElementById('public-analytics'))return;
 if(document.referrer){try{const ref=new URL(document.referrer);if(/\/(auth|account|checkout)(\/|$)/.test(ref.pathname)||[...ref.searchParams.keys()].some(k=>!['utm_source','utm_medium','utm_campaign','utm_content'].includes(k)))return;}catch{return;}}
 const script=document.createElement('script');script.id='public-analytics';script.type='module';script.src='https://static.cloudflareinsights.com/beacon.min.js';script.setAttribute('data-cf-beacon',JSON.stringify({token:'5a135a63c1024b8788c5f4de0ed13199',spa:false}));document.body.appendChild(script);
 },[]);return null;}
