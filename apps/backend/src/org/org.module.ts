import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [AuthModule, EventModule],
  controllers: [OrgController],
  providers: [OrgService, PrismaService],
})
export class OrgModule {}
