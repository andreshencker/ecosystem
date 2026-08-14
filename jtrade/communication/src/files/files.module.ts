import { Module } from '@nestjs/common';

import { FilesController } from './files.controller';
import { GeneratorModule } from './generator/generator.module';
import { ReportModule } from './reports/report.module';
import { MediaModule } from './media/media.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    GeneratorModule,
    ReportModule,
    MediaModule,
    StorageModule, // 🔥 aquí lo conectas
  ],
  controllers: [FilesController],
})
export class FilesModule {}
