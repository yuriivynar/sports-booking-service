import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SkillLevel } from '../../generated/prisma/enums.js';

/** Fields a user can change in their profile. Omitted fields stay as they are. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Олена Коваль', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '+380671234567', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'Некоректний номер телефону' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'ТОВ «Приклад»', nullable: true, maxLength: 120 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  companyName?: string | null;

  @ApiPropertyOptional({ enum: SkillLevel, enumName: 'SkillLevel', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(SkillLevel)
  preferredLevel?: SkillLevel | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Slugs of favourite sports; replaces the current list',
    example: ['yoga', 'swimming'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  preferredSports?: string[];
}
