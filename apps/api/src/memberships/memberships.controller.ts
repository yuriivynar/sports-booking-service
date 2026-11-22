import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPaymentRequiredResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser, Public } from '../auth/decorators.js';
import { CardPaymentDto, toCardDetails } from '../payments/dto/card-payment.dto.js';
import { MembershipDto, MembershipPlanDto, PurchaseMembershipDto } from './dto/membership.dto.js';
import { MembershipsService } from './memberships.service.js';

@ApiTags('Абонементи')
@Controller()
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Public()
  @Get('membership-plans')
  @ApiOkResponse({ type: [MembershipPlanDto], description: 'Plans on sale, cheapest first' })
  plans(): Promise<MembershipPlanDto[]> {
    return this.memberships.listPlans();
  }

  @ApiBearerAuth()
  @Get('memberships')
  @ApiOkResponse({ type: [MembershipDto], description: 'The signed-in user’s memberships' })
  mine(@CurrentUser() user: CurrentUserData): Promise<MembershipDto[]> {
    return this.memberships.listMine(user.id);
  }

  @ApiBearerAuth()
  @Post('memberships')
  @ApiCreatedResponse({ type: MembershipDto, description: 'PENDING until paid' })
  @ApiNotFoundResponse({ description: 'Тариф не знайдено' })
  purchase(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: PurchaseMembershipDto,
  ): Promise<MembershipDto> {
    return this.memberships.purchase(user.id, dto.planId, { companyName: dto.companyName });
  }

  @ApiBearerAuth()
  @Post('memberships/:id/pay')
  @HttpCode(200)
  @ApiOkResponse({ type: MembershipDto, description: 'Paid and active from now' })
  @ApiPaymentRequiredResponse({ description: 'The card was declined' })
  @ApiConflictResponse({ description: 'Already paid or cancelled' })
  pay(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CardPaymentDto,
  ): Promise<MembershipDto> {
    return this.memberships.pay(user.id, id, toCardDetails(dto));
  }
}
