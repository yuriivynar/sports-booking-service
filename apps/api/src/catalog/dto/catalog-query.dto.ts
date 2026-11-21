import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AgeGroup, HallKind, SkillLevel } from '../../generated/prisma/enums.js';
import { SECTION_SORTS, type SectionSort } from '../catalog-query.builder.js';

/** Query string of GET /api/sections. Every filter is optional. */
export class SectionSearchQueryDto {
  @ApiPropertyOptional({ description: 'Sport slug', example: 'yoga' })
  @IsOptional()
  @IsString()
  sport?: string;

  @ApiPropertyOptional({ enum: SkillLevel, enumName: 'SkillLevel' })
  @IsOptional()
  @IsEnum(SkillLevel)
  level?: SkillLevel;

  @ApiPropertyOptional({ enum: AgeGroup, enumName: 'AgeGroup' })
  @IsOptional()
  @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiPropertyOptional({ description: 'Center slug', example: 'sporthub-tsentr' })
  @IsOptional()
  @IsString()
  center?: string;

  @ApiPropertyOptional({ description: 'Text to find in the name or description', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @ApiPropertyOptional({ enum: SECTION_SORTS, default: 'name' })
  @IsOptional()
  @IsIn(SECTION_SORTS)
  sort?: SectionSort;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class HallQueryDto {
  @ApiPropertyOptional({ description: 'Sport slug' })
  @IsOptional()
  @IsString()
  sport?: string;

  @ApiPropertyOptional({ description: 'Center slug' })
  @IsOptional()
  @IsString()
  center?: string;

  @ApiPropertyOptional({ enum: HallKind, enumName: 'HallKind' })
  @IsOptional()
  @IsEnum(HallKind)
  kind?: HallKind;
}

export class TrainerQueryDto {
  @ApiPropertyOptional({ description: 'Sport slug' })
  @IsOptional()
  @IsString()
  sport?: string;

  @ApiPropertyOptional({ description: 'Center slug' })
  @IsOptional()
  @IsString()
  center?: string;
}
