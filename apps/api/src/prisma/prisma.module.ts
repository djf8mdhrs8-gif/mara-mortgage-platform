import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

// Global: every feature module needs database access; registering once here
// avoids importing PrismaModule in every module file.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
