import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';

@Module({
  imports: [AuthModule],
  controllers: [ThemeController],
  providers: [ThemeService, PrismaService],
  exports: [ThemeService],
})
export class ThemeModule {}
