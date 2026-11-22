import type { CardDetails } from './payment-gateway.js';
import { SimulatedAcquirer, TEST_CARDS } from './simulated-acquirer.js';
import { SimulatedPaymentAdapter } from './simulated-payment.adapter.js';

const today = () => new Date('2026-11-23T10:00:00Z');
const card = (overrides: Partial<CardDetails> = {}): CardDetails => ({
  number: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2028,
  cvc: '123',
  holder: 'TARAS SHEVCHENKO',
  ...overrides,
});

describe('SimulatedPaymentAdapter (Adapter)', () => {
  const acquirer = new SimulatedAcquirer(today);
  const gateway = new SimulatedPaymentAdapter(acquirer);
  const charge = (overrides: Partial<CardDetails> = {}) =>
    gateway.charge({
      amount: 25_000,
      card: card(overrides),
      reference: 'pay-1',
      description: 'Йога',
    });

  it('approves the test card and keeps only the last four digits', async () => {
    const result = await charge();

    expect(result).toMatchObject({ ok: true, cardLast4: '4242' });
    expect(result.ok && result.providerRef).toMatch(/^sim_/);
  });

  it('translates the SDK request into its own format', async () => {
    const authorize = vi.spyOn(acquirer, 'authorize');
    await charge({ expMonth: 3, expYear: 2029 });

    expect(authorize).toHaveBeenCalledWith({
      pan: TEST_CARDS.approved,
      exp: '03/29',
      cvv: '123',
      amount_minor: 25_000,
      currency: 'UAH',
      merchant_reference: 'pay-1',
    });
  });

  it.each([
    [{ number: TEST_CARDS.declined }, 'Банк відхилив платіж'],
    [{ number: TEST_CARDS.insufficientFunds }, 'Недостатньо коштів на картці'],
    [{ number: '4242 4242 4242 4241' }, 'Невірний номер картки'],
    [{ expMonth: 10, expYear: 2026 }, 'Термін дії картки минув'],
    [{ cvc: '12' }, 'Невірний CVC-код'],
  ])('translates a decline code into a message: %o', async (overrides, reason) => {
    expect(await charge(overrides)).toEqual({ ok: false, reason });
  });

  it('accepts a card until the end of its expiry month', async () => {
    expect(await charge({ expMonth: 11, expYear: 2026 })).toMatchObject({ ok: true });
  });

  it('refunds through the SDK', async () => {
    const reverse = vi.spyOn(acquirer, 'reverse');
    await gateway.refund('sim_abc', 25_000);

    expect(reverse).toHaveBeenCalledWith('sim_abc', 25_000);
  });
});
