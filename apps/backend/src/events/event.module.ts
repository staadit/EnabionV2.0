import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { EventController } from './event.controller';
import { EventService } from './event.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [EventController],
  providers: [EventService, PrismaService],
  exports: [EventService],
})
export class EventModule {}
