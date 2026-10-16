import assert from 'node:assert/strict';
import {test} from 'node:test';
import {approvalUrl,verifiedCapture} from '../lib/paypal-validation.ts';
const local={id:'purchase-1',user_id:'user-1',trial_id:'TR-001',session_id:'ORDER123456789',provider:'paypal',amount:2000,currency:'EUR',status:'pending',payment_intent:null};
const valid={id:local.session_id,status:'COMPLETED',purchase_units:[{custom_id:local.id,invoice_id:local.id,payee:{merchant_id:'MERCHANT'},amount:{currency_code:'EUR',value:'20.00'},payments:{captures:[{id:'CAPTURE123456789',status:'COMPLETED',amount:{currency_code:'EUR',value:'20.00'}}]}}]};
test('exact verified capture is accepted and repeat confirmation is idempotent',()=>{assert.equal(verifiedCapture(local,valid,'MERCHANT').id,'CAPTURE123456789');assert.equal(verifiedCapture({...local,status:'paid',payment_intent:'CAPTURE123456789'},valid,'MERCHANT').id,'CAPTURE123456789')});
const changes={
 'pending payment':o=>o.status='APPROVED',
 'different provider order':o=>o.id='OTHER123456789',
 'wrong purchase reference':o=>o.purchase_units[0].custom_id='purchase-other',
 'wrong invoice':o=>o.purchase_units[0].invoice_id='purchase-other',
 'wrong merchant':o=>o.purchase_units[0].payee.merchant_id='ATTACKER',
 'wrong order amount':o=>o.purchase_units[0].amount.value='0.20',
 'wrong order currency':o=>o.purchase_units[0].amount.currency_code='USD',
 'wrong capture amount':o=>o.purchase_units[0].payments.captures[0].amount.value='19.99',
 'wrong capture currency':o=>o.purchase_units[0].payments.captures[0].amount.currency_code='USD',
 'pending capture':o=>o.purchase_units[0].payments.captures[0].status='PENDING',
 'multiple captures':o=>o.purchase_units[0].payments.captures.push(o.purchase_units[0].payments.captures[0]),
 'multiple purchase units':o=>o.purchase_units.push(o.purchase_units[0]),
};
for(const [name,change] of Object.entries(changes))test(name+' cannot unlock',()=>{const order=structuredClone(valid);change(order);assert.throws(()=>verifiedCapture(local,order,'MERCHANT'))});
test('refunded purchase cannot be restored by an old success event',()=>assert.throws(()=>verifiedCapture({...local,status:'refunded'},valid,'MERCHANT')));
test('different recorded capture cannot be replaced',()=>assert.throws(()=>verifiedCapture({...local,payment_intent:'OTHER'},valid,'MERCHANT')));
test('merchant configuration is required',()=>assert.throws(()=>verifiedCapture(local,valid,'')));
test('checkout links must use the matching PayPal environment',()=>{const order={id:'ID',status:'CREATED',links:[{rel:'payer-action',href:'https://www.paypal.com/checkoutnow?token=ORDER123456789'}]};assert.match(approvalUrl(order,false),/^https:\/\/www.paypal.com\//);assert.throws(()=>approvalUrl(order,true));for(const url of ['http://www.paypal.com/checkoutnow','https://www.paypal.com.evil.example/checkoutnow','https://evil.example/checkoutnow','https://www.paypal.com/other'])assert.throws(()=>approvalUrl({...order,links:[{rel:'approve',href:url}]},false))});
