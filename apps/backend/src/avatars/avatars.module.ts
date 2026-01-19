import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../events/event.module';
import { NdaModule } from '../nda/nda.module';
import { PrismaService } from '../prisma.service';
import { AvatarSuggestionController } from './avatar-suggestion.controller';
import { AvatarSuggestionService } from './avatar-suggestion.service';
import { OrgAvatarController } from './org-avatar.controller';
import { OrgAvatarProfileController } from './org-avatar-profile.controller';
import { OrgAvatarService } from './org-avatar.service';
import { SystemAvatarController } from './system-avatar.controller';
import { SystemAvatarService } from './system-avatar.service';

@Module({
  imports: [AuthModule, EventModule, NdaModule],
  controllers: [
    SystemAvatarController,
    OrgAvatarController,
    OrgAvatarProfileController,
    AvatarSuggestionController,
  ],
  providers: [
    PrismaService,
    SystemAvatarService,
    OrgAvatarService,
    AvatarSuggestionService,
  ],
  exports: [SystemAvatarService, OrgAvatarService, AvatarSuggestionService],
})
export class AvatarsModule {}
