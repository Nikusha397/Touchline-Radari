import AuthForm from '../auth-form';
import {authReady} from '../../lib/product';
import {setting} from '../../lib/store';
export const dynamic='force-dynamic';
export const metadata={title:'Register free | TOUCHLINE Radar',robots:{index:false,follow:false}};
export default function Page(){return <AuthForm mode="signup" ready={authReady()} googleEnabled={setting('GOOGLE_AUTH_ENABLED')==='true'}/>;}
