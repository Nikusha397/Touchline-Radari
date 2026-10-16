export class PayPalProviderError extends Error {
  constructor(public status: number, public issues: string[]) {
    super('PayPal could not complete this request.');
    this.name = 'PayPalProviderError';
  }
}
