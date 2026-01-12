import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntentModule } from '../intents/intent.module';
import { NdaModule } from '../nda/nda.module';
import { OrgModule } from '../org/org.module';
import { PrismaService } from '../prisma.service';
import { IntentExportController } from './intent-export.controller';
import { IntentExportService } from './intent-export.service';

@Module({
  imports: [AuthModule, IntentModule, OrgModule, NdaModule],
  controllers: [IntentExportController],
  providers: [IntentExportService, PrismaService],
})
export class ExportModule {}
