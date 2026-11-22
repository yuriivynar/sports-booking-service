import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { CardDetails } from '../payment-gateway.js';

/** Card form of the simulated payment. The card is never stored. */
export class CardPaymentDto {
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

export function toCardDetails(dto: CardPaymentDto): CardDetails {
  return {
    number: dto.cardNumber,
    expMonth: dto.expMonth,
    expYear: dto.expYear,
    cvc: dto.cvc,
    holder: dto.holder,
  };
}
