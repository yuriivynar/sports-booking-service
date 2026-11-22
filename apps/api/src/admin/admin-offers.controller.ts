import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators.js';
import { AdminOffersService } from './admin-offers.service.js';
import { RemovalDto } from './dto/admin-catalog.dto.js';
import {
  AdminPlanDto,
  AdminPromotionDto,
  CreatePlanDto,
  CreatePromotionDto,
  UpdatePlanDto,
  UpdatePromotionDto,
} from './dto/admin-offers.dto.js';

const Id = () => new ParseUUIDPipe();

@ApiTags('Адміністрування: акції й тарифи')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Administrators only' })
@Roles('ADMIN')
@Controller('admin')
export class AdminOffersController {
  constructor(private readonly offers: AdminOffersService) {}

  @Get('promotions')
  @ApiOkResponse({ type: [AdminPromotionDto] })
  promotions(): Promise<AdminPromotionDto[]> {
    return this.offers.listPromotions();
  }

  /** An active promotion is announced to the fans of its sport. */
  @Post('promotions')
  @ApiCreatedResponse({ type: AdminPromotionDto })
  createPromotion(@Body() dto: CreatePromotionDto): Promise<AdminPromotionDto> {
    return this.offers.createPromotion(dto);
  }

  @Patch('promotions/:id')
  @ApiOkResponse({ type: AdminPromotionDto })
  updatePromotion(
    @Param('id', Id()) id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<AdminPromotionDto> {
    return this.offers.updatePromotion(id, dto);
  }

  @Delete('promotions/:id')
  @ApiOkResponse({ type: RemovalDto })
  removePromotion(@Param('id', Id()) id: string): Promise<RemovalDto> {
    return this.offers.removePromotion(id);
  }

  @Get('plans')
  @ApiOkResponse({ type: [AdminPlanDto] })
  plans(): Promise<AdminPlanDto[]> {
    return this.offers.listPlans();
  }

  @Post('plans')
  @ApiCreatedResponse({ type: AdminPlanDto })
  createPlan(@Body() dto: CreatePlanDto): Promise<AdminPlanDto> {
    return this.offers.createPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOkResponse({ type: AdminPlanDto })
  updatePlan(@Param('id', Id()) id: string, @Body() dto: UpdatePlanDto): Promise<AdminPlanDto> {
    return this.offers.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOkResponse({ type: RemovalDto })
  removePlan(@Param('id', Id()) id: string): Promise<RemovalDto> {
    return this.offers.removePlan(id);
  }
}
