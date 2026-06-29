import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { RagModule } from '../rag/rag.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [DocumentsModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
