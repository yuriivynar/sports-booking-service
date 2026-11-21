import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyTier, Role, SkillLevel } from '../../generated/prisma/enums.js';
import { SportDto } from '../../catalog/dto/sport.dto.js';

export class UserProfileDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'olena@example.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true })
  fullName: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;

  @ApiProperty({ enum: LoyaltyTier, enumName: 'LoyaltyTier' })
  loyaltyTier: LoyaltyTier;

  @ApiProperty({ description: 'Bonus points; one point equals one hryvnia' })
  bonusBalance: number;

  @ApiProperty({ type: String, nullable: true })
  companyName: string | null;

  @ApiProperty({ enum: SkillLevel, enumName: 'SkillLevel', nullable: true })
  preferredLevel: SkillLevel | null;

  @ApiProperty()
  emailNotifications: boolean;

  @ApiProperty({ type: [SportDto] })
  preferredSports: SportDto[];

  @ApiProperty()
  createdAt: Date;
}
