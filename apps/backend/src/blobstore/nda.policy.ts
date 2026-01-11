import { Injectable } from '@nestjs/common';
import { ConfidentialityLevel } from './types';
import { NdaService } from '../nda/nda.service';

export interface NdaAccessRequest {
  requestOrgId: string;
  resourceOrgId: string;
  userId?: string;
  intentId?: string;
  confidentiality: ConfidentialityLevel;
}

@Injectable()
export class NdaPolicy {
  constructor(private readonly ndaService: NdaService) {}

  async canAccess(input: NdaAccessRequest): Promise<boolean> {
    if (input.confidentiality === 'L1') {
      return true;
    }
    if (input.requestOrgId === input.resourceOrgId) {
      return true;
    }
    return this.ndaService.hasMutualAcceptance({
      ownerOrgId: input.resourceOrgId,
      viewerOrgId: input.requestOrgId,
    });
  }
}
