import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, BookingType, LoyaltyTier } from '../../generated/prisma/enums.js';
import { CenterRefDto } from '../../catalog/dto/catalog.dto.js';
import { SportDto } from '../../catalog/dto/sport.dto.js';
import type { BookingAction } from '../state/booking-state.js';

const PRICE_LINE_KINDS = ['BASE', 'MEMBERSHIP', 'PROMOTION', 'LOYALTY', 'BONUS_POINTS'] as const;
const BOOKING_ACTIONS: BookingAction[] = ['pay', 'cancel'];

export class PriceLineDto {
  @ApiProperty({ enum: PRICE_LINE_KINDS, enumName: 'PriceLineKind' })
  kind: (typeof PRICE_LINE_KINDS)[number];

  @ApiProperty({ example: 'Акція «Зимовий старт»' })
  label: string;

  @ApiProperty({ description: 'Kopecks: positive for the base price, negative for reductions' })
  amount: number;
}

/** Money fields shared by a quote and a saved booking; all amounts in kopecks. */
class PriceFieldsDto {
  @ApiProperty()
  basePrice: number;

  @ApiProperty({ description: 'Money discounts' })
  discount: number;

  @ApiProperty({ description: 'Bonus points spent; 1 point = 1 UAH' })
  pointsRedeemed: number;

  @ApiProperty({ description: 'Amount to pay' })
  finalPrice: number;

  @ApiProperty({ description: 'Bonus points for paying finalPrice' })
  pointsEarned: number;

  @ApiProperty({ type: [PriceLineDto] })
  priceBreakdown: PriceLineDto[];
}

export class BookingQuoteDto extends PriceFieldsDto {
  @ApiProperty({ enum: BookingType, enumName: 'BookingType' })
  type: BookingType;

  @ApiProperty({ example: 'Йога для початківців' })
  title: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty({ enum: LoyaltyTier, enumName: 'LoyaltyTier' })
  loyaltyTier: LoyaltyTier;
}

export class BookingDto extends PriceFieldsDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: BookingType, enumName: 'BookingType' })
  type: BookingType;

  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' })
  status: BookingStatus;

  @ApiProperty({ example: 'Йога для початківців' })
  title: string;

  @ApiProperty({ type: String, nullable: true, example: 'Зала йоги' })
  hallName: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Олена Коваль' })
  trainerName: string | null;

  @ApiProperty({ type: SportDto, nullable: true })
  sport: SportDto | null;

  @ApiProperty({ type: CenterRefDto })
  center: CenterRefDto;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Pending bookings are released after this moment',
  })
  payBefore: Date | null;

  @ApiProperty({ type: String, nullable: true })
  cancelReason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ enum: BOOKING_ACTIONS, enumName: 'BookingAction', isArray: true })
  allowedActions: BookingAction[];
}

export class SlotDto {
  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty()
  available: boolean;
}

export class AvailabilityDto {
  @ApiProperty({ example: '2026-11-24' })
  date: string;

  @ApiProperty({ example: 7 })
  openHour: number;

  @ApiProperty({ example: 22 })
  closeHour: number;

  @ApiProperty({ description: 'Price of one hour, in kopecks' })
  pricePerHour: number;

  @ApiProperty({ type: [SlotDto] })
  slots: SlotDto[];
}
