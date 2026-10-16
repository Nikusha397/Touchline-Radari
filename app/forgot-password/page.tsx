import AuthForm from '../auth-form';
import {authReady} from '../../lib/product';
export const dynamic='force-dynamic';
export const metadata={title:'Reset password | TOUCHLINE Radar',robots:{index:false,follow:false}};
export default function Page(){return <AuthForm mode="forgot" ready={authReady()}/>;}
