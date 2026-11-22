import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { SportDto } from '../../catalog/dto/sport.dto.js';
import { MembershipKind } from '../../generated/prisma/enums.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreatePromotionDto {
  @ApiProperty({ example: 'Тиждень йоги', maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 20, minimum: 1, maximum: 90 })
  @IsInt()
  @Min(1)
  @Max(90)
  discountPercent: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'null: any sport' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(SLUG)
  sportSlug?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null: the whole network',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  centerId?: string | null;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @ApiPropertyOptional({ description: 'True when omitted' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}

export class CreatePlanDto {
  @ApiProperty({ example: 'Місячний: 8 занять', maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ enum: MembershipKind, enumName: 'MembershipKind' })
  @IsEnum(MembershipKind)
  kind: MembershipKind;

  @ApiProperty({ description: 'Price in kopecks', example: 120000 })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  price: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Required for MONTHLY and CORPORATE; null: no time limit',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(366)
  durationDays?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'null: unlimited visits' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(365)
  visits?: number | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  centerId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(SLUG)
  sportSlug?: string | null;

  @ApiPropertyOptional({ description: 'True when omitted' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}

class CenterIdNameDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

export class AdminPromotionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty({ type: SportDto, nullable: true })
  sport: SportDto | null;

  @ApiProperty({ type: CenterIdNameDto, nullable: true })
  center: CenterIdNameDto | null;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty()
  isActive: boolean;
}

export class AdminPlanDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: MembershipKind, enumName: 'MembershipKind' })
  kind: MembershipKind;

  @ApiProperty({ description: 'In kopecks' })
  price: number;

  @ApiProperty({ type: Number, nullable: true })
  durationDays: number | null;

  @ApiProperty({ type: Number, nullable: true })
  visits: number | null;

  @ApiProperty({ type: SportDto, nullable: true })
  sport: SportDto | null;

  @ApiProperty({ type: CenterIdNameDto, nullable: true })
  center: CenterIdNameDto | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: 'Memberships sold on this plan, any status' })
  soldCount: number;
}
