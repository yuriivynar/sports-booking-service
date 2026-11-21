import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgeGroup, HallKind, SkillLevel } from '../../generated/prisma/enums.js';
import { SportDto } from './sport.dto.js';

/** Short reference to a center inside other catalog items. */
export class CenterRefDto {
  @ApiProperty({ example: 'sporthub-tsentr' })
  slug: string;

  @ApiProperty({ example: 'SportHub Центр' })
  name: string;

  @ApiProperty({ example: 'просп. Свободи, 22' })
  address: string;
}

export class TrainerRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Олена Коваль' })
  fullName: string;
}

export class HallRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Зала йоги' })
  name: string;
}

export class SessionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty()
  capacity: number;

  @ApiProperty({ description: 'Free places left' })
  seatsLeft: number;

  @ApiProperty({ type: HallRefDto })
  hall: HallRefDto;
}

export class HallDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: HallKind, enumName: 'HallKind' })
  kind: HallKind;

  @ApiProperty()
  capacity: number;

  @ApiProperty({ description: 'Price of one hour, in kopecks', example: 50000 })
  hourlyPrice: number;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty({ type: [SportDto] })
  sports: SportDto[];

  @ApiProperty({ type: CenterRefDto })
  center: CenterRefDto;
}

export class TrainerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  bio: string;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty()
  experienceYears: number;

  @ApiProperty({ description: 'Price of a one-hour personal session, in kopecks' })
  sessionPrice: number;

  @ApiProperty({ type: [SportDto] })
  sports: SportDto[];

  @ApiProperty({ type: CenterRefDto })
  center: CenterRefDto;
}

export class SectionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Йога для початківців' })
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: SkillLevel, enumName: 'SkillLevel' })
  level: SkillLevel;

  @ApiProperty({ enum: AgeGroup, enumName: 'AgeGroup' })
  ageGroup: AgeGroup;

  @ApiProperty()
  capacity: number;

  @ApiProperty({ description: 'Price of one visit, in kopecks', example: 25000 })
  sessionPrice: number;

  @ApiProperty({ type: SportDto })
  sport: SportDto;

  @ApiProperty({ type: CenterRefDto })
  center: CenterRefDto;

  @ApiProperty({ type: TrainerRefDto, nullable: true })
  trainer: TrainerRefDto | null;

  @ApiProperty({ type: SessionDto, nullable: true, description: 'Nearest upcoming session' })
  nextSession: SessionDto | null;
}

export class SectionDetailDto extends SectionSummaryDto {
  @ApiProperty({ type: [SessionDto], description: 'Upcoming sessions for the next 14 days' })
  sessions: SessionDto[];
}

export class SectionPageDto {
  @ApiProperty({ type: [SectionSummaryDto] })
  items: SectionSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class CenterSummaryDto extends CenterRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Львів' })
  city: string;

  @ApiProperty({ example: 49.8429 })
  latitude: number;

  @ApiProperty({ example: 24.0269 })
  longitude: number;

  @ApiProperty()
  phone: string;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty({ example: 7 })
  openHour: number;

  @ApiProperty({ example: 22 })
  closeHour: number;

  @ApiProperty({ type: [SportDto], description: 'Sports available in the halls of the center' })
  sports: SportDto[];

  @ApiProperty()
  hallCount: number;

  @ApiProperty()
  sectionCount: number;
}

export class CenterDetailDto extends CenterSummaryDto {
  @ApiProperty()
  description: string;

  @ApiProperty({ type: [HallDto] })
  halls: HallDto[];

  @ApiProperty({ type: [TrainerDto] })
  trainers: TrainerDto[];

  @ApiProperty({ type: [SectionSummaryDto] })
  sections: SectionSummaryDto[];
}

export class PromotionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: 20 })
  discountPercent: number;

  @ApiPropertyOptional({ type: SportDto, nullable: true })
  sport: SportDto | null;

  @ApiPropertyOptional({ type: CenterRefDto, nullable: true })
  center: CenterRefDto | null;

  @ApiProperty()
  endsAt: Date;
}
