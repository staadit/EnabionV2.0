import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma.service';
import {
  EventEnvelopeInput,
  EventType,
  ValidatedEvent,
  validateEvent,
} from './event-registry';

export interface EmitEventInput extends Omit<EventEnvelopeInput, 'eventId'> {
  eventId?: string;
}

export interface EventQuery {
  orgId: string;
  type?: EventType;
  subjectId?: string;
  limit?: number;
}

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async emitEvent(input: EmitEventInput): Promise<ValidatedEvent> {
    const candidate: EventEnvelopeInput = {
      eventId: input.eventId ?? ulid(),
      recordedAt: input.recordedAt ?? new Date(),
      ...input,
    };

    const validated = validateEvent(candidate);

    await this.prisma.event.create({
      data: {
        id: validated.eventId,
        schemaVersion: validated.schemaVersion,
        type: validated.type,
        occurredAt: validated.occurredAt,
        recordedAt: validated.recordedAt,
        orgId: validated.orgId,
        actorUserId: validated.actorUserId,
        actorOrgId: validated.actorOrgId,
        subjectType: validated.subjectType,
        subjectId: validated.subjectId,
        lifecycleStep: validated.lifecycleStep,
        pipelineStage: validated.pipelineStage,
        channel: validated.channel,
        correlationId: validated.correlationId,
        payload: validated.payload as Prisma.JsonValue,
      },
    });

    return validated;
  }

  async findMany(query: EventQuery) {
    const take = query.limit && query.limit > 0 ? Math.min(query.limit, 200) : 50;
    return this.prisma.event.findMany({
      where: {
        orgId: query.orgId,
        type: query.type,
        subjectId: query.subjectId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take,
    });
  }
}
