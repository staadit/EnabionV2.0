import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { TrustScoreController } from './trustscore.controller';
import { TrustScoreService } from './trustscore.service';

@Module({
  imports: [AuthModule],
  controllers: [TrustScoreController],
  providers: [TrustScoreService, PrismaService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
