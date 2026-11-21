import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** Makes PrismaService injectable in every module without re-importing. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
