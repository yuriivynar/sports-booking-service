import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPaymentRequiredResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/decorators.js';
import { BookingFacade } from './booking.facade.js';
import { BookingDto, BookingQuoteDto } from './dto/booking.dto.js';
import { CardPaymentDto, toCardDetails } from '../payments/dto/card-payment.dto.js';
import { CancelBookingDto, CreateBookingDto } from './dto/booking-request.dto.js';

/** Thin HTTP layer: every call goes to the BookingFacade. */
@ApiTags('Бронювання')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Немає дійсного токена Supabase' })
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingFacade) {}

  @Post('quote')
  @HttpCode(200)
  @ApiOkResponse({ type: BookingQuoteDto, description: 'Price breakdown; nothing is saved' })
  @ApiBadRequestResponse({ description: 'The request breaks a booking rule' })
  @ApiConflictResponse({ description: 'The place is taken' })
  quote(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingQuoteDto> {
    return this.bookings.quote(user.id, dto);
  }

  @Post()
  @ApiCreatedResponse({
    type: BookingDto,
    description: 'PENDING until paid, or CONFIRMED when there is nothing to pay',
  })
  @ApiBadRequestResponse({ description: 'The request breaks a booking rule' })
  @ApiConflictResponse({ description: 'The place is taken or already booked by the user' })
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateBookingDto): Promise<BookingDto> {
    return this.bookings.book(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ type: [BookingDto], description: 'The signed-in user’s bookings, newest first' })
  list(@CurrentUser() user: CurrentUserData): Promise<BookingDto[]> {
    return this.bookings.listMine(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ description: 'Бронювання не знайдено' })
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingDto> {
    return this.bookings.view(user.id, id);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @ApiOkResponse({ type: BookingDto, description: 'Paid and confirmed' })
  @ApiPaymentRequiredResponse({ description: 'The card was declined; the booking stays pending' })
  @ApiConflictResponse({ description: 'Already paid, cancelled or the hold expired' })
  pay(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CardPaymentDto,
  ): Promise<BookingDto> {
    return this.bookings.pay(user.id, id, toCardDetails(dto));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ type: BookingDto, description: 'Cancelled; money and points returned' })
  @ApiConflictResponse({ description: 'Too late to cancel or already cancelled' })
  cancel(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<BookingDto> {
    return this.bookings.cancel(user.id, id, dto.reason);
  }
}
