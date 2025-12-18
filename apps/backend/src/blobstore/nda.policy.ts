import { Injectable } from '@nestjs/common';
import { ConfidentialityLevel } from './types';

export interface NdaAccessRequest {
  orgId: string;
  userId?: string;
  intentId?: string;
  confidentiality: ConfidentialityLevel;
  assumedAccepted?: boolean;
}

@Injectable()
export class NdaPolicy {
  async canAccess(input: NdaAccessRequest): Promise<boolean> {
    if (input.confidentiality === 'L1') {
      return true;
    }
    // For L2+ we currently allow only when explicitly marked accepted (future: real NDA records).
    return input.assumedAccepted === true;
  }
}
