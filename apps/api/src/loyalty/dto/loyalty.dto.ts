import { ApiProperty } from '@nestjs/swagger';
import { BonusReason, LoyaltyTier } from '../../generated/prisma/enums.js';

export class BonusEntryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Positive for accruals, negative for spending' })
  amount: number;

  @ApiProperty({ enum: BonusReason, enumName: 'BonusReason' })
  reason: BonusReason;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class LoyaltyDto {
  @ApiProperty({ enum: LoyaltyTier, enumName: 'LoyaltyTier' })
  tier: LoyaltyTier;

  @ApiProperty({ example: 'Преміум' })
  label: string;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  pointsPer100Uah: number;

  @ApiProperty({ type: [String] })
  perks: string[];

  @ApiProperty()
  bonusBalance: number;

  @ApiProperty({ description: 'Activities the user has attended' })
  completedVisits: number;

  @ApiProperty({ description: 'Visits that earn the Premium card' })
  premiumVisits: number;

  @ApiProperty({ type: [BonusEntryDto], description: 'Latest bonus point movements' })
  history: BonusEntryDto[];
}
