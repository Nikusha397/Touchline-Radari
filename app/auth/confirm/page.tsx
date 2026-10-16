import ConfirmForm from './confirm-form';
import {safeNext} from '../../../lib/product';
export const dynamic='force-dynamic';
export const metadata={title:'Confirm your email | TOUCHLINE Radar',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const token=typeof params.token_hash==='string'?params.token_hash:'';
  const type=params.type==='recovery'?'recovery':params.type==='email'?'email':null;
  return <ConfirmForm tokenHash={token} type={type} next={safeNext(params.next)}/>;
}
