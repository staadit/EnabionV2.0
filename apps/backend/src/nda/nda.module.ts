import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { NdaController } from './nda.controller';
import { NdaService } from './nda.service';

@Module({
  imports: [EventModule, forwardRef(() => AuthModule)],
  controllers: [NdaController],
  providers: [NdaService, PrismaService],
  exports: [NdaService],
})
export class NdaModule {}
