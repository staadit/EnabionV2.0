import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';

@Module({
  imports: [AuthModule, EventModule],
  controllers: [IntentController],
  providers: [IntentService, PrismaService],
})
export class IntentModule {}
