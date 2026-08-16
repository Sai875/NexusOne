import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { AvailabilityQueryDto, CreateEventDto, UpdateEventDto } from './dto/events.dto';
import { EventsService } from './events.service';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('mine') mine?: string,
  ) {
    return this.events.list(user.orgId, user.sub, from, to, mine === 'true');
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(dto, user);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(user.orgId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.events.remove(user.orgId, id);
    return { ok: true };
  }

  @Post(':id/rsvp')
  rsvp(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: 'accepted' | 'declined',
  ) {
    return this.events.rsvp(user.orgId, id, user.sub, status);
  }

  @Get('availability')
  availability(@CurrentUser() user: AuthUser, @Query() query: AvailabilityQueryDto) {
    return this.events.availability(user.orgId, query.userIds, query.from, query.to);
  }

}
