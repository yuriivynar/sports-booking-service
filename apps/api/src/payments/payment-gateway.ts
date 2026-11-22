/** Card data as the user types it. It is passed to the gateway and never stored. */
export interface CardDetails {
  number: string;
  expMonth: number;
  /** Four-digit year. */
  expYear: number;
  cvc: string;
  holder: string;
}

export interface ChargeRequest {
  /** Amount in kopecks. */
  amount: number;
  card: CardDetails;
  /** Our payment id; lets the provider recognise a repeated request. */
  reference: string;
  description: string;
}

export type ChargeResult =
  { ok: true; providerRef: string; cardLast4: string } | { ok: false; reason: string };

/**
 * Target interface of the Adapter pattern: what the booking code expects
 * from any payment provider. Nest uses this abstract class as the
 * injection token, so callers depend on the abstraction only.
 */
export abstract class PaymentGateway {
  /** Provider name saved with each payment, for example "simulated". */
  abstract readonly name: string;

  abstract charge(request: ChargeRequest): Promise<ChargeResult>;

  /** Returns money for a successful charge. */
  abstract refund(providerRef: string, amount: number): Promise<void>;
}
