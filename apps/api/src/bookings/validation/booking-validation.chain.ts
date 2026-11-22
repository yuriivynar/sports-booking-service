import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { BookingValidator, ValidationContext } from './booking-validator.js';
import {
  AvailabilityValidator,
  CapacityValidator,
  FutureStartValidator,
  MembershipValidator,
  NoDuplicateValidator,
  OpeningHoursValidator,
} from './validators.js';

/**
 * Assembles the chain once. Checks that need only memory come first, so a
 * request with a wrong time never reaches the database.
 */
@Injectable()
export class BookingValidationChain {
  private readonly head: BookingValidator;

  constructor(prisma: PrismaService) {
    this.head = new FutureStartValidator();
    this.head
      .setNext(new OpeningHoursValidator())
      .setNext(new CapacityValidator())
      .setNext(new MembershipValidator())
      .setNext(new AvailabilityValidator(prisma))
      .setNext(new NoDuplicateValidator(prisma));
  }

  validate(context: ValidationContext): Promise<void> {
    return this.head.validate(context);
  }
}
