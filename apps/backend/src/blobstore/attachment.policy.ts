import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfidentialityLevel } from './types';

export type UserRole = 'Owner' | 'BD-AM' | 'Viewer';

export interface AccessContext {
  requestOrgId: string;
  resourceOrgId: string;
  role?: UserRole;
  confidentiality: ConfidentialityLevel;
  ndaAccepted?: boolean;
}

@Injectable()
export class AttachmentAccessPolicy {
  private canUploadRoles: UserRole[] = ['Owner', 'BD-AM'];
  private canDownloadRoles: UserRole[] = ['Owner', 'BD-AM', 'Viewer'];

  assertCanUpload(ctx: Omit<AccessContext, 'confidentiality' | 'ndaAccepted'>) {
    if (ctx.requestOrgId !== ctx.resourceOrgId) {
      throw new ForbiddenException('Cross-tenant upload not allowed');
    }
    if (!ctx.role || !this.canUploadRoles.includes(ctx.role)) {
      throw new ForbiddenException('Role not permitted to upload attachments');
    }
  }

  assertCanDownload(ctx: AccessContext) {
    if (ctx.requestOrgId !== ctx.resourceOrgId) {
      throw new ForbiddenException('Cross-tenant download not allowed');
    }
    if (!ctx.role || !this.canDownloadRoles.includes(ctx.role)) {
      throw new ForbiddenException('Role not permitted to download attachments');
    }
    if (ctx.confidentiality !== 'L1' && ctx.ndaAccepted !== true) {
      throw new ForbiddenException('NDA acceptance required for L2 attachments');
    }
  }
}
