import { PaymentGateway, type ChargeRequest, type ChargeResult } from './payment-gateway.js';
import type { DeclineCode, SimulatedAcquirer } from './simulated-acquirer.js';

const DECLINE_MESSAGES: Record<DeclineCode, string> = {
  invalid_number: 'Невірний номер картки',
  expired_card: 'Термін дії картки минув',
  invalid_cvv: 'Невірний CVC-код',
  card_declined: 'Банк відхилив платіж',
  insufficient_funds: 'Недостатньо коштів на картці',
};

/**
 * Adapter: makes the bank SDK (SimulatedAcquirer) look like our
 * PaymentGateway. It converts the card into the SDK's payload and the
 * SDK's result codes into messages for the user.
 */
export class SimulatedPaymentAdapter extends PaymentGateway {
  readonly name = 'simulated';

  constructor(private readonly acquirer: SimulatedAcquirer) {
    super();
  }

  async charge({ amount, card, reference }: ChargeRequest): Promise<ChargeResult> {
    const pan = card.number.replace(/\D/g, '');
    const response = await this.acquirer.authorize({
      pan,
      exp: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear % 100).padStart(2, '0')}`,
      cvv: card.cvc,
      amount_minor: amount,
      currency: 'UAH',
      merchant_reference: reference,
    });
    if (response.result === 'APPROVED') {
      return { ok: true, providerRef: response.transaction_id, cardLast4: pan.slice(-4) };
    }
    return { ok: false, reason: DECLINE_MESSAGES[response.decline_code ?? 'card_declined'] };
  }

  async refund(providerRef: string, amount: number): Promise<void> {
    await this.acquirer.reverse(providerRef, amount);
  }
}
