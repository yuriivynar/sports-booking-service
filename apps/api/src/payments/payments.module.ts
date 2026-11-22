import { Module } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway.js';
import { SimulatedAcquirer } from './simulated-acquirer.js';
import { SimulatedPaymentAdapter } from './simulated-payment.adapter.js';

/** Switching to a real provider means binding PaymentGateway to another adapter here. */
@Module({
  providers: [
    {
      provide: PaymentGateway,
      useFactory: () => new SimulatedPaymentAdapter(new SimulatedAcquirer()),
    },
  ],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
