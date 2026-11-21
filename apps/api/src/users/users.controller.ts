import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/decorators.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Профіль')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Немає дійсного токена Supabase' })
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserProfileDto })
  getProfile(@CurrentUser() user: CurrentUserData): Promise<UserProfileDto> {
    return this.users.getProfile(user.id);
  }

  @Patch()
  @ApiOkResponse({ type: UserProfileDto })
  updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.users.updateProfile(user.id, dto);
  }
}
