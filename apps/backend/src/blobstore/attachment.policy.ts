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
    if (this.canDownload(ctx)) {
      return;
    }
    if (ctx.requestOrgId !== ctx.resourceOrgId && ctx.confidentiality !== 'L1') {
      throw new ForbiddenException({
        code: 'NDA_REQUIRED',
        message: 'NDA acceptance required for L2 attachments',
      });
    }
    throw new ForbiddenException('Cross-tenant download not allowed');
  }

  canDownload(ctx: AccessContext): boolean {
    if (ctx.requestOrgId === ctx.resourceOrgId) {
      return true;
    }
    if (ctx.confidentiality === 'L1') {
      return true;
    }
    return ctx.ndaAccepted === true;
  }
}
