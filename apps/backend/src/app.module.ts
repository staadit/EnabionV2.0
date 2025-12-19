import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlobModule } from './blobstore/blob.module';
import { EventModule } from './events/event.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [EventModule, BlobModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
