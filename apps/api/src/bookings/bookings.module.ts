import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { BookingFacade } from './booking.facade.js';
import { BookingsController } from './bookings.controller.js';
import { BookingCreators } from './creators/booking-creators.js';
import { GroupSessionCreator } from './creators/group-session.creator.js';
import { HallRentalCreator } from './creators/hall-rental.creator.js';
import { PersonalTrainingCreator } from './creators/personal-training.creator.js';
import { PricingService } from './pricing/pricing.service.js';
import { SessionCancellationListener } from './session-cancellation.listener.js';
import { BookingValidationChain } from './validation/booking-validation.chain.js';

@Module({
  imports: [PaymentsModule, LoyaltyModule],
  controllers: [BookingsController, AvailabilityController],
  providers: [
    HallRentalCreator,
    GroupSessionCreator,
    PersonalTrainingCreator,
    BookingCreators,
    BookingValidationChain,
    PricingService,
    BookingFacade,
    AvailabilityService,
    SessionCancellationListener,
  ],
  exports: [BookingFacade],
})
export class BookingsModule {}
