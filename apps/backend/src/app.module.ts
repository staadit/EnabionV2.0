import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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
import { ThemeModule } from './theme/theme.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { AvatarsModule } from './avatars/avatars.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.LOG_PRETTY === 'true'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
      },
    }),
    EventModule,
    BlobModule,
    AuthModule,
    IntentModule,
    OrgModule,
    PlatformAdminModule,
    NdaModule,
    ExportModule,
    ThemeModule,
    AiGatewayModule,
    AvatarsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
