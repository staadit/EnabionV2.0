import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfidentialityLevel } from './types';

export interface AccessContext {
  requestOrgId: string;
  resourceOrgId: string;
  confidentiality: ConfidentialityLevel;
  ndaAccepted?: boolean;
}

@Injectable()
export class AttachmentAccessPolicy {
  assertCanUpload(ctx: { requestOrgId: string; resourceOrgId: string }) {
    if (ctx.requestOrgId !== ctx.resourceOrgId) {
      throw new ForbiddenException('Cross-tenant upload not allowed');
    }
  }

  assertCanDownload(ctx: AccessContext) {
    if (ctx.requestOrgId !== ctx.resourceOrgId) {
      throw new ForbiddenException('Cross-tenant download not allowed');
    }
    if (ctx.confidentiality !== 'L1' && ctx.ndaAccepted !== true) {
      throw new ForbiddenException('NDA acceptance required for L2 attachments');
    }
  }
}
