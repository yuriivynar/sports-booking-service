import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { BookingType } from '../../generated/prisma/enums.js';
import { MAX_RENTAL_HOURS } from '../creators/hall-rental.creator.js';

/** Body of POST /api/bookings and POST /api/bookings/quote. */
export class CreateBookingDto {
  @ApiProperty({ enum: BookingType, enumName: 'BookingType' })
  @IsEnum(BookingType)
  type: BookingType;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required for HALL_RENTAL' })
  @ValidateIf((dto: CreateBookingDto) => dto.type === 'HALL_RENTAL')
  @IsUUID()
  hallId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required for PERSONAL_TRAINING' })
  @ValidateIf((dto: CreateBookingDto) => dto.type === 'PERSONAL_TRAINING')
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required for GROUP_SESSION' })
  @ValidateIf((dto: CreateBookingDto) => dto.type === 'GROUP_SESSION')
  @IsUUID()
  groupSessionId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Start of a hall rental or personal training, on the hour (Kyiv time)',
  })
  @ValidateIf((dto: CreateBookingDto) => dto.type !== 'GROUP_SESSION')
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_RENTAL_HOURS,
    description: 'Length of a hall rental; 1 hour when omitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RENTAL_HOURS)
  hours?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'Membership to pay for a group session' })
  @IsOptional()
  @IsUUID()
  membershipId?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Bonus points to spend; 1 point = 1 UAH' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsToRedeem?: number;
}

/** Card form of the simulated payment. The card is never stored. */
export class PayBookingDto {
  @ApiProperty({ example: '4242 4242 4242 4242' })
  @IsString()
  @Matches(/^[\d ]{12,23}$/, { message: 'Номер картки містить лише цифри' })
  cardNumber: string;

  @ApiProperty({ minimum: 1, maximum: 12, example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  expMonth: number;

  @ApiProperty({ example: 2028, description: 'Four-digit year' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  expYear: number;

  @ApiProperty({ example: '123' })
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVC — це 3 або 4 цифри' })
  cvc: string;

  @ApiProperty({ example: 'TARAS SHEVCHENKO' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  holder: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ maxLength: 200, example: 'Змінилися плани' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/** Query string of the availability endpoints. */
export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-11-24', description: 'Date in Kyiv, YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата у форматі YYYY-MM-DD' })
  date: string;
}
