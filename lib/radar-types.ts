export type CountryCode = 'GB' | 'ES' | 'AU' | 'US';
export type TrialPreview = {
  id: string; country: CountryCode; city: string; title: string; category: string;
  ages: string; minAge: number | null; maxAge: number | null; gender: 'Boys' | 'Girls' | 'All players' | 'Not stated';
  dates: string; nextDate: string | null; endDate: string | null; deadline: string | null;
  international: 'Accepted' | 'Not stated'; organiserFee: string; level: string;
  checkedAt: string; state: 'listed' | 'review' | 'expired'; unlocked: boolean;
};
export type TrialDetails = { organiser: string; venue: string; applicationUrl: string; contact: string; description: string; requirements: string[]; sourceUrl: string; };
export const countries = [
  { code: 'GB' as const, name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', lat: 54, lon: -2, number: '826' },
  { code: 'ES' as const, name: 'Spain', flag: '🇪🇸', region: 'Europe', lat: 40, lon: -4, number: '724' },
  { code: 'AU' as const, name: 'Australia', flag: '🇦🇺', region: 'Oceania', lat: -25, lon: 134, number: '036' },
  { code: 'US' as const, name: 'United States', flag: '🇺🇸', region: 'North America', lat: 39, lon: -98, number: '840' },
];
