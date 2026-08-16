import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CopilotService } from './copilot.service';
import { AskDto, DraftDto, GenerateTasksDto, SummarizeDto } from './dto/copilot.dto';

@ApiTags('copilot')
@ApiBearerAuth()
@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    return this.copilot.summarize(dto);
  }

  @Post('tasks')
  generateTasks(@Body() dto: GenerateTasksDto) {
    return this.copilot.generateTasks(dto);
  }

  @Post('draft')
  draft(@Body() dto: DraftDto) {
    return this.copilot.draft(dto);
  }

  @Post('ask')
  ask(@Body() dto: AskDto) {
    return this.copilot.ask(dto);
  }

}
