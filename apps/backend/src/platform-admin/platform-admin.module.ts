import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { NdaModule } from '../nda/nda.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { ThemePalettesController } from './theme-palettes.controller';
import { ThemePalettesService } from './theme-palettes.service';

@Module({
  imports: [AuthModule, EventModule, NdaModule],
  controllers: [PlatformAdminController, ThemePalettesController],
  providers: [PlatformAdminService, ThemePalettesService, PrismaService],
})
export class PlatformAdminModule {}
