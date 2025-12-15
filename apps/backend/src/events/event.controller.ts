import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EventService } from './event.service';
import { EventType } from './event-registry';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  async create(@Body() body: any) {
    // Validation happens in the service via Zod schemas.
    const event = await this.eventService.emitEvent(body);
    return { eventId: event.eventId };
  }

  @Get()
  async list(
    @Query('orgId') orgId?: string,
    @Query('type') type?: EventType,
    @Query('subjectId') subjectId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const parsedLimit = limit ? Number(limit) : undefined;

    return this.eventService.findMany({
      orgId,
      type,
      subjectId,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
    });
  }
}
