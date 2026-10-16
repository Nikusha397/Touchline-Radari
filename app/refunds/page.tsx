import {seo} from '../../lib/seo';
import PolicyShell from '../policy-shell';
export const metadata=seo('Refund Policy | TOUCHLINE Radar','Refund requests and payment support for contact credits and player introductions.','/refunds');
export const dynamic='force-dynamic';
export default function Refunds(){return <PolicyShell title="Refund policy.">
<h2>Player introductions and contact credits</h2><p>Introductions cost $0.50 USD each, separate from contact-credit purchases. A definite email-provider rejection returns the introduction credit automatically. An uncertain delivery is investigated before retrying to prevent duplicate messages. A delivered introduction does not guarantee a reply, representation or a contract.</p>
<h2>14 days to request a refund</h2><p>You may request a refund within 14 calendar days of purchase. Requests for unused credits, materially incorrect contact information, duplicate charges or missing paid credits are investigated. Immediate access does not waive statutory rights. Use the <a href="/contact?subject=Refund%20request">refund request form</a> and include your account email and PayPal reference. Do not include card details or passwords.</p>
<h2>Payment and access problems</h2><p>If a payment completes but credits do not appear, use the approved PayPal payment recovery control or contact support with the order reference before paying again. We will investigate and restore credits or refund as appropriate. Mandatory rights and remedies are unaffected.</p>
<h2>Processing</h2><p>We aim to respond within 3 business days. Approved refunds return through PayPal to the original payment method; bank processing times vary. Legally required refunds are made within the applicable deadline. Confirmed full refunds reverse the corresponding credits. Other purchases remain available.</p>
<h2>Earlier purchases and other charges</h2><p>For earlier purchases, the refund terms agreed at checkout continue to apply. Contact support with your receipt. TOUCHLINE Radar cannot refund charges paid directly to another organisation.</p>
</PolicyShell>}
