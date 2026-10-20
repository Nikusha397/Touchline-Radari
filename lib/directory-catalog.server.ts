import { createHash } from 'node:crypto';
import directory from './directory.server.json';
import ratings from './directory-ratings.server.json';
import policy from './directory-pricing.json';
import { ratingQuote } from './rating-policy';
import type { Recipient } from './agent-product';

export const privateEntries = directory;
type DirectoryRecord = Omit<typeof directory[number], 'email' | 'phone'>;
// Internal source identifiers and destination keys are never serialized publicly.
export const publicId = (id: string) => createHash('sha256').update('touchline-directory-v1:'+id).digest('hex').slice(0,24);
export const publicDestination = (key: string) => createHash('sha256').update('touchline-destination-v1:'+key).digest('hex').slice(0,24);
export function quoteFor(record: DirectoryRecord) {
  return ratingQuote(record.id, (ratings as Record<string,unknown>)[record.id], policy);
}
export function projectRecipient(record: DirectoryRecord, identityUnlocked = false): Recipient {
  const id = publicId(record.id);
  const quote = quoteFor(record);
  return {
    id, kind: record.kind as Recipient['kind'],
    name: identityUnlocked ? record.name : (record.kind==='agency'?'Agency':'Agent')+' #'+id.slice(0,6).toUpperCase(),
    country: record.country, countryCode: record.countryCode,
    agency: identityUnlocked ? record.agency : '',
    status: record.status, licence: identityUnlocked ? record.licence : '', checked: record.checked,
    hasPhone: record.hasPhone, destinationKey: publicDestination(record.destinationKey),
    identityUnlocked, unlockCredits: quote.credits,
    overall: null,
    rating: quote.rating ? {
      score: quote.rating.score, reviewCount: quote.rating.reviewCount,
      sourceName: quote.rating.sourceName, checkedAt: quote.rating.checkedAt,
      sourceUrl: identityUnlocked ? quote.rating.sourceUrl : undefined,
    } : null,
  };
}
