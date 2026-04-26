import { Module } from '@nestjs/common';
import { CollectionNotesService } from './collection-notes.service';
import { CollectionNotesController } from './collection-notes.controller';

@Module({
  controllers: [CollectionNotesController],
  providers: [CollectionNotesService],
  exports: [CollectionNotesService],
})
export class CollectionNotesModule {}
