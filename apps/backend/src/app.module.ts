import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlobModule } from './blobstore/blob.module';
import { EventModule } from './events/event.module';
import { AuthModule } from './auth/auth.module';
import { OrgModule } from './org/org.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
  imports: [EventModule, BlobModule, AuthModule, OrgModule, PlatformAdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
