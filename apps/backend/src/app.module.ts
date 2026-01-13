import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlobModule } from './blobstore/blob.module';
import { EventModule } from './events/event.module';
import { AuthModule } from './auth/auth.module';
import { IntentModule } from './intents/intent.module';
import { OrgModule } from './org/org.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { NdaModule } from './nda/nda.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    EventModule,
    BlobModule,
    AuthModule,
    IntentModule,
    OrgModule,
    PlatformAdminModule,
    NdaModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
