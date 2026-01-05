import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventModule } from '../events/event.module';
import { EmailService } from '../email/email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [forwardRef(() => EventModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, PrismaService, EmailService],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
