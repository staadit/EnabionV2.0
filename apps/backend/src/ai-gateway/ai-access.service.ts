import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NdaService } from '../nda/nda.service';

export type AiAccessDecision = {
  allowL2: boolean;
  reason?: string;
};

@Injectable()
export class AiAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ndaService: NdaService,
  ) {}

  async resolveAiDataAccess(input: {
    orgId: string;
    intentId: string;
    actorUserId?: string | null;
    intent?: { id: string; orgId: string; aiAllowL2: boolean };
  }): Promise<AiAccessDecision> {
    const intent =
      input.intent ??
      (await this.prisma.intent.findFirst({
        where: { id: input.intentId, orgId: input.orgId },
        select: { id: true, orgId: true, aiAllowL2: true },
      }));
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    if (!intent.aiAllowL2) {
      return { allowL2: false, reason: 'TOGGLE_DISABLED' };
    }

    const ndaAccepted = await this.ndaService.hasAccepted({ orgId: intent.orgId });
    if (!ndaAccepted) {
      return { allowL2: false, reason: 'NDA_NOT_ACCEPTED' };
    }

    return { allowL2: true };
  }

  async ensureToggleAllowed(input: { orgId: string }) {
    const ndaAccepted = await this.ndaService.hasAccepted({ orgId: input.orgId });
    if (!ndaAccepted) {
      throw new ForbiddenException('NDA_REQUIRED_FOR_L2_AI');
    }
  }
}
