import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { NdaModule } from '../nda/nda.module';
import { PrismaService } from '../prisma.service';
import { IntentController } from './intent.controller';
import { IntentRedactionController } from './intent-redaction.controller';
import { IntentRedactionService } from './intent-redaction.service';
import { IntentService } from './intent.service';

@Module({
  imports: [AuthModule, EventModule, NdaModule],
  controllers: [IntentController, IntentRedactionController],
  providers: [IntentService, IntentRedactionService, PrismaService],
})
export class IntentModule {}
