import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { BookingType, LoyaltyTier } from '../../generated/prisma/enums.js';

export class StatsQueryDto {
  @ApiPropertyOptional({ description: 'Days back from today; 30 when omitted', example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number;
}

export class StatsTotalsDto {
  @ApiProperty({ description: 'Successful payments minus refunds, in kopecks' })
  revenue: number;

  @ApiProperty({ description: 'Bookings made in the period that were not cancelled' })
  bookings: number;

  @ApiProperty({ description: 'Bookings made in the period and later cancelled' })
  cancelled: number;

  @ApiProperty({ description: 'Clients with at least one booking that was not cancelled' })
  activeClients: number;

  @ApiProperty({ description: 'Average paid amount of a booking, in kopecks' })
  averageCheck: number;
}

export class DailyStatDto {
  @ApiProperty({ example: '2026-11-22', description: 'Kyiv calendar day' })
  date: string;

  @ApiProperty()
  bookings: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty({ description: 'In kopecks' })
  revenue: number;
}

export class CenterOccupancyDto {
  @ApiProperty({ format: 'uuid' })
  centerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Places offered in group sessions' })
  capacity: number;

  @ApiProperty({ description: 'Places taken' })
  booked: number;

  @ApiProperty({ description: 'booked / capacity, from 0 to 1' })
  occupancy: number;
}

export class SportPopularityDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Group session bookings that were not cancelled' })
  bookings: number;
}

export class TierCountDto {
  @ApiProperty({ enum: LoyaltyTier, enumName: 'LoyaltyTier' })
  tier: LoyaltyTier;

  @ApiProperty()
  users: number;
}

export class BookingTypeCountDto {
  @ApiProperty({ enum: BookingType, enumName: 'BookingType' })
  type: BookingType;

  @ApiProperty()
  bookings: number;
}

export class AdminStatsDto {
  @ApiProperty({ example: '2026-10-24', description: 'First Kyiv day of the period' })
  from: string;

  @ApiProperty({ example: '2026-11-22', description: 'Last Kyiv day of the period (today)' })
  to: string;

  @ApiProperty({ type: StatsTotalsDto })
  totals: StatsTotalsDto;

  @ApiProperty({ type: [DailyStatDto], description: 'One entry per day, zeros included' })
  daily: DailyStatDto[];

  @ApiProperty({
    type: [CenterOccupancyDto],
    description: 'Group sessions of the period and the next 14 days',
  })
  centers: CenterOccupancyDto[];

  @ApiProperty({ type: [SportPopularityDto], description: 'Top sports by group bookings' })
  sports: SportPopularityDto[];

  @ApiProperty({ type: [TierCountDto], description: 'Clients by loyalty tier, now' })
  tiers: TierCountDto[];

  @ApiProperty({ type: [BookingTypeCountDto] })
  bookingTypes: BookingTypeCountDto[];
}
