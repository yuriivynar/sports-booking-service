import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CenterRefDto } from '../../catalog/dto/catalog.dto.js';
import { SportDto } from '../../catalog/dto/sport.dto.js';
import { MembershipKind, MembershipStatus } from '../../generated/prisma/enums.js';

export class MembershipPlanDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Місячний: 8 занять' })
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: MembershipKind, enumName: 'MembershipKind' })
  kind: MembershipKind;

  @ApiProperty({ description: 'Price in kopecks' })
  price: number;

  @ApiProperty({ type: Number, nullable: true, description: 'null: no time limit' })
  durationDays: number | null;

  @ApiProperty({ type: Number, nullable: true, description: 'null: unlimited visits' })
  visits: number | null;

  @ApiProperty({ type: SportDto, nullable: true, description: 'null: any sport' })
  sport: SportDto | null;

  @ApiProperty({ type: CenterRefDto, nullable: true, description: 'null: every center' })
  center: CenterRefDto | null;
}

export class MembershipDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: MembershipKind, enumName: 'MembershipKind' })
  kind: MembershipKind;

  @ApiProperty({ enum: MembershipStatus, enumName: 'MembershipStatus' })
  status: MembershipStatus;

  @ApiProperty({ type: MembershipPlanDto })
  plan: MembershipPlanDto;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startsAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt: Date | null;

  @ApiProperty({ type: Number, nullable: true, description: 'null: unlimited' })
  visitsLeft: number | null;

  @ApiProperty({ type: String, nullable: true })
  companyName: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class PurchaseMembershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'Required for corporate plans' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;
}
