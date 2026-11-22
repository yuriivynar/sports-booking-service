import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/decorators.js';
import { LoyaltyDto } from './dto/loyalty.dto.js';
import { LoyaltyService } from './loyalty.service.js';

@ApiTags('Профіль')
@ApiBearerAuth()
@Controller('me')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('loyalty')
  @ApiOkResponse({ type: LoyaltyDto, description: 'Card, perks, progress and points history' })
  summary(@CurrentUser() user: CurrentUserData): Promise<LoyaltyDto> {
    return this.loyalty.summary(user.id);
  }
}
