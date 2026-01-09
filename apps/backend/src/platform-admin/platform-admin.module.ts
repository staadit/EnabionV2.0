import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { NdaModule } from '../nda/nda.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [AuthModule, EventModule, NdaModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PrismaService],
})
export class PlatformAdminModule {}
