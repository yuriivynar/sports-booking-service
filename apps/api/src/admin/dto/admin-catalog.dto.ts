import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
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
import { TrainerRefDto } from '../../catalog/dto/catalog.dto.js';
import { SportDto } from '../../catalog/dto/sport.dto.js';
import { AgeGroup, HallKind, SkillLevel } from '../../generated/prisma/enums.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Largest price accepted, in kopecks (100 000 грн). */
const MAX_PRICE = 10_000_000;

// ---------- Input ----------

export class CreateCenterDto {
  @ApiProperty({ example: 'SportHub Сихів', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'sporthub-sykhiv', description: 'Part of the page address' })
  @Matches(SLUG, { message: 'Лише малі латинські літери, цифри й дефіси' })
  @MaxLength(60)
  slug: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'просп. Червоної Калини, 60' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  address: string;

  @ApiPropertyOptional({ example: 'Львів', description: 'Львів when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiProperty({ example: 49.7928 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 24.0611 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: '+380322000000' })
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'Некоректний номер телефону' })
  phone: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'URL from POST /admin/photos' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  photoUrl?: string | null;

  @ApiProperty({ example: 7, minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  openHour: number;

  @ApiProperty({ example: 22, minimum: 1, maximum: 24 })
  @IsInt()
  @Min(1)
  @Max(24)
  closeHour: number;

  @ApiPropertyOptional({ description: 'True when omitted' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCenterDto extends PartialType(CreateCenterDto) {}

class SportSlugsInput {
  @ApiProperty({ type: [String], example: ['yoga', 'pilates'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @Matches(SLUG, { each: true })
  sportSlugs: string[];
}

export class CreateHallDto extends SportSlugsInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  centerId: string;

  @ApiProperty({ example: 'Зала йоги', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: HallKind, enumName: 'HallKind' })
  @IsEnum(HallKind)
  kind: HallKind;

  @ApiProperty({ example: 20, minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  capacity: number;

  @ApiProperty({ description: 'Price of one hour, in kopecks', example: 50000 })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  hourlyPrice: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'URL from POST /admin/photos' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  photoUrl?: string | null;

  @ApiPropertyOptional({ description: 'True when omitted' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** A hall stays in its center; everything else may change. */
export class UpdateHallDto extends PartialType(OmitType(CreateHallDto, ['centerId'] as const)) {}

export class CreateTrainerDto extends SportSlugsInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  centerId: string;

  @ApiProperty({ example: 'Олена Коваль', maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  bio: string;

  @ApiProperty({ example: 5, minimum: 0, maximum: 60 })
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears: number;

  @ApiProperty({ description: 'Price of a one-hour personal session, in kopecks' })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  sessionPrice: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'URL from POST /admin/photos' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  photoUrl?: string | null;

  @ApiPropertyOptional({ description: 'True when omitted' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTrainerDto extends PartialType(
  OmitType(CreateTrainerDto, ['centerId'] as const),
) {}

export class CreateSectionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  centerId: string;

  @ApiProperty({ example: 'yoga' })
  @Matches(SLUG)
  sportSlug: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  trainerId?: string | null;

  @ApiProperty({ example: 'Йога для початківців', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: SkillLevel, enumName: 'SkillLevel' })
  @IsEnum(SkillLevel)
  level: SkillLevel;

  @ApiProperty({ enum: AgeGroup, enumName: 'AgeGroup' })
  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @ApiProperty({ description: 'Default places in a session', example: 12 })
  @IsInt()
  @Min(1)
  @Max(500)
  capacity: number;

  @ApiProperty({ description: 'Price of one visit, in kopecks', example: 25000 })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  sessionPrice: number;

  @ApiPropertyOptional({ description: 'True when omitted' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSectionDto extends PartialType(
  OmitType(CreateSectionDto, ['centerId'] as const),
) {}

export class CenterFilterDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  centerId?: string;
}

// ---------- Output ----------

export class AdminCenterDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  phone: string;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty()
  openHour: number;

  @ApiProperty()
  closeHour: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  hallCount: number;

  @ApiProperty()
  trainerCount: number;

  @ApiProperty()
  sectionCount: number;
}

export class AdminHallDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  centerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: HallKind, enumName: 'HallKind' })
  kind: HallKind;

  @ApiProperty()
  capacity: number;

  @ApiProperty({ description: 'In kopecks' })
  hourlyPrice: number;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [SportDto] })
  sports: SportDto[];
}

export class AdminTrainerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  centerId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  experienceYears: number;

  @ApiProperty({ description: 'In kopecks' })
  sessionPrice: number;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [SportDto] })
  sports: SportDto[];
}

export class AdminSectionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  centerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: SkillLevel, enumName: 'SkillLevel' })
  level: SkillLevel;

  @ApiProperty({ enum: AgeGroup, enumName: 'AgeGroup' })
  ageGroup: AgeGroup;

  @ApiProperty()
  capacity: number;

  @ApiProperty({ description: 'In kopecks' })
  sessionPrice: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: SportDto })
  sport: SportDto;

  @ApiProperty({ type: TrainerRefDto, nullable: true })
  trainer: TrainerRefDto | null;

  @ApiProperty({ description: 'Sessions scheduled from now on, not cancelled' })
  upcomingSessions: number;
}

export enum RemovalResult {
  DELETED = 'DELETED',
  DEACTIVATED = 'DEACTIVATED',
}

export class RemovalDto {
  @ApiProperty({
    enum: RemovalResult,
    enumName: 'RemovalResult',
    description: 'DEACTIVATED when bookings refer to the item, so it is kept and hidden',
  })
  result: RemovalResult;
}

export class PhotoDto {
  @ApiProperty({ example: 'https://…/storage/v1/object/public/media/catalog/….jpg' })
  url: string;
}
