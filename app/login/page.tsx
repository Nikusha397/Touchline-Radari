import AuthForm from '../auth-form';
import {authReady} from '../../lib/product';
import {setting} from '../../lib/store';
export const dynamic='force-dynamic';
export const metadata={title:'Sign in | TOUCHLINE Radar',robots:{index:false,follow:false}};
export default function Page(){return <AuthForm mode="login" ready={authReady()} googleEnabled={setting('GOOGLE_AUTH_ENABLED')==='true'}/>;}
