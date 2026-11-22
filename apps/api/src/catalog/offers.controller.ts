import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/decorators.js';
import { CatalogService } from './catalog.service.js';
import { OffersDto } from './dto/catalog.dto.js';

@ApiTags('Профіль')
@ApiBearerAuth()
@Controller('me')
export class OffersController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('offers')
  @ApiOkResponse({
    type: OffersDto,
    description: 'Promotions and sections for the user’s interests',
  })
  offers(@CurrentUser() user: CurrentUserData): Promise<OffersDto> {
    return this.catalog.offersFor(user.id);
  }
}
