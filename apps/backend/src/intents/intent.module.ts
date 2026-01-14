import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { NdaModule } from '../nda/nda.module';
import { PrismaService } from '../prisma.service';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { IntentController } from './intent.controller';
import { IntentRedactionController } from './intent-redaction.controller';
import { IntentV1Controller } from './intent-v1.controller';
import { IntentRedactionService } from './intent-redaction.service';
import { ShareLinkController } from './share-link.controller';
import { ShareLinkService } from './share-link.service';
import { SharePublicController } from './share-public.controller';
import { IntentService } from './intent.service';

@Module({
  imports: [AuthModule, EventModule, NdaModule, AiGatewayModule],
  controllers: [
    IntentController,
    IntentV1Controller,
    IntentRedactionController,
    ShareLinkController,
    SharePublicController,
  ],
  providers: [IntentService, IntentRedactionService, ShareLinkService, PrismaService],
  exports: [IntentRedactionService, IntentService],
})
export class IntentModule {}
