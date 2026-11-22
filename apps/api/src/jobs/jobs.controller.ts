import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public, Roles } from '../auth/decorators.js';
import { CronSecretGuard } from './cron-secret.guard.js';
import { JobRunDto } from './dto/job-run.dto.js';
import { JobsService } from './jobs.service.js';

@ApiTags('Регламентні завдання')
@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  /** Called by Supabase Cron every 15 minutes with the shared secret, not a user token. */
  @Public()
  @UseGuards(CronSecretGuard)
  @Post('jobs/reminders')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOkResponse({ type: JobRunDto })
  @ApiUnauthorizedResponse({ description: 'Wrong or missing CRON_SECRET' })
  scheduled(): Promise<JobRunDto> {
    return this.jobs.runMaintenance();
  }

  /** The admin's "run now" button. */
  @Roles('ADMIN')
  @Post('admin/jobs/run')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOkResponse({ type: JobRunDto })
  @ApiForbiddenResponse({ description: 'Administrators only' })
  runNow(): Promise<JobRunDto> {
    return this.jobs.runMaintenance();
  }
}
