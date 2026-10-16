import {seo} from '../../lib/seo';
export const metadata=seo('Contact & Support | TOUCHLINE Radar','Contact TOUCHLINE Radar about accounts, agent contacts, player introductions, payments or refunds.','/contact');
import PolicyShell from '../policy-shell';
import ContactForm from './support-form';
import {setting} from '../../lib/store';
export const dynamic='force-dynamic';
export default function Contact(){const email=setting('SUPPORT_EMAIL');return <PolicyShell title="How can we help?"><p>Ask about agent contacts or introductions, report a payment problem or request a refund. Include the agent or agency name and PayPal reference if relevant. Never send passwords, card details or identification documents.</p>{email&&<p>Email us directly at <a href={'mailto:'+email}>{email}</a>, or record your request below.</p>}<ContactForm supportEmail={email}/></PolicyShell>}
