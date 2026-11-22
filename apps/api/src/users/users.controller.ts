import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/decorators.js';
import { MAX_AVATAR_BYTES } from './avatar-image.js';
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

  @Post('avatar')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP' } },
    },
  })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiBadRequestResponse({ description: 'Not a JPEG, PNG or WebP image' })
  @ApiPayloadTooLargeResponse({ description: 'Larger than 2 MB' })
  // Multer stops reading the upload as soon as it passes the limit.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } }))
  uploadAvatar(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file?: { buffer: Buffer },
  ): Promise<UserProfileDto> {
    if (!file) throw new BadRequestException('Додайте файл у поле file');
    return this.users.setAvatar(user.id, new Uint8Array(file.buffer));
  }
}
