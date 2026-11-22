import { Injectable } from '@nestjs/common';
import type { BookingType } from '../../generated/prisma/client.js';
import type { BookingCreator } from './booking-creator.js';
import { GroupSessionCreator } from './group-session.creator.js';
import { HallRentalCreator } from './hall-rental.creator.js';
import { PersonalTrainingCreator } from './personal-training.creator.js';

/** Finds the creator for a booking type. Nest injects one instance of each. */
@Injectable()
export class BookingCreators {
  private readonly byType: Record<BookingType, BookingCreator>;

  constructor(
    hallRental: HallRentalCreator,
    groupSession: GroupSessionCreator,
    personalTraining: PersonalTrainingCreator,
  ) {
    this.byType = {
      HALL_RENTAL: hallRental,
      GROUP_SESSION: groupSession,
      PERSONAL_TRAINING: personalTraining,
    };
  }

  for(type: BookingType): BookingCreator {
    return this.byType[type];
  }
}
