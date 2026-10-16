import {seo} from '../../lib/seo';
import PolicyShell from '../policy-shell';
export const metadata=seo('Football Agent Contacts & Introductions FAQ | TOUCHLINE Radar','Answers about player profiles, agent contacts, introduction credits and payments.','/faq');
export const dynamic='force-dynamic';
export default function FAQ(){return <PolicyShell title="Your questions, answered.">{[
['Is registration free?','Yes. Register with Google or your email and a password. Email registration does not require a confirmation email.'],
['Do I need to complete my player profile before buying credits?','No. Once signed in, you can buy contact or introduction credits immediately and reveal purchased contacts. Complete and save your player profile before sending an introduction.'],
['What are contact unlocks?','The credit price shown on a listing reveals its name, email and any available phone. Contacts currently cost 1 credit. Overall and community reviews do not change this price. Revealed contacts remain available in your account.'],
['What is a player introduction?','TOUCHLINE Radar sends your saved player profile and all uploaded PDFs to a selected agent or agency. Each introduction costs $0.50 USD, using a separate introduction-credit balance. Replies go to your registered email.'],
['Can I send again to the same agency?','One successful introduction per player to each recorded agency destination is allowed. Associated agent records may share the same destination.'],
['How do contact bundles work?','Buy 5 credits for $2.50, 20 for $9, 50 for $20 or 100 for $35 USD. Larger contact bundles show savings of 10%, 20% or 30%. Introduction credits cost $0.50 each without a bundle discount.'],
['How are countries shown?','Agents are grouped by registration country and agencies by office country. These locations do not necessarily indicate nationality.'],
['Are contacts and licences guaranteed?','The directory uses source snapshots and technically checked published email addresses. An active inbox or current licence is not guaranteed. Check current licence status before arranging representation.'],
['Does an introduction guarantee a response?','No. Delivery, a response, representation and a contract are not guaranteed. Your profile is private until you choose to share it.'],
['Which payment methods are available?','PayPal checkout and a credit/debit card option handled by PayPal. Guest card availability depends on PayPal eligibility. There is no subscription.'],
['What if a payment or introduction fails?','A definite email-provider rejection returns your introduction credit. An uncertain delivery is investigated before retrying. If paid credits do not appear, contact support with the payment reference before paying again.'],
['Can I request a refund?','Contact support within 14 days of purchase. Unused credits, materially incorrect contact details and duplicate or missing credit delivery can be reviewed under the refund policy. Statutory rights remain unaffected.']
].map(([q,a])=><details className="faq-item" key={q}><summary>{q}</summary><p>{a}</p></details>)}</PolicyShell>}
