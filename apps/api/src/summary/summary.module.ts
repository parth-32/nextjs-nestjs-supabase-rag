import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { RagModule } from '../rag/rag.module';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

@Module({
  imports: [DocumentsModule, RagModule],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
