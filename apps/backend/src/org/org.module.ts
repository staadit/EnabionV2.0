import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { TrustScoreModule } from '../trustscore/trustscore.module';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [AuthModule, EventModule, TrustScoreModule],
  controllers: [OrgController],
  providers: [OrgService, PrismaService],
})
export class OrgModule {}
