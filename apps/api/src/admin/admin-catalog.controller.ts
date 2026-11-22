import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators.js';
import { AdminCatalogService, MAX_PHOTO_BYTES } from './admin-catalog.service.js';
import {
  AdminCenterDto,
  AdminHallDto,
  AdminSectionDto,
  AdminTrainerDto,
  CenterFilterDto,
  CreateCenterDto,
  CreateHallDto,
  CreateSectionDto,
  CreateTrainerDto,
  PhotoDto,
  RemovalDto,
  UpdateCenterDto,
  UpdateHallDto,
  UpdateSectionDto,
  UpdateTrainerDto,
} from './dto/admin-catalog.dto.js';

const Id = () => new ParseUUIDPipe();

/** Catalog management. Every route here is for administrators only. */
@ApiTags('Адміністрування: каталог')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Administrators only' })
@Roles('ADMIN')
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  // ---------- Centers ----------

  @Get('centers')
  @ApiOkResponse({ type: [AdminCenterDto] })
  centers(): Promise<AdminCenterDto[]> {
    return this.catalog.listCenters();
  }

  @Get('centers/:id')
  @ApiOkResponse({ type: AdminCenterDto })
  center(@Param('id', Id()) id: string): Promise<AdminCenterDto> {
    return this.catalog.getCenter(id);
  }

  @Post('centers')
  @ApiCreatedResponse({ type: AdminCenterDto })
  createCenter(@Body() dto: CreateCenterDto): Promise<AdminCenterDto> {
    return this.catalog.createCenter(dto);
  }

  @Patch('centers/:id')
  @ApiOkResponse({ type: AdminCenterDto })
  updateCenter(
    @Param('id', Id()) id: string,
    @Body() dto: UpdateCenterDto,
  ): Promise<AdminCenterDto> {
    return this.catalog.updateCenter(id, dto);
  }

  @Delete('centers/:id')
  @ApiOkResponse({ type: RemovalDto })
  removeCenter(@Param('id', Id()) id: string): Promise<RemovalDto> {
    return this.catalog.removeCenter(id);
  }

  // ---------- Halls ----------

  @Get('halls')
  @ApiOkResponse({ type: [AdminHallDto] })
  halls(@Query() { centerId }: CenterFilterDto): Promise<AdminHallDto[]> {
    return this.catalog.listHalls(centerId);
  }

  @Post('halls')
  @ApiCreatedResponse({ type: AdminHallDto })
  createHall(@Body() dto: CreateHallDto): Promise<AdminHallDto> {
    return this.catalog.createHall(dto);
  }

  @Patch('halls/:id')
  @ApiOkResponse({ type: AdminHallDto })
  updateHall(@Param('id', Id()) id: string, @Body() dto: UpdateHallDto): Promise<AdminHallDto> {
    return this.catalog.updateHall(id, dto);
  }

  @Delete('halls/:id')
  @ApiOkResponse({ type: RemovalDto })
  removeHall(@Param('id', Id()) id: string): Promise<RemovalDto> {
    return this.catalog.removeHall(id);
  }

  // ---------- Trainers ----------

  @Get('trainers')
  @ApiOkResponse({ type: [AdminTrainerDto] })
  trainers(@Query() { centerId }: CenterFilterDto): Promise<AdminTrainerDto[]> {
    return this.catalog.listTrainers(centerId);
  }

  @Post('trainers')
  @ApiCreatedResponse({ type: AdminTrainerDto })
  createTrainer(@Body() dto: CreateTrainerDto): Promise<AdminTrainerDto> {
    return this.catalog.createTrainer(dto);
  }

  @Patch('trainers/:id')
  @ApiOkResponse({ type: AdminTrainerDto })
  updateTrainer(
    @Param('id', Id()) id: string,
    @Body() dto: UpdateTrainerDto,
  ): Promise<AdminTrainerDto> {
    return this.catalog.updateTrainer(id, dto);
  }

  @Delete('trainers/:id')
  @ApiOkResponse({ type: RemovalDto })
  removeTrainer(@Param('id', Id()) id: string): Promise<RemovalDto> {
    return this.catalog.removeTrainer(id);
  }

  // ---------- Sections ----------

  @Get('sections')
  @ApiOkResponse({ type: [AdminSectionDto] })
  sections(@Query() { centerId }: CenterFilterDto): Promise<AdminSectionDto[]> {
    return this.catalog.listSections(centerId);
  }

  @Post('sections')
  @ApiCreatedResponse({ type: AdminSectionDto })
  createSection(@Body() dto: CreateSectionDto): Promise<AdminSectionDto> {
    return this.catalog.createSection(dto);
  }

  @Patch('sections/:id')
  @ApiOkResponse({ type: AdminSectionDto })
  updateSection(
    @Param('id', Id()) id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<AdminSectionDto> {
    return this.catalog.updateSection(id, dto);
  }

  @Delete('sections/:id')
  @ApiOkResponse({ type: RemovalDto })
  removeSection(@Param('id', Id()) id: string): Promise<RemovalDto> {
    return this.catalog.removeSection(id);
  }

  // ---------- Photos ----------

  @Post('photos')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP' } },
    },
  })
  @ApiCreatedResponse({ type: PhotoDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  async uploadPhoto(@UploadedFile() file?: { buffer: Buffer }): Promise<PhotoDto> {
    if (!file) throw new BadRequestException('Додайте файл у поле file');
    return { url: await this.catalog.uploadPhoto(new Uint8Array(file.buffer)) };
  }
}
