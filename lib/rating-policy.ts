export type VerifiedRating = {
  score: number;
  reviewCount: number;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  verified: boolean;
  entityId: string;
};
export type RatingPolicy = {
  unratedCredits: number;
  minimumReviews: number;
  maxAgeDays: number;
  tiers: { minimumRating: number; credits: number }[];
};
export function ratingQuote(entityId: string, input: unknown, policy: RatingPolicy, time = Date.now()) {
  if (!Number.isInteger(policy.unratedCredits) || policy.unratedCredits < 1 || policy.unratedCredits > 100 ||
      !Number.isInteger(policy.minimumReviews) || policy.minimumReviews < 1 ||
      !Number.isFinite(policy.maxAgeDays) || policy.maxAgeDays < 1 ||
      !policy.tiers.length || policy.tiers.some((t, i) => !Number.isFinite(t.minimumRating) || t.minimumRating < 0 || t.minimumRating > 5 || !Number.isInteger(t.credits) || t.credits < policy.unratedCredits || t.credits > 100 || (i > 0 && (t.minimumRating <= policy.tiers[i-1].minimumRating || t.credits < policy.tiers[i-1].credits)))) throw new Error('Invalid directory pricing configuration');
  const rating = input as VerifiedRating | undefined;
  const age = time - Date.parse(rating?.checkedAt || '');
  let validSource = false;
  try { validSource = new URL(rating?.sourceUrl || '').protocol === 'https:'; } catch { /* No verified source. */ }
  if (!rating || rating.entityId !== entityId || rating.verified !== true || !validSource || !rating.sourceName?.trim() ||
      !Number.isFinite(rating.score) || rating.score < 1 || rating.score > 5 ||
      !Number.isInteger(rating.reviewCount) || rating.reviewCount < policy.minimumReviews ||
      !Number.isFinite(age) || age < 0 || age > policy.maxAgeDays * 86400000) return { rating: null, credits: policy.unratedCredits };
  const tier = [...policy.tiers].reverse().find(t => rating.score >= t.minimumRating);
  return { rating, credits: tier?.credits ?? policy.unratedCredits };
}
