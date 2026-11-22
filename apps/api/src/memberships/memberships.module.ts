import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { MembershipIssuers } from './membership-issuers.js';
import { MembershipsController } from './memberships.controller.js';
import { MembershipsService } from './memberships.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [MembershipsController],
  providers: [MembershipIssuers, MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
