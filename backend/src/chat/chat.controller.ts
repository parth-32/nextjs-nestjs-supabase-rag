import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ChatMessageDto } from '@ccp/shared';
import { AuthGuard, AuthUser } from '../common/auth/auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { DocumentsService } from '../documents/documents.service';
import { ChatService } from './chat.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@Controller('documents/:id')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly documents: DocumentsService,
  ) {}

  @Get('messages')
  history(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatMessageDto[]> {
    return this.chat.getHistory(user.id, id);
  }

  /**
   * Streaming chat over Server-Sent Events. We validate readiness BEFORE
   * switching the response into SSE mode so genuine errors surface as normal
   * JSON HTTP errors.
   */
  @Post('chat')
  async ask(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AskQuestionDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.documents.ensureReady(user.id, id);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    let closed = false;
    res.on('close', () => {
      closed = true;
    });

    for await (const event of this.chat.generate(user.id, id, body.question)) {
      if (closed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'done' || event.type === 'error') break;
    }
    res.end();
  }
}
