import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { EventService } from './event.service';
import { EventType } from './event-registry';

@UseGuards(AuthGuard)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const user = this.requireUser(req);
    const input = typeof body === 'object' && body !== null ? body : {};
    // Validation happens in the service via Zod schemas.
    const event = await this.eventService.emitEvent({
      ...input,
      orgId: user.orgId,
      actorUserId: user.id,
      actorOrgId: user.orgId,
    });
    return { eventId: event.eventId };
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: EventType,
    @Query('subjectId') subjectId?: string,
    @Query('limit') limit?: string,
  ) {
    const user = this.requireUser(req);

    const parsedLimit = limit ? Number(limit) : undefined;

    return this.eventService.findMany({
      orgId: user.orgId,
      type,
      subjectId,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
    });
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}
