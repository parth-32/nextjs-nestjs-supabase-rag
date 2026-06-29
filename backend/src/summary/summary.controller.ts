import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ComplianceSummaryDto } from '@ccp/shared';
import { AuthGuard, AuthUser } from '../common/auth/auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { SummaryService } from './summary.service';

@Controller('documents/:id/summary')
@UseGuards(AuthGuard)
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Post()
  generate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComplianceSummaryDto> {
    return this.summary.generate(user.id, id);
  }

  @Get()
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComplianceSummaryDto> {
    return this.summary.get(user.id, id);
  }
}
