import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { HallRefDto, TrainerRefDto } from '../../catalog/dto/catalog.dto.js';

export class CreateSessionsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ format: 'uuid', description: 'A hall of the same center' })
  @IsUUID()
  hallId: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: "The section's trainer when omitted; null for none",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  trainerId?: string | null;

  @ApiProperty({ description: 'Start of the first session' })
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @ApiProperty({ example: 60, minimum: 30, maximum: 240 })
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes: number;

  @ApiPropertyOptional({ description: "The section's capacity when omitted" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 12,
    description: 'Repeat weekly at the same Kyiv time; 1 (a single session) when omitted',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  repeatWeeks?: number;
}

export class CancelSessionDto {
  @ApiProperty({ example: 'Тренер захворів', description: 'Shown to the users in the notice' })
  // Trimmed first, so "   " does not pass the length check as a reason.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;
}

export class SessionQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({ description: 'How many days ahead; 14 when omitted', maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}

class SectionRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

class CenterNameDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

export class AdminSessionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  bookedCount: number;

  @ApiProperty()
  isCancelled: boolean;

  @ApiProperty({ type: SectionRefDto })
  section: SectionRefDto;

  @ApiProperty({ type: CenterNameDto })
  center: CenterNameDto;

  @ApiProperty({ type: HallRefDto })
  hall: HallRefDto;

  @ApiProperty({ type: TrainerRefDto, nullable: true })
  trainer: TrainerRefDto | null;

  @ApiProperty({ description: 'Pending and confirmed bookings' })
  activeBookings: number;
}

export class CancelSessionResultDto {
  @ApiProperty({ type: AdminSessionDto })
  session: AdminSessionDto;

  @ApiProperty({ description: 'Bookings cancelled with a refund by this request' })
  cancelledBookings: number;

  @ApiProperty({
    description: 'Bookings that could not be cancelled yet; send the request again',
  })
  stillActive: number;
}
