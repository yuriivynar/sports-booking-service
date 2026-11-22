import { randomUUID } from 'node:crypto';

/**
 * Stand-in for a bank's SDK with its own conventions: snake_case fields,
 * expiry as "MM/YY", amounts in minor units and string result codes.
 * It is the Adaptee: our code never calls it directly.
 *
 * Test cards (any future expiry, any 3-digit CVC):
 *   4242 4242 4242 4242 — approved
 *   4000 0000 0000 0002 — declined by the bank
 *   4000 0000 0000 9995 — insufficient funds
 */
export interface AuthorizePayload {
  pan: string;
  exp: string;
  cvv: string;
  amount_minor: number;
  currency: 'UAH';
  merchant_reference: string;
}

export type DeclineCode =
  'invalid_number' | 'expired_card' | 'invalid_cvv' | 'card_declined' | 'insufficient_funds';

export interface AuthorizeResponse {
  transaction_id: string;
  result: 'APPROVED' | 'DECLINED';
  decline_code?: DeclineCode;
}

export const TEST_CARDS = {
  approved: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
} as const;

export class SimulatedAcquirer {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  async authorize(payload: AuthorizePayload): Promise<AuthorizeResponse> {
    const transaction_id = `sim_${randomUUID()}`;
    const decline = this.declineCode(payload);
    return decline
      ? { transaction_id, result: 'DECLINED', decline_code: decline }
      : { transaction_id, result: 'APPROVED' };
  }

  async reverse(transaction_id: string, amount_minor: number): Promise<{ result: 'REVERSED' }> {
    if (!transaction_id.startsWith('sim_') || amount_minor < 0) {
      throw new Error(`Unknown transaction ${transaction_id}`);
    }
    return { result: 'REVERSED' };
  }

  private declineCode({ pan, exp, cvv }: AuthorizePayload): DeclineCode | null {
    if (!/^\d{16}$/.test(pan) || !passesLuhn(pan)) return 'invalid_number';
    if (!/^\d{3}$/.test(cvv)) return 'invalid_cvv';
    if (this.isExpired(exp)) return 'expired_card';
    if (pan === TEST_CARDS.declined) return 'card_declined';
    if (pan === TEST_CARDS.insufficientFunds) return 'insufficient_funds';
    return null;
  }

  private isExpired(exp: string): boolean {
    const match = /^(\d{2})\/(\d{2})$/.exec(exp);
    if (!match) return true;
    const now = this.clock();
    const year = 2000 + Number(match[2]);
    const month = Number(match[1]);
    // A card is valid until the end of its expiry month.
    return year * 12 + month < now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
  }
}

/** The checksum every real card number satisfies. */
function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
