import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgController],
  providers: [OrgService, PrismaService],
})
export class OrgModule {}
