import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ratingQuote } from '../lib/rating-policy.ts';

const time=Date.parse('2026-10-16T12:00:00Z');
const policy={unratedCredits:1,minimumReviews:10,maxAgeDays:90,tiers:[{minimumRating:0,credits:1},{minimumRating:4,credits:2},{minimumRating:4.5,credits:3},{minimumRating:4.8,credits:4}]};
// Synthetic fixtures only; never imported by the application catalogue.
const fixture={entityId:'test',score:4.9,reviewCount:30,sourceName:'Test review source',sourceUrl:'https://example.com/reviews',checkedAt:'2026-10-15T12:00:00Z',verified:true};
test('only verified current matching reviews qualify for rating pricing',()=>{
  assert.equal(ratingQuote('test',fixture,policy,time).credits,4);
  for(const change of [{verified:false},{entityId:'other'},{score:6},{reviewCount:2},{sourceUrl:'javascript:alert(1)'},{checkedAt:'2025-01-01'},{checkedAt:'2027-01-01'},{sourceName:''}]) {
    assert.deepEqual(ratingQuote('test',{...fixture,...change},policy,time),{rating:null,credits:1});
  }
  assert.deepEqual(ratingQuote('test',undefined,policy,time),{rating:null,credits:1});
});
test('higher rating tiers never silently lower the configured price',()=>{
  for(const [score,credits] of [[3.9,1],[4,2],[4.5,3],[4.8,4]])assert.equal(ratingQuote('test',{...fixture,score},policy,time).credits,credits);
  assert.throws(()=>ratingQuote('test',fixture,{...policy,tiers:[{minimumRating:0,credits:3},{minimumRating:4,credits:2}]},time));
});
